import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'feed360';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
      return NextResponse.json(
        { error: 'Cloudinary no está configurado. Verifica las variables de entorno.' },
        { status: 500 }
      );
    }

    const fileBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 800, crop: 'limit', quality: 'auto:low' },
        { fetch_format: 'auto' },
      ],
    });

    return NextResponse.json({ url: result.secure_url, public_id: result.public_id });
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}