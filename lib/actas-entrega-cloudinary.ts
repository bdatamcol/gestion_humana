import { Readable } from "stream";
import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function ensureCloudinaryConfig() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary no está configurado completamente");
  }
}

export async function uploadActaImage(
  buffer: Buffer,
  options: { folder: string; publicId: string; evidence?: boolean },
): Promise<UploadApiResponse> {
  ensureCloudinaryConfig();
  const uploadOptions: UploadApiOptions = {
    folder: `actas-entrega/${options.folder}`,
    public_id: options.publicId,
    resource_type: "image",
    type: "authenticated",
    overwrite: false,
  };

  if (options.evidence) {
    uploadOptions.transformation = [
      { width: 1600, height: 1600, crop: "limit", quality: "auto:good", fetch_format: "auto" },
    ];
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) reject(error);
      else if (result) resolve(result);
      else reject(new Error("Cloudinary no devolvió información del archivo"));
    });
    Readable.from(buffer).pipe(stream);
  });
}

export function getActaImageUrl(publicId: string): string {
  ensureCloudinaryConfig();
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "authenticated",
    resource_type: "image",
  });
}

export async function deleteActaImage(publicId: string): Promise<void> {
  ensureCloudinaryConfig();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
}
