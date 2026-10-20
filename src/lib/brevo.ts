/**
 * 📧 BREVO TRANSACTIONAL EMAIL ENGINE (v3 API)
 * Strictly conforms to zero-mock email delivery protocol.
 * Dispatches live cryptographic 6-digit OTPs and password reset links.
 */

export interface SendEmailPayload {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
}

export class BrevoMailer {
  private apiKey: string;
  private senderEmail: string;
  private senderName: string;
  private apiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {
    this.apiKey = process.env.BREVO_API_KEY || '';
    this.senderEmail = process.env.BREVO_SENDER_EMAIL || 'transport@college.edu';
    this.senderName = process.env.BREVO_SENDER_NAME || 'College Bus Transit System';
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 15 && !this.apiKey.includes('your_brevo'));
  }

  /**
   * Dispatches a live transactional email via the Brevo v3 REST API.
   */
  public async sendTransactionalEmail(payload: SendEmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      console.warn('⚠️ [Brevo Engine] BREVO_API_KEY not configured or placeholder detected. Ensure your API key is in .env.');
      return {
        success: false,
        error: 'Brevo API key is not configured in .env. Live email dispatch requires BREVO_API_KEY.',
      };
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.senderName,
            email: this.senderEmail,
          },
          to: [
            {
              email: payload.toEmail,
              name: payload.toName,
            },
          ],
          subject: payload.subject,
          htmlContent: payload.htmlContent,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('❌ [Brevo API Error]:', data);
        return {
          success: false,
          error: data.message || `Brevo API HTTP ${response.status}`,
        };
      }

      console.log(`✅ [Brevo Engine] Email successfully dispatched to ${payload.toEmail} (ID: ${data.messageId})`);
      return {
        success: true,
        messageId: data.messageId,
      };
    } catch (err: any) {
      console.error('❌ [Brevo Dispatch Failed]:', err);
      return {
        success: false,
        error: err.message || 'Unknown network error communicating with Brevo API',
      };
    }
  }

  /**
   * Generates and dispatches a 6-digit cryptographic verification OTP with a 10-minute expiry window.
   */
  public async sendOtpEmail(toEmail: string, toName: string, otp: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 40px 20px; color: #f8fafc; }
          .container { max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
          .logo { font-size: 14px; font-weight: 700; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
          .otp-card { background: #0b0f19; border: 1px solid #38bdf8; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
          .otp-code { font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8; font-family: monospace; }
          .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🚌 College Bus Attendance System</div>
          <h1>Verify Your Registration</h1>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>Use the 6-digit verification code below to confirm your student commuter registration. This code will expire in <strong>10 minutes</strong>.</p>
          <div class="otp-card">
            <div class="otp-code">${otp}</div>
          </div>
          <p>If you did not request this verification, please disregard this email.</p>
          <div class="footer">
            College Transport Fleet Logistics & Attendance Verification Portal
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendTransactionalEmail({
      toEmail,
      toName,
      subject: `[${otp}] Your Bus Attendance Registration Code`,
      htmlContent: html,
    });
  }

  /**
   * Dispatches a cryptographic password reset link with a 15-minute expiry window.
   */
  public async sendPasswordResetEmail(toEmail: string, toName: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 40px 20px; color: #f8fafc; }
          .container { max-width: 540px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; padding: 32px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
          .logo { font-size: 14px; font-weight: 700; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 24px; }
          h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
          p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 20px 0; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block; }
          .footer { font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">🚌 College Bus Attendance System</div>
          <h1>Password Reset Request</h1>
          <p>Hello <strong>${toName}</strong>,</p>
          <p>We received a request to reset your password. Click the secure link below to choose a new password. This link is valid for <strong>15 minutes</strong>.</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset Password</a>
          </div>
          <p style="word-break: break-all; font-size: 12px; color: #64748b;">Or copy this URL into your browser:<br>${resetUrl}</p>
          <p>If you did not initiate this request, no action is required.</p>
          <div class="footer">
            College Transport Fleet Logistics & Attendance Verification Portal
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendTransactionalEmail({
      toEmail,
      toName,
      subject: `Reset Your Bus Attendance Portal Password`,
      htmlContent: html,
    });
  }
}

export const brevoMailer = new BrevoMailer();
