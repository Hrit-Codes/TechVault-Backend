import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { MailerService } from "../mailer/mailer.service";
import { otpEmailTemplate } from "../template/otpEmailTemplate";

@Injectable()
export class OtpService {
    private readonly redis: Redis;
    private readonly OTP_EXPIRY = 300;

    constructor(
        private readonly mailerService: MailerService,
        private readonly configService: ConfigService,
    ) {
        this.redis = new Redis(this.configService.get<string>("REDIS_URL")!);
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async saveOtp(email: string, otp: string): Promise<void> {
        await this.redis.setex(`otp:${email}`, this.OTP_EXPIRY, otp);
    }

    async getOtp(email: string): Promise<string | null> {
        return this.redis.get(`otp:${email}`);
    }

    async deleteOtp(email: string): Promise<void> {
        await this.redis.del(`otp:${email}`);
    }

    async sendOtpEmail(email: string, fullName?: string): Promise<void> {
        const otp = this.generateOtp();
        await this.saveOtp(email, otp);

        await this.mailerService.getTransporter().sendMail({
            from: `"TechVault" <${this.configService.get("MAIL_USER")}>`,
            to: email,
            subject: "Verify your TechVault account",
            html: otpEmailTemplate(otp, fullName),
        });
    }

    async verifyOtp(email: string, otp: string): Promise<boolean> {
        const stored = await this.getOtp(email);
        if (!stored) return false;
        if (stored !== otp) return false;
        await this.deleteOtp(email);
        return true;
    }
}