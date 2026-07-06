export const otpEmailTemplate = (otp: string, fullName?: string): string => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Verify Your TechVault Account</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f3f4f6; font-family: 'Inter', Arial, sans-serif;">

        <table width="100%" cellpadding="0" cellspacing="0" style="padding: 48px 16px;">
            <tr>
                <td align="center">
                    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 4px 32px rgba(0,0,0,0.08);">

                        <!-- Header -->
                        <tr>
                            <td style="background:#f97316; padding:32px 40px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.5px;">
                                                TechVault
                                            </h1>
                                            <p style="margin:4px 0 0; color:#fff7ed; font-size:12px; letter-spacing:1px; text-transform:uppercase;">
                                                Nepal's Trusted Tech Store
                                            </p>
                                        </td>
                                        <td align="right">
                                            <div style="background:rgba(255,255,255,0.15); border-radius:12px; padding:8px 14px;">
                                                <span style="color:#ffffff; font-size:12px; font-weight:600;">
                                                    Email Verification
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Body -->
                        <tr>
                            <td style="padding:40px;">

                                <!-- Greeting -->
                                <h2 style="margin:0 0 8px; color:#111827; font-size:22px; font-weight:600;">
                                    Verify Your Email
                                </h2>
                                <p style="margin:0 0 28px; color:#6b7280; font-size:14px; line-height:1.7;">
                                    Hi <strong style="color:#111827;">${fullName ?? "there"}</strong>,<br/>
                                    Thank you for signing up with TechVault. Use the code below to verify your email address and activate your account.
                                </p>

                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                                    <tr>
                                        <td style="background:#fff7ed; border:2px dashed #f97316; border-radius:16px; padding:28px; text-align:center;">
                                            <p style="margin:0 0 8px; color:#9ca3af; font-size:11px; text-transform:uppercase; letter-spacing:3px; font-weight:600;">
                                                Your verification code
                                            </p>
                                            <h1 style="margin:0; color:#f97316; font-size:48px; font-weight:700; letter-spacing:14px;">
                                                ${otp}
                                            </h1>
                                            <p style="margin:12px 0 0; color:#9ca3af; font-size:12px;">
                                                Expires in <strong style="color:#f97316;">5 minutes</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Warning -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                                    <tr>
                                        <td style="background:#f9fafb; border-left:3px solid #f97316; border-radius:0 8px 8px 0; padding:14px 16px;">
                                            <p style="margin:0; color:#6b7280; font-size:13px; line-height:1.6;">
                                                🔒 <strong>Never share this code</strong> with anyone. TechVault will never ask for your OTP via phone or email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>

                                <p style="margin:0; color:#9ca3af; font-size:13px; line-height:1.6;">
                                    If you didn't create a TechVault account, you can safely ignore this email. No action is required.
                                </p>

                            </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                            <td style="padding:0 40px;">
                                <div style="border-top:1px solid #f3f4f6;"></div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding:24px 40px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td>
                                            <p style="margin:0; color:#9ca3af; font-size:12px; line-height:1.8;">
                                                &copy; 2026 <strong style="color:#6b7280;">TechVault & Pvt. Ltd.</strong><br/>
                                                New Plaza Putalisadak, Kathmandu, Nepal
                                            </p>
                                        </td>
                                        <td align="right">
                                            <a href="#" style="color:#f97316; font-size:12px; text-decoration:none; font-weight:500;">
                                                Unsubscribe
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                    <!-- Sub footer -->
                    <p style="margin:20px 0 0; color:#9ca3af; font-size:12px; text-align:center;">
                        This email was sent to you because you registered on TechVault.
                    </p>

                </td>
            </tr>
        </table>

    </body>
    </html>
    `;
};