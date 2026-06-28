import nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.port === 465,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    await transporter.sendMail({
      from: config.smtp.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    console.log(`📧 Email sent to ${options.to}`);
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    // In development, log the email content instead of throwing
    if (config.nodeEnv === 'development') {
      console.log('📧 [DEV] Email content:', options);
    } else {
      throw error;
    }
  }
}

export function getOtpEmailTemplate(otp: string, name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#14b8a6 100%);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;letter-spacing:-0.5px;">MedCounsel AI</h1>
          <p style="color:#ccfbf1;font-size:14px;margin:8px 0 0;">Your NEET UG Counseling Assistant</p>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#1e293b;font-size:16px;margin:0 0 8px;">Hello <strong>${name}</strong>,</p>
          <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Use the following OTP to verify your account. This code expires in <strong>${config.otp.expiryMinutes} minutes</strong>.
          </p>
          <div style="background:#f0fdfa;border:2px dashed #14b8a6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
            <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#0f766e;">${otp}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;line-height:1.5;margin:0;">
            If you didn't request this code, please ignore this email. Do not share this OTP with anyone.
          </p>
        </div>
        <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} MedCounsel AI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getWelcomeEmailTemplate(name: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#0f766e 0%,#0d9488 50%,#14b8a6 100%);padding:40px 32px;text-align:center;">
          <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:700;">🎉 Welcome to MedCounsel AI!</h1>
        </div>
        <div style="padding:40px 32px;">
          <p style="color:#1e293b;font-size:16px;margin:0 0 16px;">Hi <strong>${name}</strong>,</p>
          <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 24px;">
            Your account has been verified successfully! You now have access to:
          </p>
          <ul style="color:#475569;font-size:14px;line-height:2;padding-left:20px;margin:0 0 24px;">
            <li>📊 Cutoff analysis across all colleges</li>
            <li>🏥 Allotment tracking by round</li>
            <li>📄 State-wise document checklists</li>
            <li>📢 Real-time counseling notifications</li>
            <li>🤖 AI-powered counseling assistant</li>
          </ul>
          <a href="${config.clientUrl}/dashboard" style="display:inline-block;background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
            Go to Dashboard →
          </a>
        </div>
        <div style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">© ${new Date().getFullYear()} MedCounsel AI. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
