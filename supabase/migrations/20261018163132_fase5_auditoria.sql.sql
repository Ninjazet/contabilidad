/*
# Fase 5 — Auditoría

1. Tablas nuevas
   - `audit_log`: registro automático de actividad. Se llena con disparadores
     (triggers) al crear, modificar o eliminar registros en clients, files,
     file_documents, file_checklist_items y deadline_tasks.

2. Funciones nuevas
   - `audit_trigger_fn()`: guarda quién hizo el cambio, sobre qué tabla/registro
     y qué acción (crear, actualizar, eliminar). En actualizaciones guarda los
     campos que cambiaron.

3. Seguridad
   - RLS activado. Lectura solo para admin y gerente de operaciones.
   - Nadie inserta directamente: los triggers corren como dueño (SECURITY DEFINER).

4. Notas
   - "actor_name" se guarda como texto (nombre del usuario) para que el historial
     siga mostrando el nombre aunque cambien perfiles.
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT 'Sistema',
  table_name text NOT NULL,
  record_id uuid,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  changed_fields text[] NOT NULL DEFAULT '{}',
  summary text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_audit_log" ON audit_log;
CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role_id IN ('administrador', 'gerente_operaciones')
    )
  );

-- Función disparadora
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_changed text[] := '{}';
  v_summary text := '';
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_name := COALESCE(
      (SELECT p.name FROM profiles p WHERE p.id = v_actor),
      'Sistema'
    );
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, OLD.id, 'delete', 'Registro eliminado');
    RETURN OLD;
  END IF;

  v_name := COALESCE(
    (SELECT p.name FROM profiles p WHERE p.id = v_actor),
    'Sistema'
  );

  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, NEW.id, 'create', 'Registro creado');
    RETURN NEW;
  END IF;

  -- UPDATE: detectar campos cambiados
  IF TG_TABLE_NAME = 'deadline_tasks' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
      v_changed := array_append(v_changed, 'fecha límite');
    END IF;
  ELSIF TG_TABLE_NAME = 'file_checklist_items' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Tarea: ' || OLD.status || ' → ' || NEW.status;
    END IF;
  ELSIF TG_TABLE_NAME = 'files' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
  ELSIF TG_TABLE_NAME = 'file_documents' THEN
    v_changed := array_append(v_changed, 'documento');
  ELSIF TG_TABLE_NAME = 'clients' THEN
    IF OLD.legal_name IS DISTINCT FROM NEW.legal_name THEN
      v_changed := array_append(v_changed, 'razón social');
      v_summary := 'Nombre: ' || OLD.legal_name || ' → ' || NEW.legal_name;
    END IF;
    IF OLD.rtn IS DISTINCT FROM NEW.rtn THEN
      v_changed := array_append(v_changed, 'RTN');
    END IF;
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_changed := array_append(v_changed, 'estado');
      v_summary := 'Estado: ' || OLD.status || ' → ' || NEW.status;
    END IF;
    IF OLD.responsible_user_id IS DISTINCT FROM NEW.responsible_user_id THEN
      v_changed := array_append(v_changed, 'responsable');
    END IF;
  END IF;

  IF array_length(v_changed, 1) > 0 THEN
    INSERT INTO audit_log (actor_id, actor_name, table_name, record_id, action, changed_fields, summary)
    VALUES (v_actor, v_name, TG_TABLE_NAME, NEW.id, 'update', v_changed, v_summary);
  END IF;

  RETURN NEW;
END;
$$;

-- Disparadores
DROP TRIGGER IF EXISTS audit_clients ON clients;
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_files ON files;
CREATE TRIGGER audit_files AFTER INSERT OR UPDATE OR DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_file_documents ON file_documents;
CREATE TRIGGER audit_file_documents AFTER INSERT OR UPDATE OR DELETE ON file_documents
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_file_checklist_items ON file_checklist_items;
CREATE TRIGGER audit_file_checklist_items AFTER INSERT OR UPDATE OR DELETE ON file_checklist_items
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

DROP TRIGGER IF EXISTS audit_deadline_tasks ON deadline_tasks;
CREATE TRIGGER audit_deadline_tasks AFTER INSERT OR UPDATE OR DELETE ON deadline_tasks
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();

-- Índice
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log (created_at DESC);
