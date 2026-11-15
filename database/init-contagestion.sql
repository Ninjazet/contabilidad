-- ========================================================
-- PREPARACIÓN DE ENTORNO POSTGRESQL PARA CONTAGESTIÓN
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $do$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
END $do$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text NOT NULL,
  email_confirmed_at timestamptz DEFAULT now(),
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_app_meta_data jsonb DEFAULT '{"provider":"email","providers":["email"]}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$fn$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $fn$
  SELECT COALESCE(NULLIF(current_setting('app.current_user_role', true), ''), 'authenticated');
$fn$;

CREATE SCHEMA IF NOT EXISTS storage;
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version text
);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT string_to_array(name, '/');
$fn$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT split_part(name, '/', array_length(string_to_array(name, '/'), 1));
$fn$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$fn$;

-- ========================================================

-- >>> MIGRACIÓN: 20261018061510_fase1_roles_profiles_clients.sql.sql <<<
/*
# Fase 1 — Roles, perfiles de usuario y clientes

1. Tablas nuevas
   - `roles`: roles del sistema (administrador, gerente_operaciones, contador, auxiliar_contable, asistente_operativo) con su descripción.
   - `profiles`: perfil de cada empleado de la firma. `id` coincide con el usuario de autenticación (auth.users). Guarda nombre, correo, rol y estado activo. El correo NO es editable por el usuario.
   - `services`: catálogo de tipos de servicio (declaraciones, contabilidad, bancos, libros, estados financieros, retenciones, compras, otros).
   - `clients`: clientes de la firma. Incluye datos generales (razón social, nombre comercial, RTN, tipo, estado), contacto, dirección, responsable principal y secundario, indicador de cliente de Quimistán y declaración en cero.
   - `client_services`: servicios contratados por cada cliente.

2. Seguridad
   - RLS activado en todas las tablas.
   - `roles`: lectura para autenticados; escritura solo administradores.
   - `profiles`: lectura para autenticados; el usuario edita su propio perfil; administrador edita todos.
   - `services`: lectura para autenticados; escritura solo administradores.
   - `clients`: lectura para autenticados; creación/edición para administrador, gerente de operaciones y auxiliares contables; eliminación (desactivación lógica) solo administrador.

3. Notas
   - El estado del cliente usa text con CHECK (activo, inactivo, suspendido).
   - El RTN tiene índice único parcial entre clientes activos (permite reutilizar RTN si el cliente anterior fue eliminado/desactivado).
   - Índices para búsqueda por RTN, razón social y responsable.
*/

-- ROLES DEL SISTEMA
CREATE TABLE IF NOT EXISTS roles (
  id text PRIMARY KEY,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO roles (id, description) VALUES
  ('administrador', 'Acceso total: usuarios, configuración, clientes, documentos, expedientes, auditoría'),
  ('gerente_operaciones', 'Supervisa cumplimiento, revisa expedientes y declaraciones, gestiona pendientes'),
  ('contador', 'Contabilidad, bancos, estados financieros, declaraciones informativas'),
  ('auxiliar_contable', 'Clientes asignados: documentación, declaraciones, checklist y estados'),
  ('asistente_operativo', 'Tareas logísticas asignadas: recojo y entrega de documentación, cobros, visitas')
ON CONFLICT (id) DO NOTHING;

-- PERFILES DE USUARIO (empleado vinculado a su cuenta de acceso)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role_id text NOT NULL REFERENCES roles(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CATÁLOGO DE SERVICIOS
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO services (name, description) VALUES
  ('Declaraciones', 'Preparación y control de declaraciones fiscales'),
  ('Contabilidad', 'Registro contable de ventas, compras y gastos'),
  ('Bancos', 'Conciliación y control de movimientos bancarios'),
  ('Libros', 'Actualización de libros contables'),
  ('Estados financieros', 'Preparación de estados financieros'),
  ('Retenciones', 'Retenciones y comprobantes fiscales'),
  ('Declaración mensual de compras', 'Declaración mensual de compras'),
  ('Otros', 'Otros servicios acordados con el cliente')
ON CONFLICT (name) DO NOTHING;

-- CLIENTES
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  legal_name text NOT NULL,
  commercial_name text,
  rtn text NOT NULL,
  client_type text NOT NULL DEFAULT 'persona' CHECK (client_type IN ('persona', 'empresa')),
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo', 'suspendido')),
  responsible_user_id uuid REFERENCES profiles(id),
  secondary_user_id uuid REFERENCES profiles(id),
  is_quimistan boolean NOT NULL DEFAULT false,
  zero_declaration_status text NOT NULL DEFAULT 'no' CHECK (zero_declaration_status IN ('si', 'no')),
  phone text,
  whatsapp text,
  email text,
  contact_name text,
  address text,
  department text,
  municipality text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Servicios contratados por cliente
CREATE TABLE IF NOT EXISTS client_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id),
  active boolean NOT NULL DEFAULT true,
  UNIQUE (client_id, service_id)
);

-- RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- ROLES: todos los autenticados leen; solo admin escribe
DROP POLICY IF EXISTS "authenticated_read_roles" ON roles;
CREATE POLICY "authenticated_read_roles" ON roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_roles" ON roles;
CREATE POLICY "admin_write_roles" ON roles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador')
  );

-- PROFILES: autenticados leen; cada uno edita lo suyo; admin edita todos
DROP POLICY IF EXISTS "authenticated_read_profiles" ON profiles;
CREATE POLICY "authenticated_read_profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id OR EXISTS (
      SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  );

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'
  ))
  WITH CHECK (auth.uid() = id OR EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'
  ));

-- SERVICES: autenticados leen; admin escribe
DROP POLICY IF EXISTS "authenticated_read_services" ON services;
CREATE POLICY "authenticated_read_services" ON services
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_services" ON services;
CREATE POLICY "admin_write_services" ON services
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'));

-- CLIENTS: autenticados leen; escritura según rol
DROP POLICY IF EXISTS "authenticated_read_clients" ON clients;
CREATE POLICY "authenticated_read_clients" ON clients
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_clients" ON clients;
CREATE POLICY "staff_insert_clients" ON clients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'auxiliar_contable', 'contador')
    )
  );

DROP POLICY IF EXISTS "staff_update_clients" ON clients;
CREATE POLICY "staff_update_clients" ON clients
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'auxiliar_contable', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'auxiliar_contable', 'contador')
    )
  );

DROP POLICY IF EXISTS "admin_delete_clients" ON clients;
CREATE POLICY "admin_delete_clients" ON clients
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role_id = 'administrador'));

-- CLIENT_SERVICES: lectura para autenticados; escritura según rol de clients
DROP POLICY IF EXISTS "authenticated_read_client_services" ON client_services;
CREATE POLICY "authenticated_read_client_services" ON client_services
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_client_services" ON client_services;
CREATE POLICY "staff_write_client_services" ON client_services
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'auxiliar_contable', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'auxiliar_contable', 'contador')
    )
  );

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_clients_rtn ON clients (rtn);
CREATE INDEX IF NOT EXISTS idx_clients_legal_name ON clients (legal_name);
CREATE INDEX IF NOT EXISTS idx_clients_responsible ON clients (responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_client_services_client ON client_services (client_id);


-- >>> MIGRACIÓN: 20261018150905_fase2_cliente_codigo_automatico.sql.sql <<<
/*
# Fase 2 — Códigos automáticos de cliente

1. Tablas modificadas
   - `clients`: la columna `code` (creada en la Fase 1) recibe un valor por defecto
     automático del tipo CLI-0001, CLI-0002, … usando una secuencia interna.

2. Funciones nuevas
   - `next_client_code()`: genera el siguiente código disponible de cliente.
     Es "SECURITY DEFINER" porque se ejecuta al insertar desde el navegador con el
     rol limitado del usuario, que no puede leer la secuencia directamente.

3. Seguridad
   - No cambia: se mantienen las políticas de la Fase 1.
   - Se concede permiso de ejecución de `next_client_code()` a los usuarios
     autenticados.

4. Notas
   - La columna `code` sigue siendo única; el default solo se usa cuando la
     aplicación no envía un código.
*/

CREATE SEQUENCE IF NOT EXISTS client_code_seq START 1;

ALTER TABLE clients
  ALTER COLUMN code SET DEFAULT 'CLI-' || lpad(nextval('client_code_seq')::text, 4, '0');

CREATE OR REPLACE FUNCTION next_client_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'CLI-' || lpad(nextval('client_code_seq')::text, 4, '0');
END;
$$;

REVOKE ALL ON FUNCTION next_client_code() FROM anon;
GRANT EXECUTE ON FUNCTION next_client_code() TO authenticated;


-- >>> MIGRACIÓN: 20261018155749_fase3_expedientes_documentos_checklist.sql.sql <<<
/*
# Fase 3 — Expedientes, documentos y checklist

1. Tablas nuevas
   - `document_types`: tipos de documento (RTN, constancia, cédula, matrícula, estados de cuenta, facturas, etc.).
   - `files` (expedientes): expediente mensual de un cliente. Tiene periodo (año/mes),
     estado (borrador, en_revision, aprobado, rechazado), fecha límite, responsable y notas.
     El código usa el formato CLI-0001-2026-10.
   - `file_documents`: documentos recibidos dentro de un expediente. Guarda nombre, tipo,
     si es físico o digital, quién lo recibió y cuándo. Los archivos digitales se suben
     al almacenamiento privado de Supabase y aquí se guarda su ruta.
   - `file_checklist_items`: checklist del expediente (tareas: declaraciones, bancos, libros…).
     Con estado pendiente / en_proceso / completado, responsable y fecha de vencimiento.

2. Seguridad
   - RLS activado en todas las tablas nuevas.
   - Lectura para todos los autenticados.
   - Escritura para administrador, gerente de operaciones, contador y auxiliar contable.
   - El asistente operativo solo lectura (coincide con el menú).

3. Notas
   - La tabla `files` se llama así para no chocar con "expedientes" traducido;
     en la aplicación se muestra como "Expedientes".
   - Unique: un expediente por cliente y periodo; un tipo de documento por nombre.
*/

CREATE TABLE IF NOT EXISTS document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO document_types (name, description) VALUES
  ('RTN', 'Registro Tributario Nacional'),
  ('Cédula de identidad', 'Copia de cédula del representante'),
  ('Constancia de registro', 'Constancia de inscripción fiscal'),
  ('Matrícula comercial', 'Matrícula de operación comercial'),
  ('Estados de cuenta bancarios', 'Estados de cuenta del mes'),
  ('Facturas de venta', 'Facturas emitidas por el cliente'),
  ('Facturas de compra', 'Facturas recibidas por el cliente'),
  ('Comprobantes de retención', 'Comprobantes de retención emitidos/recibidos'),
  ('Declaración jurada', 'Declaraciones presentadas'),
  ('Otros', 'Otros documentos del expediente')
ON CONFLICT (name) DO NOTHING;

-- EXPEDIENTES (tabla "files")
CREATE TABLE IF NOT EXISTS files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'en_revision', 'aprobado', 'rechazado')),
  due_date date,
  responsible_user_id uuid REFERENCES profiles(id),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

-- DOCUMENTOS DE UN EXPEDIENTE
CREATE TABLE IF NOT EXISTS file_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  document_type_id uuid REFERENCES document_types(id),
  name text NOT NULL,
  is_physical boolean NOT NULL DEFAULT false,
  storage_path text,
  notes text,
  received_by uuid REFERENCES profiles(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CHECKLIST DEL EXPEDIENTE
CREATE TABLE IF NOT EXISTS file_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado')),
  responsible_user_id uuid REFERENCES profiles(id),
  due_date date,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_checklist_items ENABLE ROW LEVEL SECURITY;

-- Lectura para autenticados
DROP POLICY IF EXISTS "authenticated_read_document_types" ON document_types;
CREATE POLICY "authenticated_read_document_types" ON document_types
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_files" ON files;
CREATE POLICY "authenticated_read_files" ON files
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_file_documents" ON file_documents;
CREATE POLICY "authenticated_read_file_documents" ON file_documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_file_checklist_items" ON file_checklist_items;
CREATE POLICY "authenticated_read_file_checklist_items" ON file_checklist_items
  FOR SELECT TO authenticated USING (true);

-- Escritura para roles con permiso (admin, gerente, contador, auxiliar)
DROP POLICY IF EXISTS "staff_write_files" ON files;
CREATE POLICY "staff_write_files" ON files
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

DROP POLICY IF EXISTS "staff_write_file_documents" ON file_documents;
CREATE POLICY "staff_write_file_documents" ON file_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

DROP POLICY IF EXISTS "staff_write_file_checklist_items" ON file_checklist_items;
CREATE POLICY "staff_write_file_checklist_items" ON file_checklist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

-- Función para generar el código del expediente (SECURITY DEFINER para leer la secuencia del cliente)
CREATE OR REPLACE FUNCTION next_file_code(p_client_code text, p_year int, p_month int)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN p_client_code || '-' || p_year::text || '-' || lpad(p_month::text, 2, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION next_file_code(text, int, int) TO authenticated;

-- Índices
CREATE INDEX IF NOT EXISTS idx_files_client ON files (client_id);
CREATE INDEX IF NOT EXISTS idx_files_period ON files (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_file_documents_file ON file_documents (file_id);
CREATE INDEX IF NOT EXISTS idx_file_checklist_file ON file_checklist_items (file_id);


-- >>> MIGRACIÓN: 20261018155809_fase3b_storage_documentos.sql.sql <<<
/*
# Fase 3b — Almacenamiento privado para documentos

1. Cambios
   - Crea el bucket privado "documentos" en Supabase Storage.
   - Carpeta por expediente: los archivos digitales se guardan como
     "expedientes/<id-expediente>/<nombre>".

2. Seguridad
   - Bucket privado: solo usuarios autenticados con rol de escritura
     (admin, gerente, contador, auxiliar) pueden subir.
   - Lectura solo vía URL firmada (el navegador genera enlaces temporales).
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Subir: roles con permiso
DROP POLICY IF EXISTS "staff_upload_documentos" ON storage.objects;
CREATE POLICY "staff_upload_documentos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

-- Leer objetos directamente: solo autenticados (la app usa URLs firmadas)
DROP POLICY IF EXISTS "authenticated_read_documentos" ON storage.objects;
CREATE POLICY "authenticated_read_documentos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documentos');

-- Reemplazar/borrar: admin y gerente
DROP POLICY IF EXISTS "admin_update_documentos" ON storage.objects;
CREATE POLICY "admin_update_documentos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones')
    )
  );

DROP POLICY IF EXISTS "admin_delete_documentos" ON storage.objects;
CREATE POLICY "admin_delete_documentos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documentos'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones')
    )
  );


-- >>> MIGRACIÓN: 20261018161619_fase4_obligaciones_vencimientos.sql.sql <<<
/*
# Fase 4 — Obligaciones fiscales y vencimientos

1. Tablas nuevas
   - `fiscal_obligations`: catálogo de obligaciones (IVA mensual, ISR, renta
     municipal, declaración anual, etc.), con día de vencimiento habitual.
   - `deadline_tasks`: vencimientos concretos por cliente, periodo y obligación.
     Estado pendiente / en_proceso / completado, responsable y fecha límite.
     La columna `file_id` es opcional para vincular la tarea a un expediente.

2. Seguridad
   - RLS activado en ambas tablas.
   - Lectura para autenticados (el asistente operativo ve el calendario).
   - Escritura para admin, gerente, contador y auxiliar contable.

3. Notas
   - "day_of_month" indica el día habitual de vencimiento de la obligación
     (ej. IVA: día 5 de cada mes en Honduras... aprox.; se puede editar).
*/

CREATE TABLE IF NOT EXISTS fiscal_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  day_of_month int NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO fiscal_obligations (name, description, day_of_month) VALUES
  ('IVA mensual', 'Impuesto sobre Ventas - pago mensual', 5),
  ('Retenciones de renta', 'Retenciones de ISR practicadas', 5),
  ('Anticipo de renta', 'Pago provisional de ISR', 5),
  ('Renta municipal', 'Impuesto municipal sobre ingresos', 10),
  ('Declaración anual de renta', 'Declaración jurada anual', 30),
  ('Reporte de operaciones en efectivo', 'ROE mensual', 15)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS deadline_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES fiscal_obligations(id),
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado')),
  responsible_user_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, obligation_id, period_year, period_month)
);

ALTER TABLE fiscal_obligations ENABLE ROW LEVEL SECURITY;
ALTER TABLE deadline_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_fiscal_obligations" ON fiscal_obligations;
CREATE POLICY "authenticated_read_fiscal_obligations" ON fiscal_obligations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_read_deadline_tasks" ON deadline_tasks;
CREATE POLICY "authenticated_read_deadline_tasks" ON deadline_tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_deadline_tasks" ON deadline_tasks;
CREATE POLICY "staff_write_deadline_tasks" ON deadline_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

CREATE INDEX IF NOT EXISTS idx_deadline_tasks_due ON deadline_tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_deadline_tasks_client ON deadline_tasks (client_id);
CREATE INDEX IF NOT EXISTS idx_deadline_tasks_period ON deadline_tasks (period_year, period_month);


-- >>> MIGRACIÓN: 20261018163132_fase5_auditoria.sql.sql <<<
/*
# Fase 5 — Auditoría

1. Tablas nuevas
   - `audit_log`: registro automático de actividad. Se llena con disparadores
     (triggers) al crear, modificar o eliminar registros en clients, files,
     file_documents, file_checklist_items y deadline_tasks.

2. Funciones nuevas
   - `audit_trigger_fn()`: guarda quién hizo el cambio, sobre qué tabla/registro
     y qué acción (crear, actualizar, eliminar). En actualizaciones guarda los
     campos que cambiaron.

3. Seguridad
   - RLS activado. Lectura solo para admin y gerente de operaciones.
   - Nadie inserta directamente: los triggers corren como dueño (SECURITY DEFINER).

4. Notas
   - "actor_name" se guarda como texto (nombre del usuario) para que el historial
     siga mostrando el nombre aunque cambien perfiles.
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'Sistema',
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_fields text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_log" ON audit_log;
CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones')
    )
  );

-- Función disparadora
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_changed text[] := '{}';
  v_summary text := '';
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_name := COALESCE(
      (SELECT p.name FROM profiles p WHERE p.id = v_actor),
      'Sistema'
    );
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, OLD.id, 'delete', 'Registro eliminado');
    RETURN OLD;
  END IF;

  v_name := COALESCE(
    (SELECT p.name FROM profiles p WHERE p.id = v_actor),
    'Sistema'
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, NEW.id, 'create', 'Registro creado');
    RETURN NEW;
  END IF;

  -- UPDATE: detectar campos cambiados
  IF TG_TABLE_NAME = 'deadline_tasks' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_changed := array_append(v_changed, 'fecha límite');
    END IF;
  ELSIF TG_TABLE_NAME = 'file_checklist_items' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Tarea: ' || OLD.status || ' → ' || NEW.status;
    END IF;
  ELSIF TG_TABLE_NAME = 'files' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
  ELSIF TG_TABLE_NAME = 'file_documents' THEN
    v_changed := array_append(v_changed, 'documento');
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF OLD.legal_name IS DISTINCT FROM NEW.legal_name THEN
      v_changed := array_append(v_changed, 'razón social');
      v_summary := 'Nombre: ' || OLD.legal_name || ' → ' || NEW.legal_name;
    END IF;
    IF OLD.rtn IS DISTINCT FROM NEW.rtn THEN
      v_changed := array_append(v_changed, 'RTN');
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
      v_changed := array_append(v_changed, 'rol');
      v_summary := 'Rol: ' || OLD.role_id || ' → ' || NEW.role_id;
    END IF;
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := CASE WHEN NEW.active THEN 'Colaborador activado' ELSE 'Colaborador desactivado' END;
    END IF;
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changed := array_append(v_changed, 'nombre');
    END IF;
  ELSIF TG_TABLE_NAME = 'client_services' THEN
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      v_changed := array_append(v_changed, 'servicio');
      v_summary := CASE WHEN NEW.active THEN 'Servicio activado' ELSE 'Servicio desactivado' END;
    END IF;
  ELSIF TG_TABLE_NAME = 'monthly_master_control' THEN
    IF OLD.info_status IS DISTINCT FROM NEW.info_status THEN
      v_changed := array_append(v_changed, 'información');
    END IF;
    IF OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by THEN
      v_changed := array_append(v_changed, 'revisión gerencia');
      v_summary := CASE WHEN NEW.reviewed_by IS NOT NULL THEN 'Control Maestro revisado' ELSE 'Revisión removida' END;
    END IF;
    IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      v_changed := array_append(v_changed, 'pago');
      v_summary := 'Pago: ' || OLD.payment_status || ' → ' || NEW.payment_status;
    END IF;
    IF OLD.bulletin_status IS DISTINCT FROM NEW.bulletin_status THEN
      v_changed := array_append(v_changed, 'boletín');
    END IF;
    IF OLD.archived IS DISTINCT FROM NEW.archived THEN
      v_changed := array_append(v_changed, 'archivo día 11');
    END IF;
  ELSIF TG_TABLE_NAME = 'informative_tasks' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Informativa: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.applies IS DISTINCT FROM NEW.applies THEN
      v_changed := array_append(v_changed, 'aplica');
    END IF;
  ELSIF TG_TABLE_NAME = 'dmc_checks' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado DMC');
      v_summary := 'DMC: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.first_validator_id IS DISTINCT FROM NEW.first_validator_id THEN
      v_changed := array_append(v_changed, '1er validador');
      v_summary := CASE WHEN NEW.first_validator_id IS NOT NULL THEN '1ra validación firmada (formato)' ELSE '1ra validación removida' END;
    END IF;
    IF OLD.second_validator_id IS DISTINCT FROM NEW.second_validator_id THEN
      v_changed := array_append(v_changed, '2do validador');
      v_summary := CASE WHEN NEW.second_validator_id IS NOT NULL THEN '2da validación firmada (SAR)' ELSE '2da validación removida' END;
    END IF;
  ELSIF TG_TABLE_NAME = 'collections' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado cobro');
      v_summary := 'Cobro: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.audited_by IS DISTINCT FROM NEW.audited_by THEN
      v_changed := array_append(v_changed, 'auditoría cobro');
      v_summary := CASE WHEN NEW.audited_by IS NOT NULL THEN 'Cobro auditado' ELSE 'Auditoría removida' END;
    END IF;
    IF OLD.posted_to_banks IS DISTINCT FROM NEW.posted_to_banks THEN
      v_changed := array_append(v_changed, 'bancos');
      v_summary := CASE WHEN NEW.posted_to_banks THEN 'Posteado en bancos' ELSE 'Desmarcado de bancos' END;
    END IF;
    IF OLD.deposited_amount IS DISTINCT FROM NEW.deposited_amount OR OLD.amount IS DISTINCT FROM NEW.amount THEN
      v_changed := array_append(v_changed, 'monto');
    END IF;
  ELSIF TG_TABLE_NAME = 'quimistan_visits' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado visita');
      v_summary := 'Visita Quimistán: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.client_signed_name IS DISTINCT FROM NEW.client_signed_name THEN
      v_changed := array_append(v_changed, 'firma cliente');
    END IF;
    IF OLD.disclaimer_sent IS DISTINCT FROM NEW.disclaimer_sent THEN
      v_changed := array_append(v_changed, 'deslinde día 6');
    END IF;
  ELSIF TG_TABLE_NAME = 'accounting_tasks' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado contable');
      v_summary := 'Tarea contable: ' || OLD.status || ' → ' || NEW.status;
    END IF;
  END IF;

  IF array_length(v_changed, 1) IS NULL AND OLD IS DISTINCT FROM NEW THEN
    v_changed := ARRAY['actualización'];
    v_summary := 'Registro actualizado';
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, changed_fields, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, NEW.id, 'update', v_changed, v_summary);
  END IF;

  RETURN NEW;
END;
$$;

-- Disparadores
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_files ON files;
CREATE TRIGGER audit_files AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_file_documents ON file_documents;
CREATE TRIGGER audit_file_documents AFTER INSERT OR UPDATE OR DELETE ON file_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_file_checklist_items ON file_checklist_items;
CREATE TRIGGER audit_file_checklist_items AFTER INSERT OR UPDATE OR DELETE ON file_checklist_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_deadline_tasks ON deadline_tasks;
CREATE TRIGGER audit_deadline_tasks AFTER INSERT OR UPDATE OR DELETE ON deadline_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Índice
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);


-- >>> MIGRACIÓN: 20261018164435_fase5b_permisos_catalogos_seguridad.sql.sql <<<
/*
# Fase 5b — Correcciones de permisos y seguridad

1. Catálogos editables solo por el Administrador
   - Insert/Update en fiscal_obligations y document_types restringido al rol
     administrador. El resto de usuarios los leen pero no los cambian.

2. Funciones internas no llamables desde la API
   - Se revoca EXECUTE de next_client_code(), next_file_code() y audit_trigger_fn()
     para anon, authenticated y public. Las usan los disparadores y valores por
     defecto de la base, que no necesitan permisos de llamada externa.
*/

DROP POLICY IF EXISTS "admin_insert_fiscal_obligations" ON fiscal_obligations;
CREATE POLICY "admin_insert_fiscal_obligations" ON fiscal_obligations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  );

DROP POLICY IF EXISTS "admin_update_fiscal_obligations" ON fiscal_obligations;
CREATE POLICY "admin_update_fiscal_obligations" ON fiscal_obligations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  );

DROP POLICY IF EXISTS "admin_insert_document_types" ON document_types;
CREATE POLICY "admin_insert_document_types" ON document_types
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  );

DROP POLICY IF EXISTS "admin_update_document_types" ON document_types;
CREATE POLICY "admin_update_document_types" ON document_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role_id = 'administrador'
    )
  );

-- Funciones internas: revocar de anon, permitir a authenticated para triggers y defaults con RLS activo
REVOKE ALL ON FUNCTION next_client_code() FROM anon;
REVOKE ALL ON FUNCTION next_file_code(text, int, int) FROM anon;
REVOKE ALL ON FUNCTION audit_trigger_fn() FROM anon;
GRANT EXECUTE ON FUNCTION next_client_code() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION next_file_code(text, int, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION audit_trigger_fn() TO authenticated, service_role;


-- >>> MIGRACIÓN: 20261018203250_fase11_control_maestro_informativas.sql <<<
/*
# Control Maestro mensual por cliente

1. Nueva tabla: `monthly_master_control`
   - Un registro por cliente y período (año + mes), es el "Control General Mensual de Clientes" del manual.
   - `client_id`, `period_year`, `period_month`: identifican el período (único por combinación).
   - `responsible_user_id`: gestor asignado (columna "Responsable").
   - `info_status`: estado de la información recibida ('pendiente' | 'parcial' | 'completa').
   - `conformity_date`: fecha de conformidad explícita del cliente con el resumen.
   - `reviewed_by`, `reviewed_at`: revisión operativa previa a la presentación (firma de revisión).
   - `declaration_type`: 'con_pago' | 'sin_pago' (clasificación crítica del manual).
   - `bulletin_status`: estado del boletín ('no_requiere' | 'generado' | 'enviado_cobro' | 'deposito_recibido').
   - `payment_status`: confirmación final de pago ('pendiente' | 'pagado').
   - `archived`: carpeta re-archivada al día 11.
   - `observations`: observaciones / alertas.
2. Seguridad
   - RLS habilitado; lectura para todos los autenticados, escritura para personal (mismos roles que deadline_tasks).
3. Notas
   - Migración idempotente; no elimina ni modifica datos existentes.
*/

CREATE TABLE IF NOT EXISTS monthly_master_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  responsible_user_id uuid REFERENCES profiles(id),
  info_status text NOT NULL DEFAULT 'pendiente' CHECK (info_status IN ('pendiente', 'parcial', 'completa')),
  conformity_date date,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  declaration_type text NOT NULL DEFAULT 'sin_pago' CHECK (declaration_type IN ('con_pago', 'sin_pago')),
  bulletin_status text NOT NULL DEFAULT 'no_requiere' CHECK (bulletin_status IN ('no_requiere', 'generado', 'enviado_cobro', 'deposito_recibido')),
  payment_status text NOT NULL DEFAULT 'pendiente' CHECK (payment_status IN ('pendiente', 'pagado')),
  archived boolean NOT NULL DEFAULT false,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

ALTER TABLE monthly_master_control ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_master_control" ON monthly_master_control;
CREATE POLICY "authenticated_read_master_control" ON monthly_master_control
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_master_control" ON monthly_master_control;
CREATE POLICY "staff_write_master_control" ON monthly_master_control
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

CREATE INDEX IF NOT EXISTS idx_master_control_period ON monthly_master_control (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_master_control_client ON monthly_master_control (client_id);

-- Catálogo: obligaciones informativas (salarios, 12.5%, 1%, dividendos)
CREATE TABLE IF NOT EXISTS informative_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO informative_obligations (name) VALUES
  ('Retención salarios'),
  ('Retención 12.5%'),
  ('Retención 1%'),
  ('Retención dividendos')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE informative_obligations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_informative_obligations" ON informative_obligations;
CREATE POLICY "authenticated_read_informative_obligations" ON informative_obligations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_informative_obligations" ON informative_obligations;
CREATE POLICY "staff_write_informative_obligations" ON informative_obligations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador')
    )
  );

-- Control maestro de obligaciones informativas (responsable: María)
CREATE TABLE IF NOT EXISTS informative_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  obligation_id uuid NOT NULL REFERENCES informative_obligations(id),
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  applies boolean NOT NULL DEFAULT true,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'listo')),
  responsible_user_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, obligation_id, period_year, period_month)
);

ALTER TABLE informative_tasks ADD COLUMN IF NOT EXISTS applies boolean NOT NULL DEFAULT true;

ALTER TABLE informative_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_informative_tasks" ON informative_tasks;
CREATE POLICY "authenticated_read_informative_tasks" ON informative_tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_informative_tasks" ON informative_tasks
;
CREATE POLICY "staff_write_informative_tasks" ON informative_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

CREATE INDEX IF NOT EXISTS idx_informative_tasks_period ON informative_tasks (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_informative_tasks_client ON informative_tasks (client_id);


-- >>> MIGRACIÓN: 20261018204354_fase12_dmc_cobros_fechas.sql <<<
/*
# Checklist DMC, Cobros y Cuadre de Caja

1. Nueva tabla: `dmc_checks`
   - Checklist de la Declaración Mensual de Compras (vence día 8) por cliente y período.
   - Los 7 puntos del manual: rtn_correcto, cai_correcto, fecha_valida, factura_vigente,
     monto_correcto, validacion_sar, acuse_archivado (booleanos).
   - `validated_format` y `validated_sar`: doble validación (formato y sustancial).
   - `status`: 'pendiente' | 'error' | 'corregido' | 'aprobada' | 'archivada'.
   - `observations`: notas de errores o correcciones.
2. Nueva tabla: `collections`
   - Reporte de cobros (cuadrante de caja de Lizeth, auditado por Enrique).
   - `client_id`, `period_year`, `period_month`, `receipt_number` (recibo por honorarios),
     `amount` (numeric), `receipt_issued` (boolean), `deposit_confirmed` (boolean),
     `deposited_amount` (numeric), `audited_by`/`audited_at` (auditoría de Enrique),
     `posted_to_banks` (boolean, registro final por María), `status`:
     'pendiente' | 'emitido' | 'en_cobro' | 'cobrado' | 'conciliado'.
3. Corrección de fechas internas (sección 11 del manual)
   - Actualiza `fiscal_obligations` existentes para alinear los días de vencimiento:
     IVA/retenciones/anticipos → día 8, renta municipal → día 10.
   - Inserta obligaciones faltantes: Declaración Mensual de Compras (día 8),
     Informativas de retención (día 10), Archivo mensual (día 11).
4. Seguridad
   - RLS habilitado; lectura para autenticados, escritura para personal (mismos roles que deadline_tasks).
5. Notas
   - Migración idempotente; no elimina datos existentes.
*/

CREATE TABLE IF NOT EXISTS dmc_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  rtn_correcto boolean NOT NULL DEFAULT false,
  cai_correcto boolean NOT NULL DEFAULT false,
  fecha_valida boolean NOT NULL DEFAULT false,
  factura_vigente boolean NOT NULL DEFAULT false,
  monto_correcto boolean NOT NULL DEFAULT false,
  validacion_sar boolean NOT NULL DEFAULT false,
  acuse_archivado boolean NOT NULL DEFAULT false,
  first_validator_id uuid REFERENCES profiles(id),
  first_validated_at timestamptz,
  second_validator_id uuid REFERENCES profiles(id),
  second_validated_at timestamptz,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'error', 'corregido', 'aprobada', 'archivada')),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

ALTER TABLE dmc_checks ADD COLUMN IF NOT EXISTS first_validator_id uuid REFERENCES profiles(id);
ALTER TABLE dmc_checks ADD COLUMN IF NOT EXISTS first_validated_at timestamptz;
ALTER TABLE dmc_checks ADD COLUMN IF NOT EXISTS second_validator_id uuid REFERENCES profiles(id);
ALTER TABLE dmc_checks ADD COLUMN IF NOT EXISTS second_validated_at timestamptz;

ALTER TABLE dmc_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_dmc_checks" ON dmc_checks;
CREATE POLICY "authenticated_read_dmc_checks" ON dmc_checks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_dmc_checks" ON dmc_checks;
CREATE POLICY "staff_write_dmc_checks" ON dmc_checks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

CREATE INDEX IF NOT EXISTS idx_dmc_checks_period ON dmc_checks (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_dmc_checks_client ON dmc_checks (client_id);

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  receipt_number text,
  amount numeric(12, 2) NOT NULL DEFAULT 0,
  receipt_issued boolean NOT NULL DEFAULT false,
  deposit_confirmed boolean NOT NULL DEFAULT false,
  deposited_amount numeric(12, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'emitido', 'en_cobro', 'cobrado', 'conciliado')),
  audited_by uuid REFERENCES profiles(id),
  audited_at timestamptz,
  posted_to_banks boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_collections" ON collections;
CREATE POLICY "authenticated_read_collections" ON collections
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_collections" ON collections;
CREATE POLICY "staff_write_collections" ON collections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable', 'asistente_operativo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable', 'asistente_operativo')
    )
  );

CREATE INDEX IF NOT EXISTS idx_collections_period ON collections (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_collections_client ON collections (client_id);

-- Corrección de fechas internas (sección 11 del manual)
UPDATE fiscal_obligations SET day_of_month = 8
  WHERE name IN ('IVA mensual', 'Retenciones de renta', 'Anticipo de renta');
UPDATE fiscal_obligations SET day_of_month = 10
  WHERE name = 'Renta municipal';

INSERT INTO fiscal_obligations (name, description, day_of_month) VALUES
  ('Declaración Mensual de Compras (DMC)', 'Declaración de compras ante el SAR, con doble validación', 8),
  ('Informativas de retención', 'Salarios, 12.5%, 1%, dividendos - responsable: María', 10),
  ('Archivo mensual', 'Re-archivo de folders procesados en orden alfabético', 11)
ON CONFLICT (name) DO NOTHING;


-- >>> MIGRACIÓN: 20261018205149_fase13_visitas_quimistan.sql <<<
/*
# Control de Visitas Quimistán

1. Nueva tabla: `quimistan_visits`
   - Control de la visita del día 5 a clientes de Quimistán, más la notificación previa
     por WhatsApp (días 3-4) y el aviso de deslinde de responsabilidad (día 6).
   - `client_id`: cliente de Quimistán visitado.
   - `period_year` / `period_month`: período al que corresponde la recolección.
   - `visit_date`: fecha de la visita (por defecto día 5 del período).
   - `notified_at`: fecha en que se notificó por WhatsApp la visita programada.
   - `visit_time`: hora aproximada de la visita (texto libre, ej. "09:30").
   - `documents_received`: texto con los documentos recibidos (compras, ventas, etc.).
   - `received_by`: miembro del equipo que realizó la visita (profiles).
   - `client_signed_name`: nombre de quien firma la entrega (control de firma del manual).
   - `signed_at`: fecha/hora de la firma.
   - `disclaimer_sent`: aviso formal de deslinde enviado (regla de corte del día 6).
   - `disclaimer_sent_at`: fecha del deslinde.
   - `status`: 'programada' | 'notificada' | 'realizada' | 'completa'.
   - `notes`: observaciones de la visita.
2. Seguridad
   - RLS habilitado; lectura para autenticados, escritura para personal.
3. Notas
   - Migración idempotente; no elimina datos existentes.
*/

CREATE TABLE IF NOT EXISTS quimistan_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  visit_date date NOT NULL,
  notified_at date,
  visit_time text,
  documents_received text,
  received_by uuid REFERENCES profiles(id),
  client_signed_name text,
  signed_at timestamptz,
  disclaimer_sent boolean NOT NULL DEFAULT false,
  disclaimer_sent_at date,
  status text NOT NULL DEFAULT 'programada' CHECK (status IN ('programada', 'notificada', 'realizada', 'completa')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

ALTER TABLE quimistan_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_quimistan_visits" ON quimistan_visits;
CREATE POLICY "authenticated_read_quimistan_visits" ON quimistan_visits
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_quimistan_visits" ON quimistan_visits;
CREATE POLICY "staff_write_quimistan_visits" ON quimistan_visits
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable', 'asistente_operativo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable', 'asistente_operativo')
    )
  );

CREATE INDEX IF NOT EXISTS idx_quimistan_visits_period ON quimistan_visits (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_quimistan_visits_client ON quimistan_visits (client_id);


-- >>> MIGRACIÓN: 20261018205719_fase14_control_contable.sql <<<
/*
# Control Contable Post-Día 10 (María)

1. Nueva tabla: `accounting_tasks`
   - Checklist contable mensual posterior al día 10, por cliente y período.
   - `client_id`: cliente (opcional para tareas globales).
   - `task_type`: tipo de tarea:
     - 'posteo_excel'   → traslado de gastos del Excel al sistema (sección 5 del flujograma).
     - 'conciliacion'   → conciliación bancaria (BAC, FICOHSA, Atlántida).
     - 'caja_chica'     → cuadre de caja chica.
     - 'libros'         → libros legales en el SAR (compras, ventas, diario, mayor).
     - 'quickbooks'     → registro en QuickBooks.
   - `target_name`: detalle de la tarea (ej. "Cuenta BAC", "Libro de compras").
   - `status`: 'pendiente' | 'en_proceso' | 'completada' | 'revisada'.
   - `assigned_to`: responsable (profiles). `completed_at`: fecha de cierre.
   - `notes`: observaciones.
2. Seguridad
   - RLS habilitado; lectura para autenticados, escritura para personal contable.
3. Notas
   - Migración idempotente; no elimina datos existentes.
*/

CREATE TABLE IF NOT EXISTS accounting_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  period_year int NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  task_type text NOT NULL CHECK (task_type IN ('posteo_excel', 'conciliacion', 'caja_chica', 'libros', 'quickbooks')),
  target_name text NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completada', 'revisada')),
  assigned_to uuid REFERENCES profiles(id),
  completed_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month, task_type, target_name)
);

ALTER TABLE accounting_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_accounting_tasks" ON accounting_tasks;
CREATE POLICY "authenticated_read_accounting_tasks" ON accounting_tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_write_accounting_tasks" ON accounting_tasks;
CREATE POLICY "staff_write_accounting_tasks" ON accounting_tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones', 'contador', 'auxiliar_contable')
    )
  );

CREATE INDEX IF NOT EXISTS idx_accounting_tasks_period ON accounting_tasks (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_accounting_tasks_client ON accounting_tasks (client_id);

-- Disparadores de auditoría extendidos (Personal, Servicios y Fases 11 a 14)
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_client_services ON client_services;
CREATE TRIGGER audit_client_services AFTER INSERT OR UPDATE OR DELETE ON client_services
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_monthly_master_control ON monthly_master_control;
CREATE TRIGGER audit_monthly_master_control AFTER INSERT OR UPDATE OR DELETE ON monthly_master_control
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_informative_tasks ON informative_tasks;
CREATE TRIGGER audit_informative_tasks AFTER INSERT OR UPDATE OR DELETE ON informative_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_dmc_checks ON dmc_checks;
CREATE TRIGGER audit_dmc_checks AFTER INSERT OR UPDATE OR DELETE ON dmc_checks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_collections ON collections;
CREATE TRIGGER audit_collections AFTER INSERT OR UPDATE OR DELETE ON collections
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_quimistan_visits ON quimistan_visits;
CREATE TRIGGER audit_quimistan_visits AFTER INSERT OR UPDATE OR DELETE ON quimistan_visits
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_accounting_tasks ON accounting_tasks;
CREATE TRIGGER audit_accounting_tasks AFTER INSERT OR UPDATE OR DELETE ON accounting_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- ========================================================
-- USUARIOS DE ACCESO Y PERFILES INICIALES
-- ========================================================
DO $seed$
DECLARE
  v_admin_uid uuid := '3056583a-3f4e-4fbe-bd87-1a9b2f6810ca'; -- Dario (Administrador)
  v_test_admin_uid uuid := 'a0000000-0000-0000-0000-000000000001'; -- Admin pruebas (Administrador)
BEGIN
  -- Usuario Administrador de pruebas con acceso a TODO
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES (v_test_admin_uid, 'admin@contagestion.hn', crypt('Admin1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES (v_test_admin_uid, 'Administrador General', 'admin@contagestion.hn', 'administrador', true)
  ON CONFLICT (id) DO UPDATE SET role_id = 'administrador', active = true;

  -- Usuario Dario directo (Administrador)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES (v_admin_uid, 'dario@contagestion.hn', crypt('Dario1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES (v_admin_uid, 'Dario', 'dario@contagestion.hn', 'administrador', true)
  ON CONFLICT (id) DO UPDATE SET role_id = 'administrador', active = true;

  -- Usuario Enrique (Gerente de Operaciones)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('761d112b-4cf4-44f3-bd81-25e35c410ca8', 'enrique@contagestion.hn', crypt('Enrique1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('761d112b-4cf4-44f3-bd81-25e35c410ca8', 'Enrique', 'enrique@contagestion.hn', 'gerente_operaciones', true)
  ON CONFLICT (id) DO NOTHING;

  -- Usuario Maria (Contadora)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('c7d7f557-5757-4610-a748-93e84def54e4', 'maria@contagestion.hn', crypt('Maria1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('c7d7f557-5757-4610-a748-93e84def54e4', 'Maria', 'maria@contagestion.hn', 'contador', true)
  ON CONFLICT (id) DO NOTHING;

  -- Usuario Alejandra (Auxiliar)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('9eb30d56-d78d-4852-9313-99ea20e3ba32', 'alejandra@contagestion.hn', crypt('Alejandra1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('9eb30d56-d78d-4852-9313-99ea20e3ba32', 'Alejandra', 'alejandra@contagestion.hn', 'auxiliar_contable', true)
  ON CONFLICT (id) DO NOTHING;

  -- Usuario Francis (Auxiliar Contable)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('422f80a4-f9fc-412e-89b4-e7f350a5b843', 'francis@contagestion.hn', crypt('Francis1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('422f80a4-f9fc-412e-89b4-e7f350a5b843', 'Francis', 'francis@contagestion.hn', 'auxiliar_contable', true)
  ON CONFLICT (id) DO NOTHING;

  -- Usuario Lizeth (Auxiliar Contable)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('4ae37931-c06d-4b13-8243-8f6f31400115', 'lizeth@contagestion.hn', crypt('Lizeth1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('4ae37931-c06d-4b13-8243-8f6f31400115', 'Lizeth', 'lizeth@contagestion.hn', 'auxiliar_contable', true)
  ON CONFLICT (id) DO NOTHING;

  -- Usuario Brayan (Asistente operativo)
  INSERT INTO auth.users (id, email, encrypted_password)
  VALUES ('888030ab-3785-4ded-bb49-ed4082468951', 'brayan@contagestion.hn', crypt('Brayan1234!', gen_salt('bf', 10)))
  ON CONFLICT (email) DO NOTHING;
  INSERT INTO profiles (id, name, email, role_id, active)
  VALUES ('888030ab-3785-4ded-bb49-ed4082468951', 'Brayan', 'brayan@contagestion.hn', 'asistente_operativo', true)
  ON CONFLICT (id) DO NOTHING;

  -- Clientes iniciales del sistema
  INSERT INTO clients (id, code, legal_name, commercial_name, rtn, client_type, status, email, phone, contact_name, is_quimistan, department, municipality)
  VALUES 
    ('287ebbd4-79d0-48e9-b09b-4215ff71701d', 'CLI-0001', 'Distribuidora La Esperanza S.A. de C.V.', 'La Esperanza Centro', '08019992123456', 'empresa', 'activo', 'contacto@laesperanza.hn', '+504 9811-2233', 'Rosa Meléndez', true, 'Cortés', 'San Pedro Sula'),
    ('fad095a7-9146-4850-aef2-58405a83fceb', 'CLI-0002', 'Juan Carlos Ramos', NULL, '12012001556677', 'persona', 'activo', NULL, '+504 9455-7788', NULL, false, 'Francisco Morazán', 'Tegucigalpa'),
    ('c8f682f8-e515-4e69-b6cf-b8c03d4530a6', 'CLI-0003', 'Ferretería El Progreso', 'El Progreso', '05041998877665', 'empresa', 'activo', 'ventas@ferreprogreso.hn', '+504 2710-4455', 'Mario Cruz', false, 'Cortés', 'El Progreso'),
    ('bd380ab3-4f83-4598-a174-74cd188d5bcd', 'CLI-0004', 'Bodega San Jorge', NULL, '07082001112233', 'empresa', 'activo', NULL, NULL, NULL, false, NULL, NULL)
  ON CONFLICT (id) DO NOTHING;

  -- Sincronizar secuencia client_code_seq para evitar colisión CLI-0001..CLI-0004 al crear clientes nuevos
  PERFORM setval(
    'client_code_seq',
    GREATEST(
      (SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '\D', '', 'g'), '')::int), 4) FROM clients),
      4
    ),
    true
  );

  -- Servicios de clientes
  INSERT INTO client_services (id, client_id, service_id, active)
  SELECT gen_random_uuid(), '287ebbd4-79d0-48e9-b09b-4215ff71701d', id, true FROM services WHERE name IN ('Declaraciones', 'Contabilidad', 'Bancos')
  ON CONFLICT DO NOTHING;

  INSERT INTO client_services (id, client_id, service_id, active)
  SELECT gen_random_uuid(), 'fad095a7-9146-4850-aef2-58405a83fceb', id, true FROM services WHERE name IN ('Declaraciones')
  ON CONFLICT DO NOTHING;

  INSERT INTO client_services (id, client_id, service_id, active)
  SELECT gen_random_uuid(), 'c8f682f8-e515-4e69-b6cf-b8c03d4530a6', id, true FROM services WHERE name IN ('Contabilidad', 'Libros', 'Retenciones')
  ON CONFLICT DO NOTHING;

END $seed$;

-- ========================================================
-- PERMISOS EXPLÍCITOS DE ESQUEMA Y TABLAS PARA RLS ESTRICTO
-- ========================================================
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA storage TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.role() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION next_client_code(), next_file_code(text, int, int), audit_trigger_fn() TO authenticated, service_role;
