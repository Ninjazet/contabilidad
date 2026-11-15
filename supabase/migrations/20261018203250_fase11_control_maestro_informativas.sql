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
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'listo')),
  responsible_user_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, obligation_id, period_year, period_month)
);

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
