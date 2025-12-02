import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { join } from 'path';
import * as fs from 'fs';
import { Readable } from 'stream';

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
    // Implement simple retry/backoff for transient network/DNS issues
    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const result = await cloudinary.uploader.upload(localPath, {
          folder: uploadFolder,
          use_filename: true,
          unique_filename: false,
          resource_type: 'auto',
        });
        this.logger.log(`Cloudinary upload success (attempt ${attempt}): ${result.secure_url}`);
        return result;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`Cloudinary upload attempt ${attempt} failed: ${err?.message || err}`);
        // small backoff before retrying
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
    this.logger.error('Cloudinary upload failed after retries', lastErr);
    throw lastErr;
  }

  /**
   * Upload a Buffer to Cloudinary using upload_stream
   */
  async uploadBuffer(buffer: Buffer, folder = 'general', filename?: string): Promise<UploadApiResponse> {
    const uploadFolder = (process.env.CLOUDINARY_UPLOAD_FOLDER || 'app_uploads') + '/' + folder;
    this.logger.log(`Uploading buffer to Cloudinary folder ${uploadFolder}`);

    const maxAttempts = 3;
    let attempt = 0;
    let lastErr: any = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        const streamUpload = (): Promise<UploadApiResponse> => new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: uploadFolder, resource_type: 'auto', use_filename: true, unique_filename: false }, (err, result) => {
            if (err) return reject(err);
            resolve(result as UploadApiResponse);
          });
          const readable = new Readable();
          readable._read = () => {}; // _read is required but you can noop it
          readable.push(buffer);
          readable.push(null);
          readable.pipe(uploadStream);
        });

        const result = await streamUpload();
        this.logger.log(`Cloudinary buffer upload success (attempt ${attempt}): ${result.secure_url}`);
        return result;
      } catch (err) {
        lastErr = err;
        this.logger.warn(`Cloudinary buffer upload attempt ${attempt} failed: ${err?.message || err}`);
        await new Promise(res => setTimeout(res, 500 * attempt));
      }
    }
    this.logger.error('Cloudinary buffer upload failed after retries', lastErr);
    throw lastErr;
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
