import QRCode from 'qrcode';

/**
 * Generates an official UPI payment URI and returns a high-resolution base64 PNG data URL.
 * Standard UPI URI Format:
 * upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR
 */
export async function generateUpiQrDataUrl(
  upiId: string,
  amount: number | string,
  merchantName = 'FLOPSHOW'
): Promise<string> {
  const cleanUpi = (upiId || 'flopshow@upi').trim();
  const cleanMerchant = (merchantName || 'FLOPSHOW').trim();
  const numAmount = Number(amount);
  const validAmount = !isNaN(numAmount) && numAmount > 0 ? numAmount : 149;
  const amountStr = validAmount.toFixed(2);
  const encodedName = encodeURIComponent(cleanMerchant);
  const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodedName}&am=${amountStr}&cu=INR`;

  try {
    return await QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0E0E14',
        light: '#FFFFFF',
      },
    });
  } catch (err) {
    console.error('generateUpiQrDataUrl QR generation error:', err);
    return '';
  }
}
