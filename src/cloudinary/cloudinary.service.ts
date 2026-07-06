import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Express } from 'express';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
    constructor(private readonly configService: ConfigService) {
        cloudinary.config({
            cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
            api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
            api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
        });
    }

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'techvault',
    ): Promise<UploadApiResponse> {
        if (!file) throw new BadRequestException('No file provided');

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                    transformation: [
                        { width: 800, height: 800, crop: 'limit' }, // max size
                        { quality: 'auto' },                         // auto compress
                        { fetch_format: 'auto' },                    // auto format (webp etc)
                    ],
                },
                (error, result) => {
                    if (error) return reject(error);
                    resolve(result!);
                },
            );

            // Convert buffer to stream and pipe to cloudinary
            const readable = new Readable();
            readable.push(file.buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }

    async uploadAvatar(file: Express.Multer.File): Promise<UploadApiResponse> {
        return this.uploadImage(file, 'techvault/avatars');
    }

    async uploadProductImage(file: Express.Multer.File): Promise<UploadApiResponse> {
        return this.uploadImage(file, 'techvault/products');
    }

    async deleteImage(publicId: string): Promise<void> {
        await cloudinary.uploader.destroy(publicId);
    }
}