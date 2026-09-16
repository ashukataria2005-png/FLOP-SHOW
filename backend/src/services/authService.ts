import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository, UserRecord } from '../repositories/userRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export function toSafeUser(user: UserRecord): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export const authService = {
  async register(params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: SafeUser; token: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanName = params.name.trim();

    if (!cleanEmail || !params.password || !cleanName) {
      throw new Error('Name, email, and password are required.');
    }

    if (params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account with this email already exists.');
      (err as any).statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);
    const id = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    await userRepository.create({
      id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      now,
    });

    // Create initial wallet for user (₹100 = 10,000 paise bonus for demo/testing)
    const initialPaise = 10000;
    await walletRepository.createWallet(id, initialPaise, now);
    await walletRepository.addTransaction({
      id: `tx-${crypto.randomUUID()}`,
      userId: id,
      type: 'RECHARGE',
      amount: initialPaise,
      balanceAfter: initialPaise,
      description: 'Welcome Bonus Credit',
      createdAt: now,
    });

    const userRecord = await userRepository.findById(id);
    const safeUser = toSafeUser(userRecord!);
    const token = authService.generateToken(safeUser);

    return { user: safeUser, token };
  },

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: SafeUser; token: string }> {
    const cleanEmail = params.email.trim().toLowerCase();

    if (!cleanEmail || !params.password) {
      const err = new Error('Email and password are required.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Direct Admin credentials check
    if (
      config.adminPassword &&
      (cleanEmail.toLowerCase() === config.adminId.toLowerCase() ||
        cleanEmail.toLowerCase() === 'admin' ||
        cleanEmail.toLowerCase() === 'ashukataria2005@gmail.com') &&
      params.password === config.adminPassword
    ) {
      const db = getAdapter();
      const { rows: adminRows } = await db.query(
        "SELECT id, name, email, role, status, created_at, updated_at FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1"
      );
      if (adminRows.length > 0) {
        const dbAdmin = adminRows[0] as any;
        const adminUser: SafeUser = {
          id: dbAdmin.id,
          name: dbAdmin.name || 'Ashu Kataria',
          email: dbAdmin.email,
          role: 'ADMIN',
          status: 'ACTIVE',
          createdAt: dbAdmin.created_at || new Date().toISOString(),
          updatedAt: dbAdmin.updated_at || new Date().toISOString(),
        };
        const token = authService.generateToken(adminUser);
        return { user: adminUser, token };
      }
    }

    const userRecord = await userRepository.findByEmail(cleanEmail);
    if (!userRecord) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      throw err;
    }

    if (userRecord.status !== 'ACTIVE') {
      const err = new Error(`Account is ${userRecord.status.toLowerCase()}.`);
      (err as any).statusCode = 403;
      throw err;
    }

    const match = await bcrypt.compare(params.password, userRecord.password_hash);
    if (!match) {
      const err = new Error('Invalid email or password.');
      (err as any).statusCode = 401;
      throw err;
    }

    const safeUser = toSafeUser(userRecord);
    const token = authService.generateToken(safeUser);

    return { user: safeUser, token };
  },

  async adminLogin(params: {
    adminId: string;
    adminPassword: string;
  }): Promise<{ user: SafeUser; token: string }> {
    const cleanId = (params.adminId || '').trim();
    const cleanPassword = params.adminPassword || '';

    if (!cleanId || !cleanPassword) {
      const err = new Error('Admin ID and Admin Password are required.');
      (err as any).statusCode = 400;
      throw err;
    }

    const db = getAdapter();
    const { rows: adminRows } = await db.query(
      "SELECT id, name, email, password_hash, role, status, created_at, updated_at FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' LIMIT 1"
    );

    if (adminRows.length === 0) {
      const err = new Error('No active administrator account is configured in the database.');
      (err as any).statusCode = 503;
      throw err;
    }

    const dbAdmin = adminRows[0] as any;

    const matchesId =
      cleanId.toLowerCase() === config.adminId.toLowerCase() ||
      cleanId.toLowerCase() === dbAdmin.email.toLowerCase() ||
      cleanId.toLowerCase() === 'ashukataria2005@gmail.com';

    let matchesPassword = Boolean(
      config.adminPassword && cleanPassword === config.adminPassword
    );

    if (!matchesPassword && dbAdmin.password_hash) {
      matchesPassword = await bcrypt.compare(cleanPassword, dbAdmin.password_hash);
    }

    if (!matchesId || !matchesPassword) {
      const err = new Error('Invalid Admin ID or Admin Password.');
      (err as any).statusCode = 401;
      throw err;
    }

    const adminUser: SafeUser = {
      id: dbAdmin.id,
      name: dbAdmin.name || 'Ashu Kataria',
      email: dbAdmin.email,
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: dbAdmin.created_at || new Date().toISOString(),
      updatedAt: dbAdmin.updated_at || new Date().toISOString(),
    };

    const token = authService.generateToken(adminUser);
    return { user: adminUser, token };
  },

  generateToken(user: SafeUser): string {
    return jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  },

  verifyToken(token: string): { id: string; email: string; role: 'USER' | 'ADMIN' } {
    try {
      return jwt.verify(token, config.jwtSecret) as {
        id: string;
        email: string;
        role: 'USER' | 'ADMIN';
      };
    } catch (err) {
      const error = new Error('Invalid or expired authentication token.');
      (error as any).statusCode = 401;
      throw error;
    }
  },

  async getUserProfile(userId: string): Promise<SafeUser | null> {
    const record = await userRepository.findById(userId);
    if (!record) return null;
    return toSafeUser(record);
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!currentPassword || !newPassword) {
      const err = new Error('Current password and new password are required.');
      (err as any).statusCode = 400;
      throw err;
    }

    if (newPassword.length < 6) {
      const err = new Error('New password must be at least 6 characters long.');
      (err as any).statusCode = 400;
      throw err;
    }

    const userRecord = await userRepository.findById(userId);
    if (!userRecord) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const match = await bcrypt.compare(currentPassword, userRecord.password_hash);
    if (!match) {
      const err = new Error('Current password is incorrect.');
      (err as any).statusCode = 401;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    const now = new Date().toISOString();

    await userRepository.updatePassword(userId, passwordHash, now);
  },

  async updateProfile(userId: string, name: string, email?: string): Promise<SafeUser> {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      const err = new Error('Name cannot be empty.');
      (err as any).statusCode = 400;
      throw err;
    }

    const userRecord = await userRepository.findById(userId);
    if (!userRecord) {
      const err = new Error('User not found.');
      (err as any).statusCode = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (cleanEmail && cleanEmail !== userRecord.email.toLowerCase()) {
      const existing = await userRepository.findByEmail(cleanEmail);
      if (existing && existing.id !== userId) {
        const err = new Error('An account with this email already exists.');
        (err as any).statusCode = 409;
        throw err;
      }
      await userRepository.updateProfileAndEmail(userId, cleanName, cleanEmail, now);
    } else {
      await userRepository.updateProfile(userId, cleanName, now);
    }

    const updated = await userRepository.findById(userId);
    return toSafeUser(updated!);
  },
};
