/**
 * Tipos y utilidades compartidas del módulo "Certificado de ingresos y retenciones".
 *
 * Este archivo NO importa dependencias de servidor para poder usarse tanto
 * desde componentes de cliente como desde las rutas API. La lógica que
 * requiere Node (validación binaria, optimización del PDF y autenticación)
 * vive en `lib/certificado-ingresos-server.ts`.
 */

export const CERTIFICADO_INGRESOS_ESTADOS = [
  "pendiente",
  "certificado_cargado",
  "aprobado",
  "rechazado",
] as const;

export type CertificadoIngresosEstado = (typeof CERTIFICADO_INGRESOS_ESTADOS)[number];

export const CERTIFICADO_INGRESOS_NOTIFICACION_TIPO = "certificado_ingresos";

export const CERTIFICADO_INGRESOS_PDF_MAX_BYTES = 20 * 1024 * 1024;

export const CERTIFICADO_INGRESOS_ANIO_MINIMO = 2000;

/**
 * El certificado de ingresos y retenciones solo puede expedirse por año
 * gravable vencido, por lo que el año en curso nunca es seleccionable.
 */
export const CERTIFICADO_INGRESOS_NOTA_ANIO_VENCIDO =
  "El certificado de ingresos y retenciones solo puede generarse por año gravable vencido. El año en curso no está disponible.";

export interface CertificadoIngresosUsuario {
  colaborador: string;
  cedula: string | null;
  correo_electronico: string | null;
}

export interface SolicitudCertificadoIngresos {
  id: string;
  usuario_id: string;
  admin_id: string | null;
  estado: CertificadoIngresosEstado;
  anio_gravable: number;
  observaciones: string | null;
  fecha_solicitud: string;
  fecha_certificado: string | null;
  cargado_por: string | null;
  fecha_carga: string | null;
  revisado_por: string | null;
  fecha_revision: string | null;
  motivo_rechazo: string | null;
  pdf_url: string | null;
  pdf_public_id: string | null;
  pdf_nombre_original: string | null;
  pdf_tamano: number | null;
  usuario_nomina?: CertificadoIngresosUsuario | null;
}

/**
 * PostgREST devuelve las relaciones embebidas como objeto, pero el cliente sin
 * tipos generados las infiere como arreglo. Este helper normaliza ambos casos.
 */
export function usuarioDeSolicitud(valor: unknown): CertificadoIngresosUsuario | null {
  const relacion = Array.isArray(valor) ? valor[0] : valor
  return (relacion as CertificadoIngresosUsuario | undefined) ?? null
}

/** Último año gravable vencido: siempre el anterior al año en curso. */
export function ultimoAnioGravableVencido(): number {
  return new Date().getFullYear() - 1;
}

/**
 * Años gravables disponibles para solicitar, del más reciente al más antiguo.
 * Solo incluye años vencidos; el año en curso queda excluido.
 */
export function aniosGravablesDisponibles(cantidad = 5): number[] {
  const ultimoAnio = ultimoAnioGravableVencido();
  return Array.from({ length: cantidad }, (_, indice) => ultimoAnio - indice).filter(
    (anio) => anio >= CERTIFICADO_INGRESOS_ANIO_MINIMO,
  );
}

export function esAnioGravableValido(anio: unknown): anio is number {
  return (
    typeof anio === "number" &&
    Number.isInteger(anio) &&
    anio >= CERTIFICADO_INGRESOS_ANIO_MINIMO &&
    anio <= ultimoAnioGravableVencido()
  );
}

export function etiquetaEstadoCertificadoIngresos(estado: CertificadoIngresosEstado | string): string {
  switch (estado) {
    case "certificado_cargado":
      return "Documento anexado";
    case "aprobado":
      return "Aprobado";
    case "rechazado":
      return "Rechazado";
    default:
      return "Pendiente";
  }
}

export function nombreArchivoCertificado(anioGravable: number): string {
  return `certificado-ingresos-retenciones-${anioGravable}`;
}

/**
 * Añade el flag `fl_attachment` a la URL de Cloudinary para forzar la descarga
 * del PDF con un nombre legible en lugar de abrirlo en el visor del navegador.
 */
export function getCertificadoIngresosDownloadUrl(secureUrl: string, nombreArchivo: string): string {
  const marcador = "/upload/";
  const posicion = secureUrl.indexOf(marcador);
  if (posicion === -1) return secureUrl;

  const nombreLimpio =
    nombreArchivo
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "certificado-ingresos-retenciones";

  return `${secureUrl.slice(0, posicion + marcador.length)}fl_attachment:${nombreLimpio}/${secureUrl.slice(
    posicion + marcador.length,
  )}`;
}

export function formatearTamanoArchivo(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
