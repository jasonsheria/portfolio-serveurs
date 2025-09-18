import { FileInterceptor } from '@nestjs/platform-express';
import { multerConfig } from './file.config';

// Export configured FileInterceptor for message file uploads
export const messageFileUploadInterceptor = FileInterceptor('file', multerConfig);