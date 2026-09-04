import { Readable } from "stream";
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CARPETA_BASE = "certificados-ingresos";

function ensureCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary no está configurado completamente");
  }
}

/**
 * Sube el PDF del certificado de ingresos y retenciones a Cloudinary.
 * Se usa `resource_type: raw` para que el archivo se sirva tal cual desde el CDN.
 */
export async function uploadCertificadoIngresosPdf(
  buffer: Buffer,
  options: { solicitudId: string; anioGravable: number },
): Promise<UploadApiResponse> {
  ensureCloudinaryConfig();

  const uploadOptions: UploadApiOptions = {
    folder: `${CARPETA_BASE}/${options.anioGravable}`,
    public_id: `${options.solicitudId}.pdf`,
    resource_type: "raw",
    type: "upload",
    overwrite: true,
    invalidate: true,
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error("Cloudinary no devolvió información del archivo"));
    });
    Readable.from(buffer).pipe(stream);
  });
}

export async function deleteCertificadoIngresosPdf(publicId: string): Promise<void> {
  ensureCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    type: "upload",
    invalidate: true,
  });
}

/** Obtiene un PDF mediante una URL privada firmada cuando Cloudinary bloquea su entrega pública. */
export async function descargarCertificadoIngresosPdf(publicId: string): Promise<Buffer> {
  ensureCloudinaryConfig();
  const url = cloudinary.utils.private_download_url(publicId, "pdf", {
    resource_type: "raw",
    type: "upload",
    attachment: false,
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cloudinary rechazó la descarga (${response.status})`);
  }
  return Buffer.from(await response.arrayBuffer());
}
