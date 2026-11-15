/**
 * ============================================================================
 * CLIENTE DE CONEXIÓN A BASE DE DATOS Y API (SUPABASE / EXPRESS)
 * ============================================================================
 * - En la nube (Vercel): utiliza VITE_SUPABASE_URL si apunta a un servidor remoto.
 * - En Docker local / Túnel local: usa localhost:3002 en desarrollo local o
 *   window.location.origin cuando Nginx hace de proxy inverso.
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js"

const urlConfigurada = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const esUrlLocalhost =
  !urlConfigurada ||
  urlConfigurada.includes("localhost") ||
  urlConfigurada.includes("127.0.0.1")

const esNavegadorLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1")

export const urlServidorBackend =
  urlConfigurada && !esUrlLocalhost
    ? urlConfigurada
    : esNavegadorLocal
      ? urlConfigurada || "http://localhost:3002"
      : typeof window !== "undefined"
        ? window.location.origin
        : urlConfigurada || "http://localhost:3002"

export const clavePublicaApi =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
  "contagestion-clave-publica-cliente"

export const baseDeDatos = createClient(urlServidorBackend, clavePublicaApi)

// Alias de compatibilidad
export const supabaseUrl = urlServidorBackend
export const supabaseAnonKey = clavePublicaApi
export const supabase = baseDeDatos
