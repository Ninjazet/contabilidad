# Guía Rápida de Edición y Estructura del Proyecto ContaGestión

Todo el proyecto **ContaGestión** (Frontend en React/TypeScript y Backend en Node.js/Express) ha sido organizado en carpetas modulares en español y con todas sus variables, estados, funciones y parámetros nombrados en español claro para facilitar su mantenimiento y edición.

---

## 1. ¿Dónde editar textos, colores, plazos o parámetros rápidos?

El archivo central de configuración del sistema se encuentra en:
- `src/configuracion/parametros-sistema.ts`

Desde este único archivo puedes modificar sin tocar la lógica de las pantallas:
- **`CONFIGURACION_FIRMA`** (`NOMBRE_DESPACHO`, `SUBTITULO_DESPACHO`, `VERSION_SISTEMA`, `ZONA_HORARIA_HONDURAS`, `EXPRESION_REGULAR_RTN`): Nombre del sistema (`ContaGestión`), subtítulo, versión, moneda (`L`) y zona horaria (`America/Tegucigalpa`).
- **`ACCESOS_RAPIDOS_PANEL`**: Botones de acceso directo mostrados en el Panel Principal.
- **`DIA_VISITA_QUIMISTAN` y `DIA_DESLINDE_QUIMISTAN`**: Días de visita presencial (día `5`) y deslinde (día `6`), además de los puntos de validación DMC (`PUNTOS_REVISION_DMC`).
- **`PLANTILLA_TAREAS_CONTABLES`** y **`TAREAS_BASE_EXPEDIENTE`**: Las 9 tareas mensuales que se generan con 1 clic en Contabilidad y las 5 tareas base de cada expediente mensual.
- **`OPCIONES_ROLES` y `ETIQUETAS_ROLES`**: Identificadores y nombres visibles de los 5 roles del despacho.
- **Etiquetas y Colores por Módulo**: `ETIQUETAS_ESTADO_CLIENTE`, `ETIQUETAS_ESTADO_EXPEDIENTE`, `ETIQUETAS_ESTADO_VENCIMIENTO`, `ETIQUETAS_INFORMACION_MAESTRO`, `ETIQUETAS_ESTADO_INFORMATIVA`, `ETIQUETAS_ESTADO_DMC`, `ETIQUETAS_ESTADO_COBRO`, `ETIQUETAS_ESTADO_VISITA`, `ETIQUETAS_ESTADO_CONTABLE` y `ETIQUETAS_TABLAS_AUDITORIA`.

---

## 2. Mapa de Carpetas del Frontend (`ContaGestion/src/`)

```text
src/
├── configuracion/
│   └── parametros-sistema.ts        # Configuración centralizada editable (plazos SAR, plantillas, roles, moneda)
│
├── paginas/                         # Las 19 pantallas del sistema (1 archivo por módulo)
│   ├── iniciar-sesion.tsx           # Pantalla de acceso (/acceso)
│   ├── panel-principal.tsx          # Dashboard ejecutivo y KPIs (/)
│   ├── clientes.tsx                 # Padrón de contribuyentes (/clientes)
│   ├── detalle-cliente.tsx          # Ficha Integral 360 del cliente (/clientes/:id)
│   ├── expedientes.tsx              # Control de carpetas físicas (/expedientes)
│   ├── detalle-expediente.tsx       # Detalle, checklist y archivos del expediente (/expedientes/:id)
│   ├── documentos.tsx               # Bóveda digital general (/documentos)
│   ├── control-maestro.tsx          # Matriz mensual de impuestos SAR (/control-maestro)
│   ├── informativas.tsx             # Declaraciones informativas día 10 (/informativas)
│   ├── validacion-dmc.tsx           # Doble validación DMC día 8 (/dmc)
│   ├── cobros-caja.tsx              # Honorarios, rutas de cobro y auditoría de caja (/cobros)
│   ├── visitas-quimistan.tsx        # Gira presencial día 5 (/visitas-quimistan)
│   ├── contabilidad.tsx             # Posteo contable y estados financieros (/contabilidad)
│   ├── lista-tareas.tsx             # Matriz global de requisitos legales (/checklist)
│   ├── calendario.tsx               # Calendario mensual interactivo (/calendario)
│   ├── personal.tsx                 # Alta de colaboradores, roles y cambio de clave (/personal)
│   ├── auditoria.tsx                # Bitácora forense inmutable (/auditoria)
│   ├── configuracion.tsx            # Catálogos de impuestos, servicios, documentos y perfil (/configuracion)
│   └── no-encontrado.tsx            # Página 404 para rutas inexistentes
│
├── componentes/                     # Componentes visuales y de negocio reutilizables
│   ├── estructura/
│   │   ├── barra-lateral.tsx        # Menú lateral izquierdo filtrado por rol
│   │   ├── encabezado-app.tsx       # Barra superior con buscador global, ayuda F1 y tema
│   │   └── contenedor-app.tsx       # Marco general de las pantallas autenticadas
│   ├── clientes/
│   │   └── dialogo-cliente.tsx      # Formulario modal de alta/edición de cliente y servicios contratados
│   ├── expedientes/
│   │   └── seccion-documentos-expediente.tsx # Subida, descarga firmada y borrado de documentos
│   ├── ayuda-modulo.tsx             # Panel lateral de ayuda contextual (atajo F1)
│   ├── busqueda-global.tsx          # Buscador rápido de clientes y expedientes (Ctrl + K)
│   ├── encabezado-pagina.tsx        # Título, descripción y botones de acción de cada página
│   ├── proveedor-tema.tsx           # Gestor de modo claro / oscuro
│   ├── selector-tema.tsx            # Botón para alternar tema visual
│   └── requiere-autenticacion.tsx   # Guardián de seguridad por sesión y rol (RBAC)
│
├── ganchos/                         # Hooks personalizados de React en español
│   ├── usar-autenticacion.tsx       # Estado de sesión, perfil activo (`perfil`), `iniciarSesion`, `cerrarSesion`
│   └── usar-movil.ts                # Detector de pantalla móvil (`usarEsMovil`)
│
├── utilidades/                      # Funciones auxiliares, tipos, fechas y permisos
│   ├── tipos.ts                     # Tipos de datos en español (`Cliente`, `Expediente`, `PerfilUsuario`, etc.)
│   ├── permisos.ts                  # Reglas de acceso por ruta y función (`tieneAccesoRuta`, `obtenerRolEfectivo`)
│   ├── navegacion.ts                # Estructura del menú lateral (`GRUPOS_NAVEGACION`)
│   ├── fechas.ts                    # Formateo seguro de fechas en zona horaria de Honduras (`formatearFecha`)
│   ├── exportar-csv.ts              # Generador de reportes Excel/CSV con UTF-8 BOM (`exportarACsv`)
│   ├── cliente-supabase.ts          # Cliente HTTP conectado al backend local
│   └── datos-ayuda.ts               # Textos del manual integrado F1 (`obtenerAyudaPorRuta`)
│
├── components/ui/                   # Primitivas gráficas base (botones, tablas, diálogos de Shadcn/Radix)
└── rutas-aplicacion.tsx             # Enrutador principal que conecta cada URL con su página en `src/paginas/`
```

---

## 3. Mapa del Backend (`postgres-migration/api-contagestion/src/`)

Todos los archivos del servidor Express tienen sus variables, parámetros (`solicitud`, `respuesta`, `siguiente`) y funciones internas en español:

- `src/index.js`: Punto de entrada del servidor (`aplicacionExpress`, `PUERTO_SERVIDOR`), configuración de CORS y montaje de rutas.
- `src/db.js`: Pool de PostgreSQL (`poolConexion`) y función transaccional `consultarComoUsuario(idUsuario, rolUsuario, consultaSql, parametros)` que activa las políticas RLS de PostgreSQL.
- `src/middleware/auth.js`: Verificación de tokens JWT (`autenticarSolicitud`, `requerirAutenticacion`, `SECRETO_JWT`).
- `src/routes/auth.js`: Inicio de sesión (`procesarInicioSesion`), alta de colaboradores por administrador (`procesarCreacionUsuarioPorAdmin`), restablecimiento de contraseña (`procesarCambioClavePorAdmin`) y perfil actual (`obtenerUsuarioActual`).
- `src/routes/rest.js`: Motor REST/PostgREST en español (`validarIdentificadorSeguro`, `construirClausulaSelect`, `analizarFiltrosConsulta`, `procesarConsultaGet`).
- `src/routes/storage.js`: Bóveda documental (`sanearRutaRelativa`, `resolverArchivoEnContenedor`, `procesarSubidaArchivo`, enlaces firmados y eliminación física/lógica).
- `src/routes/domain.js`: Endpoints directos en español (`/api/clientes`, `/api/expedientes`, `/api/obligaciones`, `/api/cobros`, `/api/visitas`, `/api/personal`).

---

## 4. Convención de Nombres Utilizada

1. **Variables, estados y funciones en Español:**
   - Ejemplo en páginas: `listaClientes`, `cargandoDatos`, `textoBusqueda`, `anioSeleccionado`, `mesSeleccionado`, `cargarDatos()`, `guardarCambios()`, `exportarListadoCsv()`.
   - Ejemplo en autenticación: `const { perfil, usuario, iniciarSesion, cerrarSesion } = usarAutenticacion()`.
2. **Columnas de Base de Datos PostgreSQL intactas:**
   - Las propiedades que viajan directamente hacia/desde las tablas SQL (`legal_name`, `commercial_name`, `period_year`, `period_month`, `role_id`, `storage_path`) conservan el nombre exacto de la columna en PostgreSQL para no romper ninguna consulta ni requerir migraciones destructivas.
3. **Compilación y Despliegue:**
   - Para verificar tipos en cualquier momento: `npm run typecheck`
   - Para compilar cambios del frontend a producción: `npm run build`
