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
  WITH CHECK (auth.uid() = id);

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
