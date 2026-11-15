# Guía de Despliegue Temporal Gratis (GitHub + Railway + Vercel)

Esta configuración permite publicar **ContaGestión** en la nube para pruebas externas sin tener tu laptop encendida y **sin modificar tu entorno Docker local** (`docker-compose.yml`).

---

## 1. Despliegue del Backend + PostgreSQL en **Railway** (Trial gratis 30 días)

1. Crea un proyecto nuevo en Railway -> **Deploy from GitHub repo** (elige este repositorio privado).
2. En el proyecto de Railway pulsa **+ New -> Database -> Add PostgreSQL**.
3. En el servicio de tu código (Node/Docker), configura:
   - **Root Directory:** `backend`
   - **Variables de entorno:**
     - `PORT`: `3002`
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (referencia automática a PostgreSQL de Railway)
     - `JWT_SECRET`: genera una clave secreta larga única para la nube
     - `STORAGE_PATH`: `/app/uploads`
     - `CORS_ORIGINS`: `*` (o la URL final de Vercel, ej. `https://contagestion.vercel.app`)
   - *(Opcional para persistencia de PDFs)* En **Volumes**, monta `/app/uploads`.
   - En **Settings -> Networking**, pulsa **Generate Domain** para obtener tu URL HTTPS (ej. `https://contagestion-api-production.up.railway.app`).
4. **Inicialización automática de BD:** Al arrancar por primera vez contra el PostgreSQL vacío, `backend/src/init-db.js` detecta que no existen tablas y ejecuta automáticamente `backend/database/init-contagestion.sql` creando tablas, roles y los 8 usuarios iniciales.

---

## 2. Despliegue del Frontend en **Vercel** (Plan Hobby Gratis)

1. Importa este mismo repositorio privado en **Vercel**.
2. Deja el **Root Directory** en `./` (raíz del repositorio) y Framework Preset **Vite**.
3. Configura las **Environment Variables** en Vercel:
   - `VITE_SUPABASE_URL` = la URL HTTPS generada en Railway (sin `/` al final)
   - `VITE_SUPABASE_ANON_KEY` = `contagestion-clave-publica-cliente`
4. Pulsa **Deploy**. El archivo `vercel.json` ya incluye el rewrite SPA para todas las rutas internas (`/clientes`, `/control-maestro`, etc.).

