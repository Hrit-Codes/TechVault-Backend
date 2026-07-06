import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const multerConfig = {
    storage: memoryStorage(), 
    limits: {
        fileSize: 5 * 1024 * 1024, 
    },
    fileFilter: (
        _req: any,
        file: Express.Multer.File,
        callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
            return callback(
                new BadRequestException('Only JPEG, PNG and WebP images are allowed'),
                false,
            );
        }
        callback(null, true);
    },
};