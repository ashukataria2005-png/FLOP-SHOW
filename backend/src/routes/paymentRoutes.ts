import { Router, Request, Response } from 'express';
import { paymentRequestService } from '../services/paymentRequestService.js';
import { telegramService } from '../services/telegramService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { requireAdmin, requirePermission, requireAnyPermission } from '../middlewares/adminMiddleware.js';

export const paymentRouter = Router();

// ============================================================================
// 1. PUBLIC PAYMENT CONFIG (for Recharge Modal)
// ============================================================================
paymentRouter.get('/config', async (_req, res, next) => {
  try {
    const config = await paymentRequestService.getPublicPaymentConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 2. AUTHENTICATED USER PAYMENT ENDPOINTS
// ============================================================================

// Submit a new manual UPI payment request with UTR
paymentRouter.post('/submit-request', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { amount, utr, userName, userEmail, contentId, productType, planId, planName, promoCode, screenshotUrl, screenshot } = req.body;
    const request = await paymentRequestService.submitPaymentRequest(req.user!.id, {
      amountRupees: amount !== undefined && amount !== null && amount !== '' ? Number(amount) : undefined,
      utr,
      userName: userName || (req.user as any)?.name,
      userEmail: userEmail || req.user!.email,
      contentId: contentId || null,
      productType: productType || 'MOVIE',
      planId: planId || null,
      planName: planName || null,
      promoCode: promoCode || null,
      screenshotUrl: screenshotUrl || screenshot || null,
    });

    const isApproved = request.status === 'APPROVED';

    res.status(201).json({
      success: true,
      message: isApproved
        ? 'Payment approved! Access is now active.'
        : 'Payment request submitted successfully. Awaiting administrator verification.',
      payment: request,
    });
  } catch (err) {
    next(err);
  }
});

// Get authenticated user's payment requests
paymentRouter.get('/my-requests', requireAuth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const requests = await paymentRequestService.getUserRequests(req.user!.id, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 3. ADMIN-ONLY VERIFICATION & SETTINGS ENDPOINTS
// ============================================================================

// Admin metrics
paymentRouter.get('/admin/metrics', requireAuth, requirePermission('payments'), async (_req, res, next) => {
  try {
    const metrics = await paymentRequestService.getMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// Admin list all requests (filter by status: PENDING, APPROVED, REJECTED, ALL)
paymentRouter.get('/admin/requests', requireAuth, requirePermission('payments'), async (req, res, next) => {
  try {
    const status = (req.query.status as string) || 'ALL';
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const requests = await paymentRequestService.getAllRequests(status, limit);
    res.json({ count: requests.length, requests });
  } catch (err) {
    next(err);
  }
});

// Admin get payment configuration
paymentRouter.get('/admin/settings', requireAuth, requireAnyPermission(['settings', 'payments', 'monetization']), async (_req, res, next) => {
  try {
    const config = await paymentRequestService.getPublicPaymentConfig();
    res.json(config);
  } catch (err) {
    next(err);
  }
});

// Admin update payment configuration
paymentRouter.post('/admin/settings', requireAuth, requireAnyPermission(['settings', 'payments', 'monetization']), async (req, res, next) => {
  try {
    const { upiId, merchantName, approvalMode } = req.body;
    // Only pass 'enabled' when it is explicitly provided; otherwise undefined preserves existing value.
    const enabled = 'enabled' in req.body ? Boolean(req.body.enabled) : undefined;
    const updated = await paymentRequestService.updatePaymentConfig({
      upiId,
      enabled,
      merchantName,
      approvalMode,
    });
    res.json({
      success: true,
      message: 'UPI payment settings updated successfully.',
      config: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Admin approve payment request and atomically credit wallet
paymentRouter.post('/admin/requests/:id/approve', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { adminNote } = req.body;
    const result = await paymentRequestService.approvePayment(req.user!.id, id, adminNote);
    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

// Admin reject payment request
paymentRouter.post('/admin/requests/:id/reject', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const id = String(req.params.id);
    const { adminNote } = req.body;
    const payment = await paymentRequestService.rejectPayment(req.user!.id, id, adminNote);
    res.json({
      success: true,
      message: 'Payment request rejected. Wallet balance unchanged.',
      payment,
    });
  } catch (err) {
    next(err);
  }
});

// ============================================================================
// 4. TELEGRAM INSTANT PAYMENT WEBHOOK (1-Click Approve / Reject Bot)
// Endpoint: POST /api/payments/telegram-webhook
// ============================================================================

paymentRouter.post('/telegram-webhook', async (req: Request, res: Response) => {
  // Always return 200 OK fast to acknowledge Telegram update delivery
  try {
    const update = req.body || {};
    const callbackQuery = update.callback_query;

    if (callbackQuery) {
      const callbackQueryId = String(callbackQuery.id);
      const data = String(callbackQuery.data || '');
      const from = callbackQuery.from || {};
      const adminName = from.first_name
        ? `${from.first_name}${from.last_name ? ' ' + from.last_name : ''}`
        : (from.username ? `@${from.username}` : 'Telegram Admin');
      const message = callbackQuery.message;
      const chatId = message?.chat?.id;
      const messageId = message?.message_id;
      const isCaption = Boolean(message?.caption !== undefined && message?.caption !== null);
      const originalText = isCaption ? message?.caption : message?.text;

      console.log(`[Telegram Webhook] Received callback_query: ${data} from ${adminName} (${chatId})`);

      if (data.startsWith('pay_approve:') || data.startsWith('pay_reject:')) {
        const [actionKey, paymentId] = data.split(':');
        const isApprove = actionKey === 'pay_approve';

        // 1. Answer callback immediately to dismiss the Telegram client loading spinner
        await telegramService.answerCallbackQuery(
          callbackQueryId,
          isApprove ? 'Processing Approval...' : 'Processing Rejection...'
        );

        if (isApprove) {
          try {
            await paymentRequestService.approvePayment(
              `TELEGRAM_ADMIN (${adminName})`,
              paymentId,
              `Approved via Telegram 1-Click Bot by ${adminName}`
            );

            console.log(`[Telegram Webhook] ✓ Payment ${paymentId} approved by ${adminName}`);

            // 2. Edit Telegram message to remove buttons and show approval stamp
            if (chatId && messageId) {
              await telegramService.updateMessageStatus({
                chatId,
                messageId,
                action: 'APPROVED',
                paymentId,
                originalText,
                isCaption,
                adminName,
              });
            }
          } catch (approveErr: any) {
            console.error(`[Telegram Webhook] Approval failed for ${paymentId}:`, approveErr?.message || approveErr);
            await telegramService.answerCallbackQuery(
              callbackQueryId,
              `❌ ${approveErr?.message || 'Approval failed'}`
            );
          }
        } else {
          try {
            await paymentRequestService.rejectPayment(
              `TELEGRAM_ADMIN (${adminName})`,
              paymentId,
              `Rejected via Telegram 1-Click Bot by ${adminName}`
            );

            console.log(`[Telegram Webhook] ✗ Payment ${paymentId} rejected by ${adminName}`);

            // 2. Edit Telegram message to remove buttons and show rejection stamp
            if (chatId && messageId) {
              await telegramService.updateMessageStatus({
                chatId,
                messageId,
                action: 'REJECTED',
                paymentId,
                originalText,
                isCaption,
                adminName,
              });
            }
          } catch (rejectErr: any) {
            console.error(`[Telegram Webhook] Rejection failed for ${paymentId}:`, rejectErr?.message || rejectErr);
            await telegramService.answerCallbackQuery(
              callbackQueryId,
              `❌ ${rejectErr?.message || 'Rejection failed'}`
            );
          }
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error('[Telegram Webhook] Error processing update:', err);
    res.status(200).json({ ok: false, error: err?.message || 'Internal error' });
  }
});

// Admin endpoint to manually trigger webhook registration
paymentRouter.post('/admin/telegram/register-webhook', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { overrideBaseUrl } = req.body || {};
    const success = await telegramService.autoRegisterWebhook(overrideBaseUrl);
    res.json({
      success,
      message: success
        ? 'Telegram webhook successfully registered with Telegram API.'
        : 'Failed to register Telegram webhook. Check TELEGRAM_BOT_TOKEN and server logs.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// Admin endpoint to test Telegram payment alert
paymentRouter.post('/admin/telegram/test-alert', requireAuth, requirePermission('payments'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await telegramService.sendPaymentAlert({
      paymentId: `test_${Date.now()}`,
      userName: (req.user as any)?.name || 'Admin Tester',
      userEmail: req.user!.email,
      amountRupees: 99,
      productType: 'SUBSCRIPTION',
      planName: 'VIP Monthly Test Pass',
      utr: 'TEST999988887777',
      submittedAt: new Date().toISOString(),
    });

    res.json({
      success: Boolean(result?.success),
      result,
      message: result?.success
        ? 'Test alert sent to Telegram admin channel!'
        : 'Failed to send test alert. Ensure TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID are set.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

