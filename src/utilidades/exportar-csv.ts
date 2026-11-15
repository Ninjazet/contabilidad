/**
 * ============================================================================
 * EXPORTACIÓN DE TABLAS A FORMATO CSV (COMPATIBLE CON MICROSOFT EXCEL)
 * ============================================================================
 */

export function descargarArchivoCsv(
  nombreArchivo: string,
  encabezados: string[],
  filasDatos: (string | number | boolean | null | undefined)[][]
): void {
  const todasLasFilas = [encabezados, ...filasDatos]
  const contenidoCsv = todasLasFilas
    .map((fila) =>
      fila
        .map((valor) => {
          const texto = valor === null || valor === undefined ? "" : String(valor)
          return `"${texto.replaceAll('"', '""')}"`
        })
        .join(",")
    )
    .join("\n")

  const archivoBlob = new Blob(["\uFEFF" + contenidoCsv], {
    type: "text/csv;charset=utf-8",
  })
  const enlaceTemporal = URL.createObjectURL(archivoBlob)
  const elementoEnlace = document.createElement("a")
  elementoEnlace.href = enlaceTemporal
  elementoEnlace.download = nombreArchivo.endsWith(".csv")
    ? nombreArchivo
    : `${nombreArchivo}.csv`
  elementoEnlace.click()
  URL.revokeObjectURL(enlaceTemporal)
}

// Alias de compatibilidad
export const downloadCsv = descargarArchivoCsv

