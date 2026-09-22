import { config } from '../config/env.js';

export interface TelegramPaymentAlertDetails {
  paymentId: string;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
  amountRupees: number;
  productType?: string | null;
  planName?: string | null;
  utr: string;
  submittedAt?: string | null;
  screenshotUrl?: string | null;
}

export const telegramService = {
  getBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN?.trim() || config.telegramBotToken || '';
  },

  getAdminChatId(): string {
    return process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || config.telegramAdminChatId || '';
  },

  getBackendBaseUrl(): string {
    return (
      process.env.BACKEND_BASE_URL?.trim() ||
      process.env.RENDER_EXTERNAL_URL?.trim() ||
      config.backendBaseUrl ||
      'https://flop-show-4a14.onrender.com'
    );
  },

  /**
   * Send a rich instant payment alert to Telegram Admin with 1-Click Approve / Reject inline buttons.
   */
  async sendPaymentAlert(details: TelegramPaymentAlertDetails): Promise<{ success: boolean; messageId?: number } | null> {
    const botToken = this.getBotToken();
    const chatId = this.getAdminChatId();

    if (!botToken || !chatId) {
      console.log('[Telegram Bot] Bot Token or Admin Chat ID not configured. Skipping alert.');
      return null;
    }

    const formattedTime = details.submittedAt
      ? new Date(details.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })
      : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });

    const itemLabel = details.planName
      ? `${details.planName} (${details.productType || 'PLAN'})`
      : (details.productType || 'Catalog Title / Content');

    const contactInfo = details.userEmail || details.userPhone || 'Not provided';
    const userName = details.userName || 'Anonymous User';

    const messageHtml = [
      `🔔 <b>NEW UPI PAYMENT SUBMITTED</b>`,
      ``,
      `👤 <b>User:</b> ${userName}`,
      `📧 <b>Contact:</b> ${contactInfo}`,
      `💵 <b>Amount:</b> ₹${details.amountRupees}`,
      `💎 <b>Item / Plan:</b> ${itemLabel}`,
      `🔢 <b>UTR / Ref No:</b> <code>${details.utr}</code>`,
      `🕒 <b>Date & Time:</b> ${formattedTime} IST`,
      `🆔 <b>Payment ID:</b> <code>${details.paymentId}</code>`,
      ``,
      `<i>Click below to verify and grant immediate access:</i>`
    ].join('\n');

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `pay_approve:${details.paymentId}` },
          { text: '❌ Reject', callback_data: `pay_reject:${details.paymentId}` }
        ]
      ]
    };

    // If payment screenshot URL is provided, try sending photo first
    if (details.screenshotUrl && details.screenshotUrl.trim().startsWith('http')) {
      try {
        const photoUrl = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        const res = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: details.screenshotUrl.trim(),
            caption: messageHtml,
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          })
        });

        const data: any = await res.json().catch(() => ({}));
        if (data.ok) {
          console.log(`[Telegram Bot] ✓ Payment photo alert sent for payment ${details.paymentId}`);
          return { success: true, messageId: data.result?.message_id };
        } else {
          console.warn('[Telegram Bot] sendPhoto returned error, falling back to sendMessage:', data.description);
        }
      } catch (err: any) {
        console.warn('[Telegram Bot] Failed to send photo, falling back to sendMessage:', err.message);
      }
    }

    // Default or fallback: Send text message
    try {
      const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const fullText = details.screenshotUrl
        ? `${messageHtml}\n\n🖼️ <b>Screenshot:</b> <a href="${details.screenshotUrl}">View Payment Screenshot</a>`
        : messageHtml;

      const res = await fetch(textUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: fullText,
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          reply_markup: inlineKeyboard
        })
      });

      const data: any = await res.json().catch(() => ({}));
      if (data.ok) {
        console.log(`[Telegram Bot] ✓ Payment alert sent for payment ${details.paymentId}`);
        return { success: true, messageId: data.result?.message_id };
      } else {
        console.error('[Telegram Bot] sendMessage error:', data);
        return { success: false };
      }
    } catch (err: any) {
      console.error('[Telegram Bot] Network error sending payment alert:', err.message);
      return { success: false };
    }
  },

  /**
   * Stop loading spinner on Telegram client when button is tapped
   */
  async answerCallbackQuery(callbackQueryId: string, text?: string): Promise<boolean> {
    const botToken = this.getBotToken();
    if (!botToken || !callbackQueryId) return false;

    try {
      const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text || 'Processing...',
          show_alert: false
        })
      });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Update the Telegram message after action (Approve / Reject) and remove the buttons.
   */
  async updateMessageStatus(params: {
    chatId: string | number;
    messageId: number;
    action: 'APPROVED' | 'REJECTED';
    paymentId: string;
    originalText?: string;
    isCaption?: boolean;
    adminName?: string;
  }): Promise<boolean> {
    const botToken = this.getBotToken();
    if (!botToken || !params.chatId || !params.messageId) return false;

    const actionTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' });
    const statusLine = params.action === 'APPROVED'
      ? `\n\n══════════════════════\n✅ <b>APPROVED by ${params.adminName || 'Admin'}</b> at ${actionTime} IST`
      : `\n\n══════════════════════\n❌ <b>REJECTED by ${params.adminName || 'Admin'}</b> at ${actionTime} IST`;

    const baseText = params.originalText || `Payment ID: ${params.paymentId}`;
    const newText = `${baseText}${statusLine}`;

    const endpoint = params.isCaption ? 'editMessageCaption' : 'editMessageText';
    const body: any = {
      chat_id: params.chatId,
      message_id: params.messageId,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [] } // Remove buttons to prevent double-clicking
    };

    if (params.isCaption) {
      body.caption = newText;
    } else {
      body.text = newText;
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/${endpoint}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data: any = await res.json().catch(() => ({}));
      return Boolean(data.ok);
    } catch (err: any) {
      console.warn('[Telegram Bot] Failed to edit message:', err.message);
      return false;
    }
  },

  /**
   * Auto-register webhook with Telegram API on server start.
   */
  async autoRegisterWebhook(overrideBaseUrl?: string): Promise<boolean> {
    const botToken = this.getBotToken();
    if (!botToken) {
      console.log('[Telegram Bot] No TELEGRAM_BOT_TOKEN set. Webhook auto-registration skipped.');
      return false;
    }

    const baseUrl = (overrideBaseUrl || this.getBackendBaseUrl()).replace(/\/+$/, '');
    const webhookUrl = `${baseUrl}/api/payments/telegram-webhook`;

    try {
      console.log(`[Telegram Bot] Registering webhook at: ${webhookUrl}...`);
      const url = `https://api.telegram.org/bot${botToken}/setWebhook`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['callback_query', 'message']
        })
      });

      const data: any = await res.json().catch(() => ({}));
      if (data.ok) {
        console.log(`✓ [Telegram Bot] Webhook registered successfully: ${webhookUrl}`);
        return true;
      } else {
        console.warn(`[Telegram Bot] Webhook registration response:`, data);
        return false;
      }
    } catch (err: any) {
      console.error('[Telegram Bot] Failed to register webhook:', err.message);
      return false;
    }
  }
};
