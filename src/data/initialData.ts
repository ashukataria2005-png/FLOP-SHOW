import { User, WatchProgress } from '../types/user';
import { WalletTransaction, PurchaseRecord } from '../types/transaction';

/**
 * INITIAL CLEAN USER STATE FOR FLOPSHOW
 * All collections start empty except a starting ₹100 test balance for wallet demo.
 */
export const INITIAL_USER: User = {
  id: "user-demo-01",
  name: "Demo User",
  email: "demo@flopshow.tv",
  avatarInitials: "DU",
  joinedDate: "September 2026"
};

export const INITIAL_WALLET_BALANCE: number = 100;

export const INITIAL_PURCHASES: PurchaseRecord[] = [];

export const INITIAL_MY_LIST: string[] = [];

export const INITIAL_WATCH_PROGRESS: WatchProgress[] = [];

export const INITIAL_TRANSACTIONS: WalletTransaction[] = [
  {
    id: "tx-init-welcome",
    timestamp: "11 Sep 2026, 12:00 PM",
    title: "Welcome Bonus Credit",
    amount: 100,
    type: "credit",
    status: "success"
  }
];
