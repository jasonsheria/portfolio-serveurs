import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { join } from 'path';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // Configure cloudinary using env vars. These env vars should be set in Render
    // CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
      api_key: process.env.CLOUDINARY_API_KEY || '',
      api_secret: process.env.CLOUDINARY_API_SECRET || '',
      secure: true,
    });
  }

  /**
   * Upload a local file to Cloudinary under the given folder.
   * Returns the Cloudinary upload result.
   */
  async uploadFile(localPath: string, folder = 'general'): Promise<UploadApiResponse> {
    const uploadFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'app_uploads') + '/' + folder;
    this.logger.log(`Uploading ${localPath} to Cloudinary folder ${uploadFolder}`);
    try {
      const result = await cloudinary.uploader.upload(localPath, {
        folder: uploadFolder,
        use_filename: true,
        unique_filename: false,
        resource_type: 'auto',
      });
      this.logger.log(`Cloudinary upload success: ${result.secure_url}`);
      return result;
    } catch (err) {
      this.logger.error('Cloudinary upload error', err as any);
      throw err;
    }
  }

  /**
   * Helper that uploads then removes the local file (if present).
   */
  async uploadAndRemove(localPath: string, folder = 'general') {
    const res = await this.uploadFile(localPath, folder);
    // best-effort remove local file
    try {
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
    } catch (e) {
      this.logger.warn(`Failed to remove local file ${localPath}: ${e.message}`);
    }
    return res;
  }
}
