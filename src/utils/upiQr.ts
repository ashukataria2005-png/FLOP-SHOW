import QRCode from 'qrcode';

/**
 * Generates an official UPI payment URI and returns a high-resolution base64 PNG data URL.
 * Standard UPI URI Format:
 * upi://pay?pa=<UPI_ID>&pn=<MERCHANT_NAME>&am=<AMOUNT>&cu=INR
 */
export async function generateUpiQrDataUrl(
  upiId: string,
  amount: number,
  merchantName = 'FLOPSHOW'
): Promise<string> {
  const cleanUpi = upiId.trim();
  const encodedName = encodeURIComponent(merchantName.trim() || 'FLOPSHOW');
  const amountStr = amount.toFixed(2);
  const upiUri = `upi://pay?pa=${cleanUpi}&pn=${encodedName}&am=${amountStr}&cu=INR`;

  return QRCode.toDataURL(upiUri, {
    width: 280,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0E0E14',
      light: '#FFFFFF',
    },
  });
}
