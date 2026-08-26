import * as nodemailer from "nodemailer";
import { createAdminSupabaseClient } from "@/lib/supabase-server";

interface ActaEmailInput {
  actaId: string;
  tipo: "asignada" | "aceptada" | "rechazada";
  destinatario: string | null;
  nombreDestinatario: string;
  nombreActor: string;
  numeroActa: string;
  mensaje: string;
  ruta: string;
}

export async function sendActaEmail(input: ActaEmailInput) {
  if (!input.destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.destinatario)) return;
  const admin = createAdminSupabaseClient();
  let estado = "fallido";
  let messageId: string | null = null;
  let errorMessage: string | null = null;

  try {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      throw new Error("Configuración SMTP incompleta");
    }
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gestionhumana360.co";
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;",
    })[character] || character);
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: input.destinatario,
      subject: `Acta de entrega ${input.numeroActa}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#30231f">
        <h2 style="color:#441404">Actas de entrega</h2>
        <p>Hola ${escapeHtml(input.nombreDestinatario)},</p>
        <p>${escapeHtml(input.mensaje)}</p>
        <p><strong>Acta:</strong> ${escapeHtml(input.numeroActa)}<br><strong>Usuario:</strong> ${escapeHtml(input.nombreActor)}</p>
        <p><a href="${siteUrl}${input.ruta}" style="display:inline-block;background:#441404;color:white;padding:12px 18px;border-radius:6px;text-decoration:none">Revisar acta</a></p>
        <p style="color:#6b625f;font-size:12px">Este mensaje fue generado automáticamente por Gestión Humana 360.</p>
      </div>`,
    });
    estado = "enviado";
    messageId = result.messageId;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error enviando correo de acta:", error);
  }

  await admin.from("actas_entrega_correos").insert({
    acta_id: input.actaId,
    tipo: input.tipo,
    destinatario: input.destinatario,
    estado,
    message_id: messageId,
    error: errorMessage,
  });
}
