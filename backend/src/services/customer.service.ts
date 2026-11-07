import { Types } from 'mongoose';
import Customer from '../models/Customer';
import User from '../models/User';
import { hashPassword, generateTempPassword } from '../utils/password';
import { generateCustomerId } from '../utils/customerIdGen';

interface CreateCustomerPayload {
  dairyId: string;
  fullName: string;
  mobile: string;
  address?: string;
  village?: string;
  milkType?: 'cow' | 'buffalo' | 'mixed';
  defaultMorningQty?: number;
  defaultEveningQty?: number;
  joinDate?: Date;
}

interface UpdateCustomerPayload {
  fullName?: string;
  mobile?: string;
  address?: string;
  village?: string;
  milkType?: 'cow' | 'buffalo' | 'mixed';
  defaultMorningQty?: number;
  defaultEveningQty?: number;
  isActive?: boolean;
}

export async function createCustomer(
  payload: CreateCustomerPayload,
  createdByUserId: string
): Promise<{ customer: object; tempPassword: string; username: string }> {
  const dairyObjectId = new Types.ObjectId(payload.dairyId);
  const customerId = await generateCustomerId(dairyObjectId);

  const customer = await Customer.create({
    dairyId: dairyObjectId,
    customerId,
    fullName: payload.fullName,
    mobile: payload.mobile,
    address: payload.address,
    village: payload.village,
    milkType: payload.milkType || 'mixed',
    defaultMorningQty: payload.defaultMorningQty || 0,
    defaultEveningQty: payload.defaultEveningQty || 0,
    joinDate: payload.joinDate || new Date(),
  });

  // Create user account for customer
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const username = `${customerId.toLowerCase()}`;

  const user = await User.create({
    dairyId: dairyObjectId,
    role: 'customer',
    username,
    passwordHash,
    customerId: customer._id,
    isActive: true,
  });

  customer.userId = user._id as Types.ObjectId;
  await customer.save();

  void createdByUserId; // used in audit logs by caller

  return {
    customer,
    tempPassword,
    username,
  };
}

export async function updateCustomer(
  customerId: string,
  dairyId: string,
  payload: UpdateCustomerPayload
): Promise<object | null> {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, dairyId: new Types.ObjectId(dairyId) },
    { $set: payload },
    { new: true, runValidators: true }
  );
  return customer;
}

export async function softDeleteCustomer(
  customerId: string,
  dairyId: string
): Promise<boolean> {
  const result = await Customer.findOneAndUpdate(
    { _id: customerId, dairyId: new Types.ObjectId(dairyId) },
    { $set: { isActive: false } }
  );
  if (!result) return false;

  // Also deactivate user
  if (result.userId) {
    await User.findByIdAndUpdate(result.userId, { isActive: false });
  }
  return true;
}

export async function resetCustomerPassword(
  customerId: string,
  dairyId: string
): Promise<string> {
  const customer = await Customer.findOne({
    _id: customerId,
    dairyId: new Types.ObjectId(dairyId),
  });

  if (!customer) {
    const err = new Error('Customer not found') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  if (!customer.userId) {
    const err = new Error('Customer has no user account') as Error & { statusCode: number };
    err.statusCode = 404;
    throw err;
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await User.findByIdAndUpdate(customer.userId, { passwordHash });
  return tempPassword;
}
