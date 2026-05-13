import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(
  file: File | string,
  folder: string = 'feed360'
): Promise<string> {
  let buffer: Buffer;

  if (file instanceof File) {
    buffer = Buffer.from(await file.arrayBuffer());
  } else if (typeof file === 'string') {
    buffer = Buffer.from(file, 'base64');
  } else {
    throw new Error('Invalid file type');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        type: 'upload',
        flags: 'raw_upload',
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('No result from Cloudinary'));
        }
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getPublicIdFromUrl(url: string): string {
  const parts = url.split('/');
  const fileWithExt = parts[parts.length - 1];
  const fileName = fileWithExt.split('.')[0];
  const folderParts = parts.slice(-2, -1);
  return `${folderParts[0]}/${fileName}`;
}

export default cloudinary;