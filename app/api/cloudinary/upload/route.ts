import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const IMAGE_MIME_ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAX_BYTES = 20 * 1024 * 1024;

function isPdf(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  const name = (file.name || '').toLowerCase();
  return name.endsWith('.pdf');
}

function isImage(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(name);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'capacitaciones';

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return NextResponse.json(
        { error: 'Cloudinary no está configurado. Verifica las variables de entorno.' },
        { status: 500 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');

    // ---------- Documentos (PDF) ----------
    if (isPdf(file)) {
      if (file.size > PDF_MAX_BYTES) {
        return NextResponse.json(
          { error: `El PDF debe ser menor a ${PDF_MAX_BYTES / (1024 * 1024)} MB` },
          { status: 400 }
        );
      }

      const dataUri = `data:${file.type || 'application/pdf'};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'raw',
        format: 'pdf',
        // Genera una versión con densidad baja (150 dpi) de forma síncrona.
        eager: [{ density: 150, format: 'pdf' }],
        eager_async: false,
      });

      const eagerUrl = (result.eager && result.eager[0]?.secure_url) || result.secure_url;
      const eagerPublicId = (result.eager && result.eager[0]?.public_id) || result.public_id;

      return NextResponse.json({
        url: eagerUrl,
        public_id: eagerPublicId,
        tipo: 'documento',
      });
    }

    // ---------- Imágenes ----------
    if (isImage(file)) {
      if (file.size > IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: `La imagen debe ser menor a ${IMAGE_MAX_BYTES / (1024 * 1024)} MB` },
          { status: 400 }
        );
      }

      if (!IMAGE_MIME_ALLOWED.has(file.type)) {
        return NextResponse.json(
          { error: `Tipo de imagen no permitido: ${file.type}. Usa JPG, PNG, WEBP o GIF.` },
          { status: 400 }
        );
      }

      const dataUri = `data:${file.type};base64,${base64}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 1080, crop: 'limit', quality: 80 },
          { fetch_format: 'webp' },
        ],
      });

      return NextResponse.json({
        url: result.secure_url,
        public_id: result.public_id,
        tipo: 'imagen',
      });
    }

    // ---------- Tipo no soportado ----------
    return NextResponse.json(
      {
        error: `Tipo de archivo no permitido: ${file.type || 'desconocido'}. Solo se aceptan imágenes (JPG, PNG, WEBP, GIF) o PDF.`,
      },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}