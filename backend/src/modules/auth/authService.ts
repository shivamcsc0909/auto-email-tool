import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../prisma.js';
import { env } from '../../config/env.js';
import { AdminUserDto } from '@rankrise/shared';

const TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function seedAdminIfNoneExists(): Promise<void> {
  try {
    const existing = await prisma.adminUser.findFirst();
    if (!existing) {
      const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
      await prisma.adminUser.create({
        data: {
          email: env.ADMIN_EMAIL,
          passwordHash,
          name: 'RankRise Administrator',
          role: 'ADMIN',
        },
      });
      console.log(`✅ Default admin account seeded for ${env.ADMIN_EMAIL}`);
    }
  } catch (error) {
    console.warn('Notice: Could not check/seed admin user (Database might be initializing):', error);
  }
}

export async function authenticateAdmin(email: string, password: string): Promise<{
  user: AdminUserDto;
  token: string;
} | null> {
  const user = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user) return null;

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return null;

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role } as TokenPayload,
    env.SESSION_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    token,
  };
}

export function verifySessionToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.SESSION_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
