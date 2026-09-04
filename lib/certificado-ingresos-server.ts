import { NextRequest, NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { normRol } from "@/lib/roles";
import { CERTIFICADO_INGRESOS_PDF_MAX_BYTES } from "@/lib/certificado-ingresos";

export const CERTIFICADO_INGRESOS_SELECT = `
  id,
  usuario_id,
  admin_id,
  estado,
  anio_gravable,
  observaciones,
  fecha_solicitud,
  fecha_certificado,
  cargado_por,
  fecha_carga,
  revisado_por,
  fecha_revision,
  motivo_rechazo,
  pdf_url,
  pdf_public_id,
  pdf_nombre_original,
  pdf_tamano,
  usuario_nomina:usuario_id(colaborador, cedula, correo_electronico)
`;

export interface CertificadoIngresosContext {
  admin: ReturnType<typeof createAdminSupabaseClient>;
  authUserId: string;
  profile: {
    auth_user_id: string;
    colaborador: string;
    cedula: string | null;
    correo_electronico: string | null;
    rol: string | null;
    estado: string | null;
  };
  isAdmin: boolean;
  isCertificateManager: boolean;
}

/**
 * Valida el token Bearer de la petición y devuelve el contexto del usuario activo.
 * Sigue el mismo patrón que `requireActiveUser` de actas de entrega.
 */
export async function requireCertificadoIngresosUser(
  request: NextRequest,
): Promise<CertificadoIngresosContext | { error: NextResponse }> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.toLowerCase().startsWith("bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  }

  const admin = createAdminSupabaseClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: NextResponse.json({ error: "Sesión inválida" }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await admin
    .from("usuario_nomina")
    .select("auth_user_id, colaborador, cedula, correo_electronico, rol, estado")
    .eq("auth_user_id", authData.user.id)
    .single();

  if (profileError || !profile || profile.estado !== "activo") {
    return { error: NextResponse.json({ error: "Usuario inexistente o inactivo" }, { status: 403 }) };
  }

  const role = normRol(profile.rol);

  return {
    admin,
    authUserId: authData.user.id,
    profile: profile as CertificadoIngresosContext["profile"],
    isAdmin: ["administrador", "moderador"].includes(role),
    isCertificateManager: role === "gestor_certificados",
  };
}

/**
 * Validación estricta: solo se aceptan archivos PDF.
 * Comprueba la extensión, el tipo MIME declarado y la firma binaria `%PDF-`.
 */
export function validarArchivoPdf(file: File, buffer: Buffer): string | null {
  const nombre = (file.name || "").toLowerCase().trim();
  if (!nombre.endsWith(".pdf")) {
    return "Solo se aceptan archivos con extensión .pdf";
  }
  if (file.type && file.type !== "application/pdf") {
    return `Tipo de archivo no permitido: ${file.type}. Solo se acepta application/pdf`;
  }
  if (buffer.length === 0) {
    return "El archivo está vacío";
  }
  if (buffer.length > CERTIFICADO_INGRESOS_PDF_MAX_BYTES) {
    return `El PDF debe ser menor a ${CERTIFICADO_INGRESOS_PDF_MAX_BYTES / (1024 * 1024)} MB`;
  }
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    return "El archivo no es un PDF válido";
  }
  return null;
}

export interface PdfOptimizadoResultado {
  buffer: Buffer;
  tamanoOriginal: number;
  tamanoFinal: number;
  optimizado: boolean;
}

/**
 * Optimiza el PDF antes de subirlo: elimina los metadatos del documento y lo
 * vuelve a serializar usando object streams comprimidos. Si el documento no se
 * puede procesar (por ejemplo, si está cifrado) o el resultado no es más
 * liviano, se conserva el archivo original.
 */
export async function optimizarPdf(buffer: Buffer): Promise<PdfOptimizadoResultado> {
  const tamanoOriginal = buffer.length;

  try {
    const documento = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    documento.setTitle("");
    documento.setAuthor("");
    documento.setSubject("");
    documento.setKeywords([]);
    documento.setProducer("");
    documento.setCreator("");

    const bytes = await documento.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });
    const optimizado = Buffer.from(bytes);

    if (optimizado.length > 0 && optimizado.length < tamanoOriginal) {
      return {
        buffer: optimizado,
        tamanoOriginal,
        tamanoFinal: optimizado.length,
        optimizado: true,
      };
    }
  } catch (error) {
    console.error("No fue posible optimizar el PDF, se usará el archivo original:", error);
  }

  return {
    buffer,
    tamanoOriginal,
    tamanoFinal: tamanoOriginal,
    optimizado: false,
  };
}
