import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  format?: string;
  resourceType: string;
  bytes?: number;
}

/**
 * Checks whether all required Cloudinary credentials are configured
 */
export function isCloudinaryConfigured(): boolean {
  return Boolean(
    config.cloudinaryCloudName &&
    config.cloudinaryApiKey &&
    config.cloudinaryApiSecret
  );
}

// Configure Cloudinary SDK instance
if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: config.cloudinaryCloudName,
    api_key: config.cloudinaryApiKey,
    api_secret: config.cloudinaryApiSecret,
    secure: true,
  });
}

/**
 * Safely removes a temporary local staging file
 */
export async function cleanupLocalFile(filePath: string): Promise<void> {
  try {
    if (filePath && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (err: any) {
    console.warn(`[CloudinaryService] Failed to remove temp file at ${filePath}:`, err.message);
  }
}

export const cloudinaryService = {
  /**
   * Upload an image to Cloudinary (folder: flopshow/images)
   */
  async uploadImage(
    filePath: string,
    originalName?: string
  ): Promise<CloudinaryUploadResult> {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        'Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.'
      );
    }

    const filenameWithoutExt = originalName
      ? path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_')
      : undefined;

    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
        folder: 'flopshow/images',
        resource_type: 'image',
        use_filename: Boolean(filenameWithoutExt),
        filename_override: filenameWithoutExt,
        unique_filename: true,
        overwrite: false,
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
      };
    } catch (err: any) {
      // Strip potential secret leakage
      const safeMsg = (err.message || 'Image upload failed').replace(
        new RegExp(config.cloudinaryApiSecret || '___impossible___', 'g'),
        '***'
      );
      throw new Error(`Cloudinary image upload failed: ${safeMsg}`);
    }
  },

  /**
   * Upload a video to Cloudinary using chunked upload (folder: flopshow/videos)
   */
  async uploadVideo(
    filePath: string,
    originalName?: string
  ): Promise<CloudinaryUploadResult> {
    if (!isCloudinaryConfigured()) {
      throw new Error(
        'Cloudinary credentials are not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.'
      );
    }

    const filenameWithoutExt = originalName
      ? path.parse(originalName).name.replace(/[^a-zA-Z0-9_-]/g, '_')
      : undefined;

    try {
      const result = (await cloudinary.uploader.upload_large(filePath, {
        folder: 'flopshow/videos',
        resource_type: 'video',
        chunk_size: 6000000, // 6MB chunk size for reliable streaming upload
        use_filename: Boolean(filenameWithoutExt),
        filename_override: filenameWithoutExt,
        unique_filename: true,
        overwrite: false,
      })) as UploadApiResponse;

      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        resourceType: result.resource_type,
        bytes: result.bytes,
      };
    } catch (err: any) {
      // Strip potential secret leakage
      const safeMsg = (err.message || 'Video upload failed').replace(
        new RegExp(config.cloudinaryApiSecret || '___impossible___', 'g'),
        '***'
      );
      throw new Error(`Cloudinary video upload failed: ${safeMsg}`);
    }
  },
};
