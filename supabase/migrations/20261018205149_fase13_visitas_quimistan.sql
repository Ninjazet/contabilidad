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

CREATE INDEX IF NOT EXISTS idx_quimistan_visits_period ON quimistan_visits (period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_quimistan_visits_client ON quimistan_visits (client_id);
