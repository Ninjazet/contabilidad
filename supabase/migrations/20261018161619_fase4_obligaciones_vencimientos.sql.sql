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
