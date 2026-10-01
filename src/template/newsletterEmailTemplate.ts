type EmailLayoutOptions = {
  badge: string;
  heading: string;
  intro: string;
  body: string;
  cta?: { label: string; url: string };
  footnote: string;
  unsubscribeUrl?: string;
};

const layout = ({
  badge,
  heading,
  intro,
  body,
  cta,
  footnote,
  unsubscribeUrl,
}: EmailLayoutOptions): string => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>${heading}</title>
    <style>
      /* ─────────────────────────────────────────────────
         LIGHT (defaults) — mirrors the frontend light theme
         ───────────────────────────────────────────────── */
      body, .bg-canvas { background-color: #f3f4f6 !important; }   /* section-alternative */
      .bg-card        { background-color: #ffffff !important; }   /* section */
      .text-heading   { color: #111827 !important; }              /* gray-900 */
      .text-strong    { color: #111827 !important; font-weight: 600; }
      .text-body      { color: #374151 !important; }              /* gray-700 = --color-description (light) */
      .text-muted     { color: #6b7280 !important; }              /* gray-500 */
      .text-subtle    { color: #9ca3af !important; }              /* gray-400 */
      .divider        { border-top: 1px solid #e5e7eb !important; } /* gray-200 */

      /* Callout — info (blue) */
      .callout-info {
        background-color: #f0f9ff !important;                     /* secondary-50 */
        border-left: 3px solid #0ea5e9 !important;                /* secondary-500 */
      }
      /* Callout — neutral */
      .callout-neutral {
        background-color: #f9fafb !important;                     /* gray-50 */
        border-left: 3px solid #9ca3af !important;                /* gray-400 */
      }

      /* ─────────────────────────────────────────────────
         DARK — mirrors the frontend .dark theme
         ───────────────────────────────────────────────── */
      @media (prefers-color-scheme: dark) {
        body, .bg-canvas { background-color: #101829 !important; } /* section-alternative */
        .bg-card        { background-color: #0b0f19 !important; } /* section */
        .text-heading   { color: #f9fafb !important; }            /* gray-50 */
        .text-strong    { color: #f9fafb !important; }
        .text-body      { color: #d1d5db !important; }            /* gray-300 = --color-description (dark) */
        .text-muted     { color: #9ca3af !important; }            /* gray-400 */
        .text-subtle    { color: #6b7280 !important; }            /* gray-500 */
        .divider        { border-top: 1px solid #1f2937 !important; } /* gray-800 */

        .callout-info {
          background-color: #082f49 !important;                   /* secondary-950 */
          border-left: 3px solid #38bdf8 !important;              /* secondary-400 */
        }
        .callout-neutral {
          background-color: #1f2937 !important;                   /* gray-800 */
          border-left: 3px solid #6b7280 !important;              /* gray-500 */
        }
      }

      /* Links */
      a { text-decoration: none; }
      .link-primary { color: #0ea5e9 !important; }                /* secondary-500 */
      @media (prefers-color-scheme: dark) {
        .link-primary { color: #38bdf8 !important; }              /* secondary-400 */
      }
    </style>
  </head>
  <body
    class="bg-canvas"
    style="margin:0; padding:0; background-color:#f3f4f6; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding: 48px 16px;" class="bg-canvas">
          <table
            width="520"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            class="bg-card"
            style="background:#ffffff; border-radius:20px; overflow:hidden; box-shadow:0 4px 24px rgba(15,23,42,0.06);"
          >
            <!-- ─── Brand header (unchanged in dark mode) ─── -->
            <tr>
              <td style="background:#f97316; padding:32px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td>
                      <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.4px;">
                        TechVault
                      </h1>
                      <p style="margin:4px 0 0; color:#fff7ed; font-size:11px; letter-spacing:1.2px; text-transform:uppercase;">
                        Nepal's Trusted Tech Store
                      </p>
                    </td>
                    <td align="right" valign="middle">
                      <div style="display:inline-block; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.35); border-radius:999px; padding:6px 14px;">
                        <span style="color:#ffffff; font-size:11px; font-weight:600; letter-spacing:0.3px;">
                          ${badge}
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- ─── Body ─── -->
            <tr>
              <td style="padding:40px;">
                <h2
                  class="text-heading"
                  style="margin:0 0 10px; color:#111827; font-size:22px; font-weight:700; letter-spacing:-0.3px;"
                >
                  ${heading}
                </h2>

                <p
                  class="text-body"
                  style="margin:0 0 28px; color:#374151; font-size:14px; line-height:1.7;"
                >
                  ${intro}
                </p>

                ${body}

                ${
                  cta
                    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
                        <tr>
                          <td style="background:#f97316; border-radius:12px;">
                            <a
                              href="${cta.url}"
                              style="display:inline-block; padding:13px 26px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; letter-spacing:0.2px;"
                            >
                              ${cta.label}
                            </a>
                          </td>
                        </tr>
                      </table>`
                    : ''
                }

                <p
                  class="text-subtle"
                  style="margin:0; color:#9ca3af; font-size:13px; line-height:1.6;"
                >
                  ${footnote}
                </p>
              </td>
            </tr>

            <!-- ─── Divider ─── -->
            <tr>
              <td style="padding:0 40px;">
                <div class="divider" style="border-top:1px solid #e5e7eb; font-size:0; line-height:0;">&nbsp;</div>
              </td>
            </tr>

            <!-- ─── Footer ─── -->
            <tr>
              <td style="padding:22px 40px 26px;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td class="text-subtle" style="color:#9ca3af; font-size:12px; line-height:1.7;">
                      &copy; 2026 <strong class="text-muted" style="color:#6b7280; font-weight:600;">TechVault &amp; Pvt. Ltd.</strong><br />
                      New Plaza Putalisadak, Kathmandu, Nepal
                    </td>
                    ${
                      unsubscribeUrl
                        ? `<td align="right" valign="top">
                            <a
                              href="${unsubscribeUrl}"
                              class="link-primary"
                              style="color:#0ea5e9; font-size:12px; font-weight:600; text-decoration:none;"
                            >
                              Unsubscribe
                            </a>
                          </td>`
                        : ''
                    }
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- ─── Sub-footer (outside the card) ─── -->
          <p
            class="text-subtle"
            style="margin:20px auto 0; max-width:520px; color:#9ca3af; font-size:12px; line-height:1.6; text-align:center;"
          >
            This email was sent to you because you subscribed to the TechVault newsletter.
          </p>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export const welcomeEmailTemplate = (
  email: string,
  unsubscribeUrl: string,
  shopUrl: string,
): string =>
  layout({
    badge: 'Newsletter',
    heading: "You're on the list!",
    intro: `Thanks for subscribing to the TechVault newsletter with <strong class="text-strong" style="color:#111827; font-weight:600;">${email}</strong>. You'll be first to hear about new arrivals, exclusive deals, and restock alerts.`,
    body: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td class="callout-info" style="background:#f0f9ff; border-left:3px solid #0ea5e9; border-radius:0 10px 10px 0; padding:14px 18px;">
                  <p class="text-body" style="margin:0; color:#374151; font-size:13px; line-height:1.6;">
                    <strong class="text-strong" style="color:#111827; font-weight:600;">No spam, ever.</strong>
                    One or two emails a month at most, and you can leave whenever you like.
                  </p>
                </td>
              </tr>
            </table>`,
    cta: { label: 'Start shopping', url: `${shopUrl}/shop` },
    footnote:
      'If this was not you, you can safely ignore this email — no action is required.',
    unsubscribeUrl,
  });

export const unsubscribeConfirmEmailTemplate = (
  email: string,
  resubscribeUrl: string,
): string =>
  layout({
    badge: 'Subscription',
    heading: 'You have been unsubscribed',
    intro: `We've removed <strong class="text-strong" style="color:#111827; font-weight:600;">${email}</strong> from the TechVault newsletter. You'll no longer receive product updates or offers from us.`,
    body: `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td class="callout-neutral" style="background:#f9fafb; border-left:3px solid #9ca3af; border-radius:0 10px 10px 0; padding:14px 18px;">
                  <p class="text-body" style="margin:0; color:#374151; font-size:13px; line-height:1.6;">
                    Changed your mind? You can resubscribe any time and pick up right where you left off.
                  </p>
                </td>
              </tr>
            </table>`,
    cta: { label: 'Resubscribe', url: resubscribeUrl },
    footnote:
      'If you did not request this, please ignore this email — no action is required.',
  });