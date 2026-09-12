import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository, UserRecord } from '../repositories/userRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
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
    updatedAt: user.updated_at
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

    const existing = userRepository.findByEmail(cleanEmail);
    if (existing) {
      const err = new Error('An account with this email already exists.');
      (err as any).statusCode = 409;
      throw err;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);
    const id = `user-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    userRepository.create({
      id,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      now
    });

    // Create initial wallet for user (₹100 = 10,000 paise bonus for demo/testing)
    const initialPaise = 10000;
    walletRepository.createWallet(id, initialPaise, now);
    walletRepository.addTransaction({
      id: `tx-${crypto.randomUUID()}`,
      userId: id,
      type: 'RECHARGE',
      amount: initialPaise,
      balanceAfter: initialPaise,
      description: 'Welcome Bonus Credit',
      createdAt: now
    });

    const userRecord = userRepository.findById(id)!;
    const safeUser = toSafeUser(userRecord);
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
      (cleanEmail.toLowerCase() === config.adminId.toLowerCase() ||
       cleanEmail.toLowerCase() === (config.devAdminEmail || 'admin@flopshow.tv').toLowerCase()) &&
      params.password === config.adminPassword
    ) {
      const adminUser: SafeUser = {
        id: 'admin-master',
        name: 'FLOPSHOW Admin',
        email: config.devAdminEmail || 'admin@flopshow.tv',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const token = authService.generateToken(adminUser);
      return { user: adminUser, token };
    }

    const userRecord = userRepository.findByEmail(cleanEmail);
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

    const matchesId = cleanId.toLowerCase() === config.adminId.toLowerCase();
    const matchesPassword = cleanPassword === config.adminPassword;

    if (!matchesId || !matchesPassword) {
      const err = new Error('Invalid Admin ID or Admin Password.');
      (err as any).statusCode = 401;
      throw err;
    }

    const adminUser: SafeUser = {
      id: 'admin-master',
      name: 'FLOPSHOW Admin',
      email: config.devAdminEmail || 'admin@flopshow.tv',
      role: 'ADMIN',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const token = authService.generateToken(adminUser);
    return { user: adminUser, token };
  },

  generateToken(user: SafeUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
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

  getUserProfile(userId: string): SafeUser | null {
    if (userId === 'admin-master' || userId === 'admin-system') {
      return {
        id: userId,
        name: 'FLOPSHOW Admin',
        email: config.devAdminEmail || 'admin@flopshow.tv',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
    const record = userRepository.findById(userId);
    if (!record) return null;
    return toSafeUser(record);
  }
};
