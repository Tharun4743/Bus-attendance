/**
 * ☁️ CLOUDINARY MEDIA & ID CARD PIPELINE
 * Strictly adheres to the Cloudinary asset protocol:
 * Zero local/base64 asset storage; stores secure HTTPS URLs and Public IDs only.
 */

import crypto from 'crypto';

export interface CloudinaryUploadResult {
  success: boolean;
  secureUrl?: string;
  publicId?: string;
  format?: string;
  bytes?: number;
  error?: string;
}

export class CloudinaryPipeline {
  private get cloudName(): string {
    return process.env.CLOUDINARY_CLOUD_NAME || '';
  }
  private get apiKey(): string {
    return process.env.CLOUDINARY_API_KEY || '';
  }
  private get apiSecret(): string {
    return process.env.CLOUDINARY_API_SECRET || '';
  }

  public isConfigured(): boolean {
    return Boolean(this.cloudName && this.apiKey && this.apiSecret);
  }

  /**
   * Generates a signed upload signature for direct browser HTTPS upload to Cloudinary.
   */
  public generateUploadSignature(folder: string = 'bus-attendance/id_cards'): {
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    folder: string;
  } | null {
    if (!this.isConfigured()) {
      return null;
    }

    const timestamp = Math.round(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
    const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

    return {
      timestamp,
      signature,
      apiKey: this.apiKey,
      cloudName: this.cloudName,
      folder,
    };
  }

  /**
   * Uploads a media buffer or base64 stream directly to Cloudinary.
   */
  public async uploadMedia(
    fileDataUri: string,
    folder: string = 'bus_attendance/id_cards'
  ): Promise<CloudinaryUploadResult> {
    if (!this.isConfigured()) {
      console.warn('⚠️ [Cloudinary] Cloudinary credentials missing in .env. Configure CLOUDINARY_* variables.');
      return {
        success: false,
        error: 'Cloudinary credentials not configured in .env',
      };
    }

    try {
      const endpoint = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
      const formData = new URLSearchParams();
      formData.append('file', fileDataUri);
      formData.append('folder', folder);
      formData.append('api_key', this.apiKey);

      const timestamp = Math.round(Date.now() / 1000);
      const paramsToSign = `folder=${folder}&timestamp=${timestamp}${this.apiSecret}`;
      const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const json = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: json.error?.message || `Cloudinary HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        secureUrl: json.secure_url,
        publicId: json.public_id,
        format: json.format,
        bytes: json.bytes,
      };
    } catch (err: any) {
      console.error('❌ [Cloudinary Upload Error]:', err);
      return {
        success: false,
        error: err.message || 'Failed to upload media to Cloudinary',
      };
    }
  }
}

export const cloudinaryPipeline = new CloudinaryPipeline();
