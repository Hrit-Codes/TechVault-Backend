import { join } from "path";

export const ATTACHMENT_DIR=join(
    process.cwd(),
    "uploads",
    "campaign-attachments"
);

export const MAX_ATTACHMENTS=3;
export const MAX_ATTACHMENTS_SIZE=10*1024*1024; //10MB

export const RETENTION_DAYS=7;
export const RETENTION_MS=RETENTION_DAYS*24*60*60*1000;

export const ALLOWED_MIME_TYPES=[
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
]

export interface CampaignAttachment{
    fileName:string; // Original name for file header
    storedAs:string; // actual filename on disk ( with random prefix )
    mimeType:string;
}