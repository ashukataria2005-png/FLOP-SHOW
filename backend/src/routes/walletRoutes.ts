import { Router, Response } from 'express';
import { walletService } from '../services/walletService.js';
import { requireAuth, AuthenticatedRequest } from '../middlewares/authMiddleware.js';

export const walletRouter = Router();

// All wallet operations require authentication
walletRouter.use(requireAuth);

// GET /api/wallet/balance
walletRouter.get('/balance', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const summary = walletService.getBalance(req.user!.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions
walletRouter.get('/transactions', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const transactions = walletService.getTransactions(req.user!.id, limit);
    res.json({ count: transactions.length, transactions });
  } catch (err) {
    next(err);
  }
});

// POST /api/wallet/recharge
// Simulated recharge structure for Phase 2; prepared for real payment gateway webhook integration
walletRouter.post('/recharge', (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { amount, referenceId } = req.body;
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Valid positive recharge amount is required.'
        }
      });
      return;
    }

    const updatedWallet = walletService.recharge(req.user!.id, numAmount, referenceId);
    res.json({
      message: `Successfully credited ₹${numAmount} to wallet.`,
      wallet: updatedWallet
    });
  } catch (err) {
    next(err);
  }
});
