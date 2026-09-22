import 'dotenv/config';
import { telegramService } from '../services/telegramService.js';

async function runTest() {
  console.log('============================================================');
  console.log('TELEGRAM DIAGNOSTIC & TEST SENDER');
  console.log('============================================================');

  const cliToken = process.argv[2]?.trim();
  const cliChatId = process.argv[3]?.trim();

  const botToken = cliToken || process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const adminChatId = cliChatId || process.env.TELEGRAM_ADMIN_CHAT_ID?.trim() || '';

  if (cliToken) {
    process.env.TELEGRAM_BOT_TOKEN = cliToken;
  }
  if (cliChatId) {
    process.env.TELEGRAM_ADMIN_CHAT_ID = cliChatId;
  }

  console.log(`TELEGRAM_BOT_TOKEN present: ${Boolean(botToken)} (Length: ${botToken.length})`);
  if (botToken) {
    const masked = botToken.substring(0, 6) + '...' + botToken.substring(botToken.length - 4);
    console.log(`TELEGRAM_BOT_TOKEN (masked): ${masked}`);
  } else {
    console.log('⚠️ TELEGRAM_BOT_TOKEN is EMPTY or undefined in process.env / .env!');
  }

  console.log(`TELEGRAM_ADMIN_CHAT_ID present: ${Boolean(adminChatId)} (Value: "${adminChatId}")`);
  if (!adminChatId) {
    console.log('⚠️ TELEGRAM_ADMIN_CHAT_ID is EMPTY or undefined in process.env / .env!');
  }
  console.log('------------------------------------------------------------');

  if (botToken) {
    // 1. Test getMe to verify bot token validity
    console.log('Step 1: Testing getMe (validating bot token)...');
    try {
      const getMeRes = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
      const getMeData: any = await getMeRes.json().catch(() => ({}));
      console.log(`getMe HTTP Status: ${getMeRes.status} ${getMeRes.statusText}`);
      console.log('getMe Response:', JSON.stringify(getMeData, null, 2));
      if (getMeData.ok) {
        console.log(`✓ Bot is valid: @${getMeData.result?.username} (ID: ${getMeData.result?.id})`);
      } else {
        console.log(`❌ Bot token rejected: ${getMeData.description}`);
      }
    } catch (e: any) {
      console.error('getMe network error:', e.message);
    }
    console.log('------------------------------------------------------------');

    // 2. Test getChat to verify admin chat accessibility
    if (adminChatId) {
      console.log(`Step 2: Testing getChat for chatId "${adminChatId}"...`);
      try {
        const getChatRes = await fetch(`https://api.telegram.org/bot${botToken}/getChat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: adminChatId })
        });
        const getChatData: any = await getChatRes.json().catch(() => ({}));
        console.log(`getChat HTTP Status: ${getChatRes.status} ${getChatRes.statusText}`);
        console.log('getChat Response:', JSON.stringify(getChatData, null, 2));
      } catch (e: any) {
        console.error('getChat network error:', e.message);
      }
      console.log('------------------------------------------------------------');
    }
  }

  // 3. Test sendPaymentAlert via telegramService
  console.log('Step 3: Calling telegramService.sendPaymentAlert with dummy data...');
  const dummyPayload = {
    paymentId: `test_pay_${Date.now()}`,
    userName: 'John Doe (Test User)',
    userEmail: 'johndoe@example.com',
    userPhone: '+91 9876543210',
    amountRupees: 499,
    productType: 'SUBSCRIPTION',
    planName: 'VIP Yearly Pass',
    utr: 'UTR987654321098',
    submittedAt: new Date().toISOString(),
    screenshotUrl: null
  };

  console.log('Dummy Payload:', JSON.stringify(dummyPayload, null, 2));
  console.log('Executing telegramService.sendPaymentAlert()...');

  try {
    const serviceResult = await telegramService.sendPaymentAlert(dummyPayload);
    console.log('telegramService.sendPaymentAlert returned:', serviceResult);
  } catch (err: any) {
    console.error('telegramService.sendPaymentAlert threw exception:', err);
  }
  console.log('------------------------------------------------------------');

  // 4. Also perform raw sendMessage fetch directly with full error details
  if (botToken && adminChatId) {
    console.log('Step 4: Raw Direct POST to /sendMessage for exact telegram error response...');
    try {
      const textUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const body = {
        chat_id: adminChatId,
        text: `🔔 <b>TEST PAYMENT ALERT</b>\n\n👤 <b>User:</b> John Doe\n💵 <b>Amount:</b> ₹499\n🔢 <b>UTR:</b> <code>UTR987654321098</code>\n\n<i>Test message directly from diagnostics script.</i>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Approve', callback_data: `pay_approve:test_123` },
              { text: '❌ Reject', callback_data: `pay_reject:test_123` }
            ]
          ]
        }
      };

      const res = await fetch(textUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      console.log(`Raw HTTP Status: ${res.status} ${res.statusText}`);
      const rawData = await res.json().catch(() => ({}));
      console.log('EXACT TELEGRAM RESPONSE OBJECT:');
      console.log(JSON.stringify(rawData, null, 2));
    } catch (e: any) {
      console.error('Raw fetch error:', e);
    }
  }

  console.log('============================================================');
  process.exit(0);
}

runTest();
