import twilio from 'twilio';
import { config } from '../config';

// Initialize Twilio client
// We read SID and TOKEN from the config/env
const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
// Twilio WhatsApp Sender Number (usually prefixed with 'whatsapp:')
const whatsappSender = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; 

let client: twilio.Twilio | null = null;

if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
  }
}

export class PhoneService {
  /**
   * Format phone number to E.164 format (+[country_code][number])
   */
  private formatPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    if (!phone.startsWith('+')) {
      // Default to India country code +91 if not specified
      if (cleaned.length === 10) {
        return `+91${cleaned}`;
      }
      return `+${cleaned}`;
    }
    return `+${cleaned}`;
  }

  /**
   * Send OTP via WhatsApp, falls back to SMS if it fails
   * @returns boolean indicating if message was sent (via WhatsApp or SMS)
   */
  async sendOtp(phone: string, otp: string): Promise<{ success: boolean; channel: 'whatsapp' | 'sms' | 'console' }> {
    const formattedPhone = this.formatPhoneNumber(phone);
    const messageBody = `Your MedCounsel AI verification code is ${otp}. It will expire in ${config.otp.expiryMinutes} minutes. Please do not share it with anyone.`;

    if (!client) {
      console.log(`📱 [DEV CONSOLE LOG] Send OTP to ${formattedPhone} [no Twilio configured]: ${otp}`);
      return { success: true, channel: 'console' };
    }

    // 1. Try sending via WhatsApp
    try {
      console.log(`💬 Attempting to send WhatsApp OTP to ${formattedPhone}...`);
      await client.messages.create({
        from: whatsappSender.startsWith('whatsapp:') ? whatsappSender : `whatsapp:${whatsappSender}`,
        to: `whatsapp:${formattedPhone}`,
        body: messageBody,
      });

      console.log(`✅ WhatsApp OTP sent successfully to ${formattedPhone}`);
      return { success: true, channel: 'whatsapp' };
    } catch (whatsappError: any) {
      console.warn(`⚠️ WhatsApp delivery failed for ${formattedPhone}: ${whatsappError.message || whatsappError}`);
      console.log(`🔄 Falling back to standard SMS for ${formattedPhone}...`);

      // 2. Fallback to standard SMS
      try {
        await client.messages.create({
          from: twilioPhoneNumber,
          to: formattedPhone,
          body: messageBody,
        });

        console.log(`✅ SMS OTP sent successfully to ${formattedPhone} (Fallback)`);
        return { success: true, channel: 'sms' };
      } catch (smsError: any) {
        console.error(`❌ SMS delivery fallback failed for ${formattedPhone}:`, smsError.message || smsError);
        // Fallback to console in development instead of crashing
        if (config.nodeEnv === 'development') {
          console.log(`📱 [DEV CONSOLE LOG FALLBACK] OTP for ${formattedPhone}: ${otp}`);
          return { success: true, channel: 'console' };
        }
        throw new Error(`Failed to deliver OTP to ${formattedPhone} via WhatsApp or SMS.`);
      }
    }
  }
}

export const phoneService = new PhoneService();
export default phoneService;
