import { NextRequest, NextResponse } from "next/server";
import { descargarCertificadoIngresosPdf } from "@/lib/certificado-ingresos-cloudinary";
import { requireCertificadoIngresosUser } from "@/lib/certificado-ingresos-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireCertificadoIngresosUser(request);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const { data: solicitud, error } = await ctx.admin
    .from("solicitudes_certificado_ingresos")
    .select("usuario_id, estado, pdf_public_id, pdf_nombre_original")
    .eq("id", id)
    .maybeSingle();

  if (error || !solicitud?.pdf_public_id) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const puedeVer = ctx.isAdmin || ctx.isCertificateManager ||
    (solicitud.usuario_id === ctx.authUserId && solicitud.estado === "aprobado");
  if (!puedeVer) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const pdf = await descargarCertificadoIngresosPdf(solicitud.pdf_public_id);
    const descargar = new URL(request.url).searchParams.get("descargar") === "1";
    const nombre = (solicitud.pdf_nombre_original || "certificado-ingresos.pdf")
      .replace(/[\r\n"]/g, "_")
      .slice(0, 255);

    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (downloadError) {
    console.error("Error al descargar el certificado desde Cloudinary:", downloadError);
    return NextResponse.json({ error: "No fue posible obtener el documento" }, { status: 502 });
  }
}
