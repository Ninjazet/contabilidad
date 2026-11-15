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
