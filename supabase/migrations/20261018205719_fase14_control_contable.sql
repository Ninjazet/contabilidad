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
