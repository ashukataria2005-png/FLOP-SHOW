import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository, UserRecord } from '../repositories/userRepository.js';
import { walletRepository } from '../repositories/walletRepository.js';
import { getAdapter } from '../db/adapter.js';
import { config } from '../config/env.js';

export const ALL_ADMIN_PERMISSIONS: string[] = [
  'analytics',
  'monetization',
  'promos',
  'payments',
  'catalog',
  'users',
  'settings',
];

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  is_super_admin?: boolean;
  permissions?: string[];
  last_login_at?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function isSuperAdminUser(user: { is_super_admin?: any; email?: string | null }): boolean {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  if (email === 'ashukataria2005@gmail.com') {
    return true;
  }
  if (config.adminId && email === config.adminId.toLowerCase()) {
    return true;
  }
  return false;
}

export function toSafeUser(user: UserRecord): SafeUser {
  let isSuperAdmin = false;
  let perms: string[] = [];

  if (user.role === 'ADMIN') {
    isSuperAdmin = isSuperAdminUser(user);

    if (isSuperAdmin) {
      perms = ['*'];
    } else if (user.permissions) {
      try {
        perms = typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions as any);
        if (!Array.isArray(perms)) perms = [];
      } catch {
        perms = [];
      }
    }
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    status: user.status,
    is_super_admin: isSuperAdmin,
    permissions: perms,
    last_login_at: user.last_login_at || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

export const authService = {
  async register(params: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
  }): Promise<{ user: SafeUser; token: string }> {
    const cleanName = (params.name || '').trim();
    const rawEmail = (params.email || '').trim().toLowerCase();
    const rawPhone = (params.phone || '').trim().replace(/[^0-9]/g, '');

    if (!cleanName) {
      throw new Error('Name is required.');
    }

    if (!params.password || params.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    if (!rawEmail && !rawPhone) {
      throw new Error('Please provide an email address or mobile number to register.');
    }

    let finalEmail = rawEmail;
    let finalPhone: string | null = null;

    if (rawPhone) {
      if (rawPhone.length < 10) {
        throw new Error('Please enter a valid 10-digit mobile number.');
      }
      finalPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      // If user registered with mobile only, generate synthetic email
      if (!finalEmail) {
        finalEmail = `${finalPhone}@flopshow.user`;
      }
      const existingPhone = await userRepository.findByPhone(finalPhone);
      if (existingPhone) {
        const err = new Error('An account with this mobile number already exists.');
        (err as any).statusCode = 409;
        throw err;
      }
    }

    if (rawEmail && (!rawEmail.includes('@') || !rawEmail.includes('.'))) {
      throw new Error('Please enter a valid email address.');
    }

    const existingEmail = await userRepository.findByEmail(finalEmail);
    if (existingEmail) {
      const err = new Error('An account with this email address already exists.');
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
      email: finalEmail,
      phone: finalPhone,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      now,
    });

    // Create initial wallet for user with 0 balance (legacy ₹100 auto-bonus removed)
    const initialPaise = 0;
    await walletRepository.createWallet(id, initialPaise, now);

    const userRecord = await userRepository.findById(id);
    const safeUser = toSafeUser(userRecord!);
    const token = authService.generateToken(safeUser);

    return { user: safeUser, token };
  },

  async login(params: {
    email: string;
    password: string;
  }): Promise<{ user: SafeUser; token: string }> {
    const rawInput = (params.email || '').trim();

    if (!rawInput || !params.password) {
      const err = new Error('Email or mobile number and password are required.');
      (err as any).statusCode = 400;
      throw err;
    }

    // Direct Admin credentials check
    if (
      config.adminPassword &&
      (rawInput.toLowerCase() === config.adminId.toLowerCase() ||
        rawInput.toLowerCase() === 'admin' ||
        rawInput.toLowerCase() === 'ashukataria2005@gmail.com') &&
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

    const userRecord = await userRepository.findByEmailOrPhone(rawInput);
    if (!userRecord) {
      const err = new Error('Invalid email, mobile number or password.');
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
    const cleanId = (params.adminId || '').trim().toLowerCase();
    const cleanPassword = params.adminPassword || '';

    if (!cleanId || !cleanPassword) {
      const err = new Error('Admin ID and Admin Password are required.');
      (err as any).statusCode = 400;
      throw err;
    }

    const db = getAdapter();

    // Check if logging in as root super admin via config ID/alias
    const isRootAdminInput =
      cleanId === config.adminId.toLowerCase() ||
      cleanId === 'admin' ||
      cleanId === 'ashukataria2005@gmail.com';

    console.log(`[authService.adminLogin] id="${cleanId}" isRootAdminInput=${isRootAdminInput}`);

    let targetAdmin: any = null;

    if (isRootAdminInput) {
      // Find root admin in database by is_super_admin flag OR email
      const { rows } = await db.query(
        "SELECT * FROM users WHERE (is_super_admin = 1 OR LOWER(email) = 'ashukataria2005@gmail.com') AND role = 'ADMIN' LIMIT 1"
      );
      if (rows.length > 0) {
        targetAdmin = rows[0];
        console.log(`[authService.adminLogin] Found Super Admin in DB: id=${targetAdmin.id}, email=${targetAdmin.email}, status=${targetAdmin.status}`);
      } else {
        // Fall back to first admin role account (any status)
        const { rows: firstAdmin } = await db.query(
          "SELECT * FROM users WHERE role = 'ADMIN' LIMIT 1"
        );
        if (firstAdmin.length > 0) {
          targetAdmin = firstAdmin[0];
          console.log(`[authService.adminLogin] Fallback to first ADMIN: id=${targetAdmin.id}, email=${targetAdmin.email}, status=${targetAdmin.status}`);
        }
      }
    } else {
      // Find sub-admin by email or ID
      const { rows } = await db.query(
        "SELECT * FROM users WHERE role = 'ADMIN' AND (LOWER(email) = ? OR id = ?) LIMIT 1",
        [cleanId, cleanId]
      );
      if (rows.length > 0) {
        targetAdmin = rows[0];
        console.log(`[authService.adminLogin] Found sub-admin: id=${targetAdmin.id}, email=${targetAdmin.email}, status=${targetAdmin.status}`);
      }
    }

    if (!targetAdmin) {
      console.warn(`[authService.adminLogin] No admin record found for "${cleanId}"`);
      const err = new Error('No administrator account found for that email or ID. Please contact support.');
      (err as any).statusCode = 401;
      throw err;
    }

    // SUPER ADMIN IMMUNITY: If identified as Super Admin, their account is always ACTIVE.
    // This prevents stale DB status from locking out the primary administrator.
    const isSuperAdmin = isSuperAdminUser(targetAdmin);
    if (isSuperAdmin && targetAdmin.status !== 'ACTIVE') {
      console.warn(`[authService.adminLogin] Super Admin had non-ACTIVE status ("${targetAdmin.status}"). Forcing ACTIVE for login...`);
      const now = new Date().toISOString();
      await db.run(
        `UPDATE users SET status = 'ACTIVE', is_super_admin = 1, updated_at = ? WHERE id = ?;`,
        [now, targetAdmin.id]
      );
      targetAdmin.status = 'ACTIVE';
    }

    if (targetAdmin.status !== 'ACTIVE') {
      const err = new Error(`Administrator account is ${targetAdmin.status.toLowerCase()}. Access denied.`);
      (err as any).statusCode = 403;
      throw err;
    }

    // Validate password:
    // Priority 1: Config env password match (for Super Admin or root input)
    let passwordMatches = Boolean(
      (isRootAdminInput || isSuperAdmin) &&
      config.adminPassword &&
      cleanPassword === config.adminPassword
    );

    console.log(`[authService.adminLogin] Env password match: ${passwordMatches}`);

    // Priority 2: bcrypt hash comparison (works for all admins)
    if (!passwordMatches && targetAdmin.password_hash) {
      passwordMatches = await bcrypt.compare(cleanPassword, targetAdmin.password_hash);
      console.log(`[authService.adminLogin] bcrypt hash match: ${passwordMatches}`);
    }

    if (!passwordMatches) {
      console.warn(`[authService.adminLogin] Password verification failed for "${cleanId}"`);
      const err = new Error('Incorrect password. Please check your admin password and try again.');
      (err as any).statusCode = 401;
      throw err;
    }

    // Update last_login_at
    const now = new Date().toISOString();
    await userRepository.updateLastLogin(targetAdmin.id, now);
    targetAdmin.last_login_at = now;

    const safeUser = toSafeUser(targetAdmin);
    const token = authService.generateToken(safeUser);

    console.log(`[authService.adminLogin] ✓ Login success for "${cleanId}" (is_super_admin=${safeUser.is_super_admin}, permissions=${JSON.stringify(safeUser.permissions)})`);
    return { user: safeUser, token };
  },

  generateToken(user: SafeUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        is_super_admin: Boolean(user.is_super_admin),
        permissions: user.permissions || [],
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  },

  verifyToken(token: string): {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    is_super_admin?: boolean;
    permissions?: string[];
  } {
    try {
      const payload = jwt.verify(token, config.jwtSecret) as any;
      const isSuper = isSuperAdminUser(payload);
      return {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        is_super_admin: isSuper,
        permissions: isSuper
          ? ['*']
          : (Array.isArray(payload.permissions) ? payload.permissions : []),
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
