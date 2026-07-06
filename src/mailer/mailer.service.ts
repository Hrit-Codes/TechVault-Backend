import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

@Injectable()
export class MailerService {
    private transporter: Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: this.configService.get<string>("MAIL_USER"),
                pass: this.configService.get<string>("MAIL_PASS"),
            },
        });
    }

    getTransporter(): Transporter {
        return this.transporter;
    }
}