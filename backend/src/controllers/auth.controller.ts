import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../types';
import {
  registerAdmin,
  loginAdmin,
  loginCustomer,
  refreshTokens,
  logoutUser,
  changePassword,
} from '../services/auth.service';
import { sendSuccess, sendError } from '../utils/responseHelper';

export const RegisterAdminSchema = z.object({
  dairyName: z.string().min(2).max(100),
  ownerName: z.string().min(2).max(100),
  mobile: z.string().min(10).max(15),
  email: z.string().email().optional(),
  password: z.string().min(6).max(100),
  village: z.string().optional(),
  address: z.string().optional(),
});

export const LoginAdminSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const LoginCustomerSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  dairyId: z.string().optional(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
});

export async function adminRegister(req: AuthRequest, res: Response): Promise<void> {
  const body = RegisterAdminSchema.parse(req.body);
  const result = await registerAdmin(body);
  sendSuccess(res, result, 'Admin registered successfully', 201);
}

export async function adminLogin(req: AuthRequest, res: Response): Promise<void> {
  const { identifier, password } = LoginAdminSchema.parse(req.body);
  const result = await loginAdmin(identifier, password);
  sendSuccess(res, result, 'Login successful');
}

export async function customerLogin(req: AuthRequest, res: Response): Promise<void> {
  const { username, password, dairyId } = LoginCustomerSchema.parse(req.body);
  const result = await loginCustomer(username, password, dairyId);
  sendSuccess(res, result, 'Login successful');
}

export async function refresh(req: AuthRequest, res: Response): Promise<void> {
  const { refreshToken } = RefreshTokenSchema.parse(req.body);
  const result = await refreshTokens(refreshToken);
  sendSuccess(res, result, 'Tokens refreshed');
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  await logoutUser(req.user.userId);
  sendSuccess(res, null, 'Logged out successfully');
}

export async function adminChangePassword(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
  await changePassword(req.user.userId, currentPassword, newPassword);
  sendSuccess(res, null, 'Password changed successfully');
}
