import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { join } from "path";
import { readFile } from "fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { MailerService } from "../mailer/mailer.service";
import { ConfigService } from "@nestjs/config";
import { ATTACHMENT_DIR } from "./campaign.constants";
import { EmailJobData } from "./campaign.service";

const MAX_ATTEMPTS = 3;
const MAX_CACHE_ENTRIES = 20;

@Processor("email-campaign", { concurrency: 5 })
export class CampaignEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignEmailProcessor.name);

  // Files read from disk are cached here for the duration of the process.
  // A 5,000-subscriber campaign with 3 attachments reads them once each
  // from disk instead of 15,000 times.
  private readonly attachmentCache = new Map<string, Buffer>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const {
      campaignId,
      email,
      subject,
      body,
      unsubscribeToken,
      attachments,
    } = job.data;

    const frontendUrl = (
      this.configService.get<string>("FRONTEND_URL") ?? ""
    ).replace(/\/$/, "");

    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;

    const mailAttachments = await Promise.all(
      attachments.map(async (att) => ({
        filename: att.fileName,
        content: await this.readAttachment(att.storedAs),
        contentType: att.mimeType,
      })),
    );

    await this.mailerService.getTransporter().sendMail({
      from: `"TechVault" <${this.configService.get("MAIL_USER")}>`,
      to: email,
      subject,
      html: this.renderHtml(body, unsubscribeUrl),
      attachments: mailAttachments,
    });

    // Use updateMany so we don't throw if the campaign was deleted by
    // the cleanup cron between queuing and this job firing.
    await this.prisma.campaign.updateMany({
      where: { id: campaignId },
      data: { successCount: { increment: 1 } },
    });

    await this.finalizeCampaignIfDone(campaignId);
  }

  @OnWorkerEvent("failed")
  async onFailed(job: Job<EmailJobData>, error: Error) {
    this.logger.error(
      `Campaign email failed for ${job.data.email} ` +
        `(attempt ${job.attemptsMade}/${MAX_ATTEMPTS}): ${error.message}`,
    );

    if (job.attemptsMade >= MAX_ATTEMPTS) {
      await this.prisma.campaign.updateMany({
        where: { id: job.data.campaignId },
        data: { failureCount: { increment: 1 } },
      });
      await this.finalizeCampaignIfDone(job.data.campaignId);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────
  private async readAttachment(storedAs: string): Promise<Buffer> {
    const cached = this.attachmentCache.get(storedAs);
    if (cached) return cached;

    const fullPath = join(ATTACHMENT_DIR, storedAs);
    const buffer = await readFile(fullPath);

    // Simple LRU-ish eviction: drop the oldest when we hit the cap.
    if (this.attachmentCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.attachmentCache.keys().next().value;
      if (oldest) this.attachmentCache.delete(oldest);
    }
    this.attachmentCache.set(storedAs, buffer);

    return buffer;
  }

  private async finalizeCampaignIfDone(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        status: true,
        successCount: true,
        failureCount: true,
        totalRecipients: true,
      },
    });

    if (!campaign) return;
    if (campaign.status === "COMPLETED" || campaign.status === "FAILED") return;

    const processed = campaign.successCount + campaign.failureCount;
    if (processed < campaign.totalRecipients) return;

    const finalStatus = campaign.successCount > 0 ? "COMPLETED" : "FAILED";

    await this.prisma.campaign.updateMany({
      where: { id: campaignId },
      data: {
        status: finalStatus,
        completedAt: new Date(),
      },
    });

    this.logger.log(
      `Campaign ${campaignId} finalized as ${finalStatus} ` +
        `(${campaign.successCount}/${campaign.totalRecipients} delivered)`,
    );
  }

  private renderHtml(body: string, unsubscribeUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0; padding:0; background:#f3f4f6; font-family:'Inter', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(15,23,42,0.06);">
                  <tr>
                    <td style="background:#f97316; padding:24px 32px;">
                      <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">TechVault</h1>
                      <p style="margin:4px 0 0; color:#fff7ed; font-size:11px; letter-spacing:1.2px; text-transform:uppercase;">Nepal's Trusted Tech Store</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px; color:#374151; font-size:14px; line-height:1.7;">
                      ${body}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 32px 24px; border-top:1px solid #e5e7eb; text-align:center; color:#9ca3af; font-size:12px; line-height:1.6;">
                      <p style="margin:0 0 8px;">You're receiving this because you subscribed to the TechVault newsletter.</p>
                      <a href="${unsubscribeUrl}" style="color:#0ea5e9; text-decoration:none; font-weight:600;">Unsubscribe</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0; color:#9ca3af; font-size:12px; text-align:center;">
                  &copy; ${new Date().getFullYear()} TechVault &amp; Pvt. Ltd. — Kathmandu, Nepal
                </p>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }
}