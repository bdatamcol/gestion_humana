import nodemailer from "nodemailer";
import { createAdminSupabaseClient } from "@/lib/supabase-server";
import { formatLocalDate } from "@/lib/date-utils";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://gestionhumana360.co";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character] || character);
}

function crearTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null;
  }
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
  });
}

function plantilla(titulo: string, cuerpo: string, ruta: string, textoBoton: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#30231f">
    <h2 style="color:#441404">${escapeHtml(titulo)}</h2>
    ${cuerpo}
    <p><a href="${SITE_URL}${ruta}" style="display:inline-block;background:#441404;color:white;padding:12px 18px;border-radius:6px;text-decoration:none">${escapeHtml(textoBoton)}</a></p>
    <p style="color:#6b625f;font-size:12px">Este mensaje fue generado automáticamente por Gestión Humana 360. Por favor, no responda a este correo.</p>
  </div>`;
}

async function enviar(destinatarios: string[], subject: string, html: string): Promise<void> {
  const transporter = crearTransporter();
  if (!transporter) {
    console.warn("SMTP no configurado: se omite el envío de correo de certificado de ingresos");
    return;
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  for (const destinatario of destinatarios) {
    try {
      await transporter.sendMail({ from, to: destinatario, subject, html });
    } catch (error) {
      console.error(`Error enviando correo de certificado de ingresos a ${destinatario}:`, error);
    }
  }
  transporter.close();
}

/** Correos configurados en `configuracion_sistema.correo_notificaciones`. */
async function obtenerCorreosNotificaciones(): Promise<string[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("configuracion_sistema")
    .select("valor")
    .eq("clave", "correo_notificaciones")
    .single();

  if (error || !data?.valor) {
    console.error("No se pudo obtener el correo de notificaciones configurado:", error);
    return [];
  }

  return String(data.valor)
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0 && isValidEmail(email));
}

export async function enviarCorreoNuevaSolicitudCertificadoIngresos(input: {
  colaborador: string;
  cedula: string | null;
  anioGravable: number;
  observaciones: string | null;
  fechaSolicitud: string;
}): Promise<void> {
  const destinatarios = await obtenerCorreosNotificaciones();
  if (destinatarios.length === 0) return;

  const fecha = formatLocalDate(input.fechaSolicitud, "es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const cuerpo = `
    <p>El colaborador <strong>${escapeHtml(input.colaborador)}</strong> ha solicitado un certificado de ingresos y retenciones.</p>
    <p>
      <strong>Documento:</strong> ${escapeHtml(input.cedula || "No disponible")}<br>
      <strong>Año gravable:</strong> ${input.anioGravable}<br>
      <strong>Fecha de solicitud:</strong> ${escapeHtml(fecha)}
      ${input.observaciones ? `<br><strong>Observaciones:</strong> ${escapeHtml(input.observaciones)}` : ""}
    </p>
    <p>La solicitud quedó en estado <strong>Pendiente</strong> a la espera de que se adjunte el certificado en PDF.</p>`;

  await enviar(
    destinatarios,
    `Nueva solicitud de certificado de ingresos y retenciones - ${input.colaborador}`,
    plantilla(
      "Nueva solicitud de certificado de ingresos y retenciones",
      cuerpo,
      "/administracion/solicitudes/certificado-ingresos",
      "Gestionar solicitud",
    ),
  );
}

export async function enviarCorreoCertificadoIngresosListo(input: {
  destinatario: string | null;
  colaborador: string;
  anioGravable: number;
}): Promise<void> {
  if (!input.destinatario || !isValidEmail(input.destinatario)) return;

  const cuerpo = `
    <p>Hola ${escapeHtml(input.colaborador)},</p>
    <p>Tu certificado de ingresos y retenciones del año gravable <strong>${input.anioGravable}</strong> ya está disponible.</p>
    <p>Ingresa a la plataforma para visualizarlo o descargarlo.</p>`;

  await enviar(
    [input.destinatario],
    `Tu certificado de ingresos y retenciones ${input.anioGravable} está listo`,
    plantilla(
      "Certificado de ingresos y retenciones listo",
      cuerpo,
      "/perfil/solicitudes/certificado-ingresos",
      "Ver certificado",
    ),
  );
}
