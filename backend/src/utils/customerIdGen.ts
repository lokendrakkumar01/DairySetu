import Customer from '../models/Customer';
import { Types } from 'mongoose';

/**
 * Generate next customer ID for a dairy.
 * Format: DS001, DS002, ... DS999, DS1000
 */
export async function generateCustomerId(dairyId: Types.ObjectId): Promise<string> {
  const lastCustomer = await Customer.findOne({ dairyId })
    .sort({ createdAt: -1 })
    .select('customerId')
    .lean();

  if (!lastCustomer) {
    return 'DS001';
  }

  const lastId = lastCustomer.customerId;
  const numericPart = parseInt(lastId.replace(/^DS/, ''), 10);
  const nextNum = numericPart + 1;
  const padded = nextNum.toString().padStart(3, '0');
  return `DS${padded}`;
}
