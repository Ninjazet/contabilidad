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

-- Funciones internas: solo para uso interno de la base
REVOKE ALL ON FUNCTION next_client_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION next_file_code(text, int, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION audit_trigger_fn() FROM PUBLIC, anon, authenticated;
