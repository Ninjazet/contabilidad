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
