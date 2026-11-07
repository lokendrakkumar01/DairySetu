import { Types } from 'mongoose';
import DairyAccount from '../models/DairyAccount';
import User from '../models/User';
import DairySettings from '../models/DairySettings';
import { hashPassword, comparePassword } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { JwtPayload } from '../types';

interface RegisterAdminPayload {
  dairyName: string;
  ownerName: string;
  mobile: string;
  email?: string;
  password: string;
  village?: string;
  address?: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    role: string;
    dairyId: string;
  };
  dairy?: object;
}

export async function registerAdmin(payload: RegisterAdminPayload): Promise<LoginResult> {
  const existingDairy = await DairyAccount.findOne({ mobile: payload.mobile });
  if (existingDairy) {
    const err = new Error('Mobile number already registered') as Error & { statusCode: number };
    err.statusCode = 409;
    throw err;
  }

  const dairy = await DairyAccount.create({
    dairyName: payload.dairyName,
    ownerName: payload.ownerName,
    mobile: payload.mobile,
    email: payload.email,
    village: payload.village,
    address: payload.address,
  });

  // Create default settings
  await DairySettings.create({ dairyId: dairy._id });

  // admin username = mobile number
  const username = payload.mobile.trim().toLowerCase();
  const passwordHash = await hashPassword(payload.password);

  const user = await User.create({
    dairyId: dairy._id,
    role: 'admin',
    username,
    email: payload.email,
    passwordHash,
  });

  const jwtPayload: JwtPayload = {
    userId: (user._id as Types.ObjectId).toString(),
    dairyId: (dairy._id as Types.ObjectId).toString(),
    role: 'admin',
  };

  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(jwtPayload);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
      role: user.role,
      dairyId: (dairy._id as Types.ObjectId).toString(),
    },
    dairy: {
      id: (dairy._id as Types.ObjectId).toString(),
      dairyName: dairy.dairyName,
      ownerName: dairy.ownerName,
      mobile: dairy.mobile,
    },
  };
}

export async function loginAdmin(identifier: string, password: string): Promise<LoginResult> {
  // identifier can be mobile (username) or email
  const normalizedIdentifier = identifier.trim().toLowerCase();

  const user = await User.findOne({
    $or: [
      { username: normalizedIdentifier },
      { email: normalizedIdentifier },
    ],
    role: 'admin',
    isActive: true,
  });

  if (!user) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const dairy = await DairyAccount.findById(user.dairyId);
  if (!dairy || !dairy.isActive) {
    const err = new Error('Dairy account is inactive') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }

  const jwtPayload: JwtPayload = {
    userId: (user._id as Types.ObjectId).toString(),
    dairyId: (dairy._id as Types.ObjectId).toString(),
    role: 'admin',
  };

  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(jwtPayload);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
      role: user.role,
      dairyId: (dairy._id as Types.ObjectId).toString(),
    },
    dairy: {
      id: (dairy._id as Types.ObjectId).toString(),
      dairyName: dairy.dairyName,
      ownerName: dairy.ownerName,
      mobile: dairy.mobile,
      email: dairy.email,
      village: dairy.village,
      address: dairy.address,
      language: dairy.language,
      currency: dairy.currency,
    },
  };
}

export async function loginCustomer(
  username: string,
  password: string,
  dairyId?: string
): Promise<LoginResult> {
  const normalizedUsername = username.trim().toLowerCase();

  const query: Record<string, unknown> = {
    username: normalizedUsername,
    role: 'customer',
    isActive: true,
  };

  if (dairyId) {
    query.dairyId = new Types.ObjectId(dairyId);
  }

  const user = await User.findOne(query).populate('customerId');
  if (!user) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const err = new Error('Invalid credentials') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const jwtPayload: JwtPayload = {
    userId: (user._id as Types.ObjectId).toString(),
    dairyId: user.dairyId.toString(),
    role: 'customer',
    customerId: user.customerId?.toString(),
  };

  const accessToken = signAccessToken(jwtPayload);
  const refreshToken = signRefreshToken(jwtPayload);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: (user._id as Types.ObjectId).toString(),
      username: user.username,
      role: user.role,
      dairyId: user.dairyId.toString(),
    },
  };
}

export async function refreshTokens(token: string): Promise<{ accessToken: string; refreshToken: string }> {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    const err = new Error('Invalid refresh token') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const user = await User.findById(payload.userId);
  if (!user || user.refreshToken !== token) {
    const err = new Error('Refresh token revoked') as Error & { statusCode: number };
    err.statusCode = 401;
    throw err;
  }

  const jwtPayload: JwtPayload = {
    userId: (user._id as Types.ObjectId).toString(),
    dairyId: user.dairyId.toString(),
    role: user.role,
    customerId: user.customerId?.toString(),
  };

  const accessToken = signAccessToken(jwtPayload);
  const newRefreshToken = signRefreshToken(jwtPayload);

  user.refreshToken = newRefreshToken;
  await user.save();

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) {
    const err = new Error('Current password is incorrect') as Error & { statusCode: number };
    err.statusCode = 400;
    throw err;
  }

  user.passwordHash = await hashPassword(newPassword);
  user.refreshToken = undefined;
  await user.save();
}
