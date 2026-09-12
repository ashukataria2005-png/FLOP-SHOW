export type TransactionType = 'credit' | 'debit';

export interface WalletTransaction {
  id: string;
  timestamp: string; // e.g. "11 Sep 2026, 12:30 PM"
  title: string; // e.g. "Wallet Recharge", "Purchased: Afterglow"
  amount: number; // e.g. 100 or 20
  type: TransactionType;
  contentId?: string;
  status: 'success' | 'failed';
}

export interface PurchaseRecord {
  id: string;
  contentId: string;
  title: string;
  price: number;
  purchasedAt: string;
}
