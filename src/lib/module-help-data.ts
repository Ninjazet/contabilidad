export type ModuleHelpItem = {
  title: string
  route: string
  code: string
  summary: string
  purpose: string
  actions: { name: string; description: string }[]
  steps: { step: number; title: string; description: string }[]
  fields: { field: string; description: string }[]
  rules: string[]
  roles: { role: string; access: string }[]
  tips: string[]
}

export const MODULES_HELP: Record<string, ModuleHelpItem> = {
  dashboard: {
    title: "Panel Principal (Dashboard)",
    route: "/",
    code: "MOD-00",
    summary:
      "Centro de mando operativo que consolida métricas clave en tiempo real, avance documental y vencimientos fiscales de los próximos 30 días.",
    purpose:
      "Permite al personal y a la gerencia supervisar de un vistazo la carga total de trabajo del mes: cuántos clientes están activos, carpetas registradas, avance porcentual del checklist documental y obligaciones que vencen próximamente ante el SAR.",
    actions: [
      {
        name: "Tarjetas de Métrica (KPIs)",
        description:
          "Hacer clic en 'Ver clientes', 'Ver expedientes' o 'Ver documentos' redirige directamente al catálogo correspondiente.",
      },
      {
        name: "Filtro de Vencimientos Próximos",
        description:
          "Muestra las obligaciones fiscales cuya fecha límite se ubica dentro de los siguientes 30 días naturales.",
      },
      {
        name: "Indicador de Atrasos",
        description:
          "Alerta visual en color rojo si existen obligaciones cuya fecha límite ya venció y aún no están en estado 'Completada'.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Revisar obligaciones urgentes",
        description:
          "Al iniciar la jornada, consulte el bloque 'Próximos vencimientos' para identificar declaraciones que venzan en los días 8 (DMC) o 10 (Informativas).",
      },
      {
        step: 2,
        title: "Comprobar el progreso del checklist",
        description:
          "Verifique la barra de avance general; indica el porcentaje de requisitos legales y tributarios completados sobre el total.",
      },
      {
        step: 3,
        title: "Navegar a los módulos de trabajo",
        description:
          "Utilice los enlaces directos o la barra lateral izquierda para atender las cuentas prioritarias.",
      },
    ],
    fields: [
      {
        field: "Clientes",
        description: "Total de contribuyentes activos bajo contrato con el despacho contable.",
      },
      {
        field: "Expedientes",
        description: "Carpetas físicas y digitales abiertas en el archivo central.",
      },
      {
        field: "Documentos",
        description: "Total de archivos digitales (PDFs, escrituras, RTN) resguardados en la bóveda.",
      },
      {
        field: "Vencimientos (30 días)",
        description: "Cantidad de declaraciones con plazo de presentación dentro de los próximos 30 días.",
      },
    ],
    rules: [
      "Las métricas se calculan en vivo consultando la base de datos PostgreSQL.",
      "Las obligaciones pagadas o completadas se descuentan automáticamente del contador de pendientes.",
    ],
    roles: [
      { role: "Todos los roles", access: "Visualización de métricas adaptada al nivel de autorización" },
    ],
    tips: [
      "Si el contador de clientes cambia, el panel se actualizará de inmediato.",
      "Mantenga el avance del checklist por encima del 80% antes del cierre del mes fiscal.",
    ],
  },

  clients: {
    title: "Directorio de Clientes",
    route: "/clientes",
    code: "MOD-01",
    summary:
      "Padrón general de contribuyentes (personas naturales y jurídicas) con registro de RTN, contadores asignados y condiciones especiales.",
    purpose:
      "Gestiona la información tributaria y de contacto de cada cliente. Establece la base para la asignación de expedientes, generación de obligaciones en el Control Maestro y logística de visitas presenciales.",
    actions: [
      {
        name: "+ Nuevo Cliente",
        description:
          "Abre el formulario modal de captura para registrar un nuevo contribuyente natural o empresa jurídica.",
      },
      {
        name: "Buscador de Clientes",
        description:
          "Filtra la tabla en tiempo real por razón social, nombre comercial, código único o número de RTN.",
      },
      {
        name: "Filtro por Estado",
        description:
          "Permite visualizar únicamente clientes 'Activos', 'Inactivos' o 'Suspendidos'.",
      },
      {
        name: "Fila de Cliente",
        description:
          "Hacer clic sobre un cliente abre su Ficha Integral 360 con expedientes, obligaciones y notas.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Captura de datos fiscales",
        description:
          "Presione '+ Nuevo Cliente' e ingrese el Nombre Legal (Razón Social), Nombre Comercial y RTN de 14 dígitos.",
      },
      {
        step: 2,
        title: "Asignación de responsables",
        description:
          "Seleccione al Contador Responsable (principal) y al Contador Secundario (apoyo) del despacho.",
      },
      {
        step: 3,
        title: "Clasificación de operación",
        description:
          "Active la casilla '¿Es de Quimistán?' si requiere visita física el día 5 del mes, y '¿Declara en cero?' si no registra ventas.",
      },
    ],
    fields: [
      {
        field: "Código (CLI-XXXX)",
        description: "Identificador único y secuencial asignado por el sistema.",
      },
      {
        field: "RTN",
        description: "Registro Tributario Nacional de 14 dígitos emitido por el SAR de Honduras.",
      },
      {
        field: "Tipo de Cliente",
        description: "Persona natural o Empresa jurídica mercantil.",
      },
      {
        field: "Quimistán",
        description: "Indica si el cliente opera en la zona geográfica de Quimistán para recolección física.",
      },
      {
        field: "Declara en Cero",
        description: "Clientes sin movimiento comercial cuyas declaraciones se presentan con prioridad temprana.",
      },
    ],
    rules: [
      "El RTN debe contener exactamente 14 caracteres numéricos conforme a la estructura tributaria nacional.",
      "Un cliente inactivo no genera obligaciones automáticas en los nuevos periodos fiscales.",
    ],
    roles: [
      { role: "Auxiliar Contable / Contador", access: "Consulta, alta y edición de clientes" },
      { role: "Gerente / Administrador", access: "Control total y reasignación de carteras" },
      { role: "Asistente Operativo", access: "Acceso no disponible (bloqueado por seguridad)" },
    ],
    tips: [
      "Utilice el atajo Ctrl + K para buscar un cliente rápidamente desde cualquier pantalla.",
      "Verifique que el teléfono y WhatsApp estén actualizados para las notificaciones del día 3 y 4.",
    ],
  },

  files: {
    title: "Control de Expedientes Físicos",
    route: "/expedientes",
    code: "MOD-02",
    summary:
      "Registro de carpetas físicas en el archivo central, con ubicación topográfica (archivador, gaveta, folder) y estado de revisión.",
    purpose:
      "Evita el extravío de documentos originales de los clientes. Cada carpeta física tiene una coordenada exacta en el archivo y un estado de custodia supervisado por el equipo contable.",
    actions: [
      {
        name: "+ Nuevo Expediente",
        description:
          "Registra la apertura de una carpeta física vinculada a un cliente, asignándole gaveta y archivador.",
      },
      {
        name: "Filtro por Estado",
        description:
          "Filtra expedientes por estado: 'Abierto' (en trámite), 'En Revisión' (supervisión) o 'Cerrado' (archivado).",
      },
      {
        name: "Ver Detalle",
        description:
          "Permite acceder al checklist de documentos obligatorios que deben reposar dentro del folder físico.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Apertura de carpeta",
        description:
          "Presione '+ Nuevo Expediente' y seleccione el cliente al cual pertenece la documentación.",
      },
      {
        step: 2,
        title: "Definir ubicación física",
        description:
          "Especifique el código de folder, archivador y gaveta donde se resguardará la documentación física.",
      },
      {
        step: 3,
        title: "Seguimiento de custodia",
        description:
          "Cuando el folder sea extraído para elaboración tributaria, actualice el estado a 'En Revisión'.",
      },
    ],
    fields: [
      {
        field: "Código de Expediente",
        description: "Identificador asignado al folder (ejemplo: EXP-001).",
      },
      {
        field: "Ubicación en Archivo",
        description: "Archivador, gaveta y número de carpeta física en la oficina contable.",
      },
      {
        field: "Estado",
        description: "Abierto (activo), En Revisión (en manos del contador) o Cerrado (resguardado).",
      },
    ],
    rules: [
      "Todo cliente activo debe contar al menos con un expediente físico registrado.",
      "El re-archivo alfabético de folders es obligatorio a partir del día 11 de cada mes.",
    ],
    roles: [
      { role: "Auxiliar Contable / Contador", access: "Creación y actualización de expedientes" },
      { role: "Gerente / Administrador", access: "Supervisión de custodia y reubicación de archivo" },
    ],
    tips: [
      "Etiquete físicamente el folder con el mismo código generado por el sistema.",
    ],
  },

  documents: {
    title: "Bóveda Digital de Documentos",
    route: "/documentos",
    code: "MOD-03",
    summary:
      "Repositorio digital permanente para la carga, clasificación y descarga de archivos PDF, imágenes de facturas y contratos.",
    purpose:
      "Centraliza los soportes probatorios digitales de cada contribuyente. Permite que el equipo consulte escrituras, constancias de pagos y declaraciones sin necesidad de extraer el folder físico continuamente.",
    actions: [
      {
        name: "Subir Documento",
        description:
          "Abre el cuadro de diálogo para cargar un archivo local (PDF o imagen), asociarlo a un cliente y clasificar su tipo.",
      },
      {
        name: "Ver / Descargar",
        description:
          "Abre el archivo resguardado en el almacenamiento local seguro para su inspección directa en el navegador.",
      },
      {
        name: "Filtro por Cliente",
        description:
          "Filtra la lista de archivos para mostrar únicamente los documentos pertenecientes a una empresa específica.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Seleccionar cliente",
        description:
          "Presione 'Subir Documento' y elija la empresa o persona natural a la que corresponde el comprobante.",
      },
      {
        step: 2,
        title: "Categorizar archivo",
        description:
          "Indique el tipo de documento: RTN, Escritura Pública, Permiso de Operación, Facturas o Boletín de Pago.",
      },
      {
        step: 3,
        title: "Adjuntar y confirmar",
        description:
          "Seleccione el archivo desde su computadora. El sistema lo subirá a la bóveda y generará su registro.",
      },
    ],
    fields: [
      {
        field: "Nombre del Archivo",
        description: "Denominación del documento cargado en el sistema.",
      },
      {
        field: "Cliente",
        description: "Contribuyente propietario de la información.",
      },
      {
        field: "Tipo de Documento",
        description: "Categoría fiscal o legal conforme al catálogo del despacho.",
      },
      {
        field: "Fecha de Subida",
        description: "Estampa de tiempo del momento exacto de la carga.",
      },
    ],
    rules: [
      "Se admiten archivos PDF e imágenes en formatos JPG y PNG.",
      "Los archivos se guardan en el servidor local seguro con acceso autenticado.",
    ],
    roles: [
      { role: "Auxiliar / Contador", access: "Carga, consulta y descarga de comprobantes" },
      { role: "Gerente / Administrador", access: "Auditoría de archivos y eliminación si procede" },
    ],
    tips: [
      "Suba los boletines de pago inmediatamente después de ser liquidados para mantener el soporte contable al día.",
    ],
  },

  "master-control": {
    title: "Control Maestro Fiscal",
    route: "/control-maestro",
    code: "MOD-04",
    summary:
      "Matriz de seguimiento tributario mensual. Coordina la elaboración, revisión, presentación y pago de obligaciones SAR.",
    purpose:
      "Es el motor operativo del despacho. Permite monitorear el avance de cada declaración (Ventas, DMC, Retenciones, etc.) para cada cliente en un mes específico, garantizando que ninguna cuenta quede sin presentar.",
    actions: [
      {
        name: "Generar Periodo",
        description:
          "Crea en lote todas las obligaciones tributarias de los clientes activos para el año y mes seleccionados.",
      },
      {
        name: "Selector de Periodo",
        description:
          "Permite navegar entre meses anteriores y futuros para revisar historiales de cumplimiento.",
      },
      {
        name: "Cambio de Estado",
        description:
          "Menú desplegable en cada celda para transicionar la obligación: Pendiente → En Proceso → Presentada → Pagada.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Apertura del mes fiscal",
        description:
          "Al inicio de cada mes, seleccione el periodo en curso y presione 'Generar periodo' si aún no existen tareas.",
      },
      {
        step: 2,
        title: "Elaboración de declaraciones",
        description:
          "A medida que se digitan compras y ventas, cambie el estado de la obligación a 'En Proceso'.",
      },
      {
        step: 3,
        title: "Presentación y obtención de boletín",
        description:
          "Una vez enviada al SAR, marque 'Presentada'. Cuando Darío ejecute el pago bancario, marque 'Pagada'.",
      },
    ],
    fields: [
      {
        field: "Cliente",
        description: "Contribuyente responsable de la obligación tributaria.",
      },
      {
        field: "Obligación Fiscal",
        description: "Tipo de impuesto (ej: Ventas 15%, Retención 1%, DMC, Retención 12.5%).",
      },
      {
        field: "Estado",
        description: "Pendiente (rojo), En Proceso (amarillo), Presentada (azul) o Pagada (verde).",
      },
      {
        field: "Fecha Límite",
        description: "Día calendario fatal para la presentación ante el SAR sin incurrir en multas.",
      },
    ],
    rules: [
      "El día 8 es el vencimiento fatal para la Declaración Mensual de Compras (DMC).",
      "El día 10 vencen las Declaraciones Informativas de Retención.",
      "El botón 'Generar periodo' omite duplicados si ya existen tareas para el cliente en ese mes.",
    ],
    roles: [
      { role: "Auxiliar Contable", access: "Elaboración de borradores y cambio a 'En Proceso'" },
      { role: "Contador", access: "Validación técnica y cambio a 'Presentada'" },
      { role: "Gerente / Administrador", access: "Aprobación final, registro de pago y cierre" },
    ],
    tips: [
      "Priorice siempre a los clientes marcados como 'Declara en Cero' durante los primeros 4 días del mes.",
    ],
  },

  checklist: {
    title: "Checklist de Expedientes",
    route: "/checklist",
    code: "MOD-05",
    summary:
      "Matriz de control de documentos obligatorios por cliente (Escritura, RTN, Contratos, Permisos de Operación).",
    purpose:
      "Asegura que el expediente de cada cliente cumpla con los estándares legales y normativos requeridos por la firma y por las autoridades gubernamentales de Honduras.",
    actions: [
      {
        name: "Casilla de Verificación",
        description:
          "Permite marcar o desmarcar la recepción y validación de cada documento obligatorio por expediente.",
      },
      {
        name: "Filtro por Cliente",
        description:
          "Enfoca la matriz en un cliente específico para auditoría de su expediente.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Revisión física del folder",
        description:
          "Extraiga la carpeta del cliente y verifique la presencia física del documento original o copia autenticada.",
      },
      {
        step: 2,
        title: "Marcar cumplimiento en el sistema",
        description:
          "Haga clic en la casilla correspondiente al requisito. El cambio se guarda automáticamente en la base de datos.",
      },
      {
        step: 3,
        title: "Auditoría de faltantes",
        description:
          "Identifique los casilleros en blanco para emitir recordatorios de entrega al cliente.",
      },
    ],
    fields: [
      {
        field: "Requisito Legal",
        description: "Nombre del documento reglamentario (ej: Escritura de Constitución, RTN de la empresa).",
      },
      {
        field: "Estado",
        description: "Cumplido (casilla marcada) o Pendiente de entrega.",
      },
    ],
    rules: [
      "El avance de este módulo impacta directamente en el porcentaje mostrado en el Panel Principal.",
    ],
    roles: [
      { role: "Auxiliar Contable / Contador", access: "Cotejo y marcado de documentos" },
      { role: "Gerente / Administrador", access: "Auditoría periódica de expedientes completos" },
    ],
    tips: [
      "No marque un ítem como cumplido si no tiene el documento físico en la gaveta o el PDF en la bóveda.",
    ],
  },

  informatives: {
    title: "Declaraciones Informativas (SAR)",
    route: "/informativas",
    code: "MOD-06",
    summary:
      "Control de retenciones en la fuente: Retención del 1%, 12.5%, retención sobre sueldos y dividendos.",
    purpose:
      "Monitorea el cumplimiento de las declaraciones informativas mensuales que deben presentarse a más tardar el día 10 de cada mes conforme al Código Tributario de Honduras.",
    actions: [
      {
        name: "+ Nueva Informativa",
        description:
          "Registra una tarea de retención informativa para un cliente en un periodo determinado.",
      },
      {
        name: "Marcar Presentada",
        description:
          "Actualiza el estado una vez generada y enviada la declaración en la plataforma del SAR.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Recopilar retenciones del mes",
        description:
          "Totalice las retenciones efectuadas a proveedores (1%) y a profesionales independientes (12.5%).",
      },
      {
        step: 2,
        title: "Elaborar la declaración",
        description:
          "Capture la información en el sistema del SAR y emita el formulario correspondiente.",
      },
      {
        step: 3,
        title: "Registrar en ContaGestión",
        description:
          "Marque la informativa como 'Presentada' e ingrese el número de formulario de recepción.",
      },
    ],
    fields: [
      {
        field: "Tipo de Retención",
        description: "1% Compras, 12.5% Servicios Profesionales, Sueldos y Salarios o Dividendos.",
      },
      {
        field: "Periodo",
        description: "Mes y año correspondiente a las operaciones declaradas.",
      },
    ],
    rules: [
      "Vencimiento impostergable: Día 10 de cada mes calendario.",
    ],
    roles: [
      { role: "Contador", access: "Elaboración técnica y validación" },
      { role: "Gerente / Administrador", access: "Aprobación y supervisión de envíos" },
    ],
    tips: [
      "Valide que los proveedores retenidos cuenten con RTN válido antes de emitir la declaración.",
    ],
  },

  dmc: {
    title: "Checklist DMC (Declaración Mensual de Compras)",
    route: "/dmc",
    code: "MOD-07",
    summary:
      "Módulo especializado para la validación de compras, CAI y rangos autorizados por el SAR antes del día 8 de cada mes.",
    purpose:
      "La Declaración Mensual de Compras es una de las obligaciones más críticas y con multas automáticas más severas del SAR. Este módulo coordina la revisión previa de facturas de compras para clientes clave.",
    actions: [
      {
        name: "+ Nueva Verificación DMC",
        description:
          "Abre el formulario para registrar el estado de revisión de compras de un cliente.",
      },
      {
        name: "Validar Plantilla",
        description:
          "Confirma que la plantilla Excel de compras contiene RTN válidos, CAI vigente y montos conciliados.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Consolidar facturas de compra",
        description:
          "Reúna las facturas recolectadas en la visita de Quimistán y compras locales de los clientes.",
      },
      {
        step: 2,
        title: "Validar consistencia de CAI",
        description:
          "Compruebe que el Código de Autorización de Impresión (CAI) no esté vencido ni exceda el rango.",
      },
      {
        step: 3,
        title: "Cierre previo al día 8",
        description:
          "Finalice la revisión a más tardar el día 7 para realizar la transmisión al SAR dentro del plazo legal.",
      },
    ],
    fields: [
      {
        field: "Cliente",
        description: "Empresa sujeta a la obligación de presentar DMC.",
      },
      {
        field: "Facturas Revisadas",
        description: "Cantidad de comprobantes fiscales auditados en el periodo.",
      },
      {
        field: "Estado DMC",
        description: "En Revisión, Validado o Transmitido al SAR.",
      },
    ],
    rules: [
      "Plazo fatal SAR: Día 8 del mes calendario.",
      "Toda factura incluida en la DMC debe tener CAI vigente a la fecha de emisión.",
    ],
    roles: [
      { role: "Auxiliar Contable / Contador", access: "Digitación, cotejo y validación" },
      { role: "Gerente de Operaciones", access: "Supervisión de cumplimiento oportuno" },
    ],
    tips: [
      "Avance con la DMC de clientes con declaración en cero durante los primeros 3 días del mes.",
    ],
  },

  collections: {
    title: "Cobros y Caja",
    route: "/cobros",
    code: "MOD-08",
    summary:
      "Control de facturación por honorarios contables del despacho, asignación de cobradores físicos y arqueo de caja.",
    purpose:
      "Administra el flujo financiero del despacho contable: emisión de recibos mensuales por servicios, control de cobradores en ruta (ej: Brayan en Santa Bárbara) y registro de pagos bancarios.",
    actions: [
      {
        name: "+ Nuevo Cobro",
        description:
          "Registra un nuevo recibo de cobro asignado a un cliente con su monto y fecha estimada.",
      },
      {
        name: "Marcar Cobrado",
        description:
          "Registra la liquidación efectiva del pago y actualiza el saldo de la cuenta por cobrar.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Emisión de recibos de honorarios",
        description:
          "Entre los días 12 y 15 del mes, emita los recibos correspondientes a los servicios contables del periodo.",
      },
      {
        step: 2,
        title: "Asignación de ruta de cobranza",
        description:
          "Asigne los cobros físicos al gestor correspondiente para visitas en campo.",
      },
      {
        step: 3,
        title: "Liquidación y arqueo",
        description:
          "Al recibir el dinero o la transferencia bancaria, marque el cobro como 'Completado'.",
      },
    ],
    fields: [
      {
        field: "Monto (HNL)",
        description: "Valor en Lempiras hondureños a cobrar por honorarios profesionales.",
      },
      {
        field: "Cobrador Asignado",
        description: "Colaborador encargado de la gestión de cobro.",
      },
      {
        field: "Estado del Cobro",
        description: "Pendiente, En Ruta o Cobrado.",
      },
    ],
    rules: [
      "Los cobros físicos deben liquidarse contra recibo foliado.",
    ],
    roles: [
      { role: "Auxiliar Contable", access: "Emisión de recibos y registro de abonos" },
      { role: "Gerente / Administrador", access: "Auditoría de caja, comisiones y conciliación bancaria" },
    ],
    tips: [
      "Emita recordatorios amables de pago por WhatsApp antes de enviar al cobrador a la ruta.",
    ],
  },

  "quimistan-visits": {
    title: "Visitas Quimistán",
    route: "/visitas-quimistan",
    code: "MOD-09",
    summary:
      "Hoja de ruta logística para la recolección física mensual de facturas a clientes de Quimistán el día 5 de cada mes.",
    purpose:
      "Organiza el viaje presencial de recolección de documentos. Permite planificar llamadas previas (días 3 y 4), la ruta de visita del día 5 y el checklist de carpetas que deben trasladarse en la gira.",
    actions: [
      {
        name: "+ Programar Visita",
        description:
          "Agrega un cliente a la hoja de ruta de la gira de recolección de Quimistán.",
      },
      {
        name: "Registrar Novedad",
        description:
          "Anota si el cliente entregó facturas completas, parciales o si hubo reprogramación.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Notificación previa (Días 3 y 4)",
        description:
          "Contacte a los clientes vía WhatsApp confirmando el horario de paso del equipo contable.",
      },
      {
        step: 2,
        title: "Gira presencial (Día 5)",
        description:
          "Visite a los clientes de la ruta, recoja facturas de compras y ventas, y firme el acuse de recibo.",
      },
      {
        step: 3,
        title: "Entrega en oficina (Día 6)",
        description:
          "Entregue los paquetes de facturas al auxiliar contable para su inmediata digitación en el sistema.",
      },
    ],
    fields: [
      {
        field: "Cliente Quimistán",
        description: "Comercio o empresa ubicado en el municipio de Quimistán, Santa Bárbara.",
      },
      {
        field: "Estado de Notificación",
        description: "Notificado, Confirmado o No Localizado.",
      },
      {
        field: "Documentos Recibidos",
        description: "Compras, Ventas, Retenciones o Ninguno.",
      },
    ],
    rules: [
      "La visita presencial a Quimistán está fijada invariablemente en el día 5 de cada mes.",
    ],
    roles: [
      { role: "Asistente / Auxiliar", access: "Registro de notificaciones y novedades de campo" },
      { role: "Gerente / Administrador", access: "Planificación de rutas y autorización de gastos de viaje" },
    ],
    tips: [
      "Lleve siempre consigo carpetas de repuesto y hojas de acuse de recibo foliadas.",
    ],
  },

  accounting: {
    title: "Contabilidad y Libros Oficiales",
    route: "/contabilidad",
    code: "MOD-10",
    summary:
      "Control de posteo contable, digitación en hojas de trabajo, actualización de libros legales y estados financieros.",
    purpose:
      "Supervisa la etapa final del ciclo contable mensual. Una vez presentadas las declaraciones del SAR, se procede al registro formal en los libros contables y a la emisión de balances para los directores de las empresas.",
    actions: [
      {
        name: "+ Nuevo Registro Contable",
        description:
          "Registra el estado de posteo de un cliente en un periodo contable específico.",
      },
      {
        name: "Cerrar Periodo Contable",
        description:
          "Marca el mes contable como finalizado tras conciliar cuentas bancarias y libros oficiales.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Posteo de resúmenes (Días 11 al 15)",
        description:
          "Digite las transacciones de ventas y compras en el software contable de cada empresa.",
      },
      {
        step: 2,
        title: "Conciliación bancaria",
        description:
          "Coteje los extractos de cuentas bancarias contra los pagos de impuestos y cobros registrados.",
      },
      {
        step: 3,
        title: "Emisión de Estados Financieros (Días 21 al 30)",
        description:
          "Genere el Balance General y Estado de Resultados para la entrega a los socios de la empresa.",
      },
    ],
    fields: [
      {
        field: "Sistema Contable",
        description: "Software utilizado por el cliente (ej: QuickBooks, Excel, Sistema Local).",
      },
      {
        field: "Libros Legales",
        description: "Estado de Diario, Mayor y Balances registrados.",
      },
    ],
    rules: [
      "Los estados financieros deben ser visados por el Contador Colegiado responsable de la firma.",
    ],
    roles: [
      { role: "Contador", access: "Elaboración de estados financieros y cierre de libros" },
      { role: "Gerente / Administrador", access: "Aprobación y entrega final a clientes" },
    ],
    tips: [
      "Realice copias de seguridad de las bases de datos contables antes de cerrar el ejercicio.",
    ],
  },

  calendar: {
    title: "Calendario Fiscal de Vencimientos",
    route: "/calendario",
    code: "MOD-11",
    summary:
      "Planificador mensual interactivo que mapea todas las obligaciones tributarias y tareas operativas por fecha.",
    purpose:
      "Ofrece una perspectiva visual temporal de todo el despacho. Permite anticipar cuellos de botella en días críticos (días 5, 8 y 10) y distribuir equitativamente la carga de trabajo entre el equipo contable.",
    actions: [
      {
        name: "Navegación Mes Anterior / Siguiente",
        description:
          "Permite explorar el calendario de meses pasados o planificar vencimientos futuros.",
      },
      {
        name: "Filtro de Estado",
        description:
          "Muestra únicamente tareas 'Pendientes', 'En Proceso' o 'Completadas'.",
      },
      {
        name: "Filtro por Cliente",
        description:
          "Aísla las fechas de vencimiento de un contribuyente específico en la cuadrícula.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Consultar la semana en curso",
        description:
          "Revise los días que contienen tareas marcadas para programar la jornada de trabajo.",
      },
      {
        step: 2,
        title: "Inspeccionar una fecha específica",
        description:
          "Haga clic en un día del calendario para desplegar la lista detallada de obligaciones fiscales programadas.",
      },
      {
        step: 3,
        title: "Marcar tareas como completadas",
        description:
          "Haga clic en el estado de la tarea directamente desde el calendario para actualizar su avance.",
      },
    ],
    fields: [
      {
        field: "Día Calendario",
        description: "Fecha límite de cumplimiento legal.",
      },
      {
        field: "Obligación",
        description: "Nombre del impuesto o tarea operativa.",
      },
    ],
    rules: [
      "Las fechas de vencimiento se configuran automáticamente según el catálogo de obligaciones del SAR.",
    ],
    roles: [
      { role: "Todos los roles", access: "Consulta y seguimiento de plazos tributarios" },
    ],
    tips: [
      "Revise el calendario los días viernes para dejar preparadas las declaraciones del inicio de la siguiente semana.",
    ],
  },

  staff: {
    title: "Directorio de Personal y Roles",
    route: "/personal",
    code: "MOD-12",
    summary:
      "Gestión de colaboradores de la firma contable, correos corporativos, roles operativos y estado de actividad.",
    purpose:
      "Administra el equipo de trabajo del despacho y define qué funciones puede desempeñar cada integrante (segregación de funciones RBAC).",
    actions: [
      {
        name: "+ Nuevo Colaborador",
        description:
          "Registra un nuevo usuario en la base de datos y le asigna su rol dentro de la firma contable.",
      },
      {
        name: "Cambiar Estado (Activo / Inactivo)",
        description:
          "Permite desactivar el acceso de un colaborador que ha dejado de pertenecer a la empresa.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Creación de usuario",
        description:
          "Presione '+ Nuevo Colaborador', ingrese su nombre completo, correo institucional y contraseña temporal.",
      },
      {
        step: 2,
        title: "Asignación de rol",
        description:
          "Seleccione el puesto exacto: Asistente Operativo, Auxiliar Contable, Contador, Gerente o Administrador.",
      },
    ],
    fields: [
      {
        field: "Nombre",
        description: "Nombre del colaborador y sus iniciales en el avatar.",
      },
      {
        field: "Correo Electrónico",
        description: "Cuenta de acceso utilizada para iniciar sesión en el sistema.",
      },
      {
        field: "Rol",
        description: "Nivel de autorización y permisos dentro del sistema.",
      },
      {
        field: "Estado",
        description: "Activo (con acceso al sistema) o Inactivo.",
      },
    ],
    rules: [
      "Solo los roles Gerente de Operaciones y Administrador pueden visualizar este módulo.",
    ],
    roles: [
      { role: "Gerente de Operaciones", access: "Visualización de colaboradores y asignaciones" },
      { role: "Administrador General", access: "Creación, edición y administración de roles" },
    ],
    tips: [
      "Asigne a cada nuevo colaborador el rol mínimo indispensable para sus funciones diarias.",
    ],
  },

  audit: {
    title: "Bitácora de Auditoría del Sistema",
    route: "/auditoria",
    code: "MOD-13",
    summary:
      "Registro inmutable y cronológico de todas las acciones ejecutadas por los usuarios en la base de datos.",
    purpose:
      "Garantiza la trazabilidad forense de las operaciones contables. Permite verificar quién creó un cliente, quién modificó el estado de una declaración fiscal o quién alteró un expediente, con fecha y hora exacta.",
    actions: [
      {
        name: "Filtro por Tabla",
        description:
          "Permite inspeccionar eventos ocurridos en tablas específicas (ej: clients, files, deadline_tasks).",
      },
      {
        name: "Filtro por Usuario",
        description:
          "Aísla las acciones realizadas por un colaborador en particular para auditoría interna.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Identificar evento sospechoso o duda",
        description:
          "Si un dato fue modificado imprevistamente, acceda a Auditoría y busque por la fecha aproximada.",
      },
      {
        step: 2,
        title: "Inspeccionar el registro",
        description:
          "Consulte la columna 'Detalle' para ver los valores anteriores y posteriores del registro.",
      },
    ],
    fields: [
      {
        field: "Usuario",
        description: "Correo del colaborador que ejecutó la operación.",
      },
      {
        field: "Acción",
        description: "Tipo de operación: INSERT (creación), UPDATE (modificación) o DELETE (eliminación).",
      },
      {
        field: "Entidad / Tabla",
        description: "Objeto de datos afectado en la base de datos.",
      },
      {
        field: "Fecha y Hora",
        description: "Timestamp exacto generado por el servidor PostgreSQL.",
      },
    ],
    rules: [
      "Los registros de auditoría son de solo lectura; ningún usuario puede alterarlos ni eliminarlos.",
    ],
    roles: [
      { role: "Gerente de Operaciones", access: "Inspección de eventos de supervisión" },
      { role: "Administrador General", access: "Auditoría forense completa" },
    ],
    tips: [
      "Revise la bitácora al final de cada cierre mensual para verificar que las aprobaciones fueron realizadas por los responsables autorizados.",
    ],
  },

  settings: {
    title: "Configuración Maestra del Sistema",
    route: "/configuracion",
    code: "MOD-14",
    summary:
      "Parámetros globales: catálogo de obligaciones fiscales SAR, tipos de documentos legales y perfil del administrador.",
    purpose:
      "Módulo exclusivo para el Administrador General de la firma. Permite adaptar el sistema a reformas tributarias, crear nuevos impuestos, ajustar días de vencimiento legal y gestionar contraseñas.",
    actions: [
      {
        name: "+ Nueva Obligación Fiscal",
        description:
          "Agrega un nuevo impuesto o declaración al catálogo del despacho (ej: Impuesto sobre la Renta anual, Precios de Transferencia).",
      },
      {
        name: "+ Nuevo Tipo de Documento",
        description:
          "Registra una nueva categoría de archivo admisible en la bóveda digital y en el checklist de expedientes.",
      },
      {
        name: "Actualizar Contraseña",
        description:
          "Permite cambiar de forma segura la clave de acceso del usuario administrador actual.",
      },
    ],
    steps: [
      {
        step: 1,
        title: "Creación de obligación",
        description:
          "En la pestaña 'Obligaciones', presione '+ Nueva Obligación'. Ingrese el nombre oficial, código interno y día del mes en que vence ante el SAR.",
      },
      {
        step: 2,
        title: "Configurar tipos de documento",
        description:
          "En la pestaña 'Documentos', defina los requisitos que los clientes deben entregar para sus carpetas legales.",
      },
      {
        step: 3,
        title: "Seguridad de la cuenta",
        description:
          "En la pestaña 'Mi Perfil', actualice su contraseña periódicamente para proteger la información del despacho.",
      },
    ],
    fields: [
      {
        field: "Código de Obligación",
        description: "Identificador alfanumérico único para el impuesto (ej: ISV, DMC, RET-1).",
      },
      {
        field: "Día de Vencimiento",
        description: "Día del mes calendario en que la obligación vence fatalmente ante el SAR.",
      },
      {
        field: "Periodicidad",
        description: "Mensual, Trimestral o Anual.",
      },
    ],
    rules: [
      "Módulo restringido estrictamente al rol Administrador General.",
      "Las modificaciones en los catálogos aplican para los periodos fiscales generados a partir de ese momento.",
    ],
    roles: [
      { role: "Administrador General", access: "Control total de parametrización" },
      { role: "Otros roles", access: "Acceso denegado (bloqueado)" },
    ],
    tips: [
      "Si el SAR modifica el calendario tributario para feriados nacionales, ajuste aquí el día de vencimiento de la obligación.",
    ],
  },
}

export function getHelpForRoute(pathname: string): ModuleHelpItem {
  if (pathname === "/" || pathname === "") return MODULES_HELP.dashboard
  if (pathname.startsWith("/clientes")) return MODULES_HELP.clients
  if (pathname.startsWith("/expedientes")) return MODULES_HELP.files
  if (pathname.startsWith("/documentos")) return MODULES_HELP.documents
  if (pathname.startsWith("/control-maestro")) return MODULES_HELP["master-control"]
  if (pathname.startsWith("/checklist")) return MODULES_HELP.checklist
  if (pathname.startsWith("/informativas")) return MODULES_HELP.informatives
  if (pathname.startsWith("/dmc")) return MODULES_HELP.dmc
  if (pathname.startsWith("/cobros")) return MODULES_HELP.collections
  if (pathname.startsWith("/visitas-quimistan")) return MODULES_HELP["quimistan-visits"]
  if (pathname.startsWith("/contabilidad")) return MODULES_HELP.accounting
  if (pathname.startsWith("/calendario")) return MODULES_HELP.calendar
  if (pathname.startsWith("/personal")) return MODULES_HELP.staff
  if (pathname.startsWith("/auditoria")) return MODULES_HELP.audit
  if (pathname.startsWith("/configuracion")) return MODULES_HELP.settings

  return MODULES_HELP.dashboard
}
