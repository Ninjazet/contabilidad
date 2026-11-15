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
