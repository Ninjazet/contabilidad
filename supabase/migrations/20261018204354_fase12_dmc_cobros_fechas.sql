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
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'error', 'corregido', 'aprobada', 'archivada')),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

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
