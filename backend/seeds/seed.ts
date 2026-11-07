import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { env } from '../src/config/env';
import DairyAccount from '../src/models/DairyAccount';
import User from '../src/models/User';
import Customer from '../src/models/Customer';
import MilkRecord from '../src/models/MilkRecord';
import MilkRate from '../src/models/MilkRate';
import Payment from '../src/models/Payment';
import DairySettings from '../src/models/DairySettings';
import { hashPassword } from '../src/utils/password';

async function seed() {
  console.log('🌱 Connecting to database...');
  await mongoose.connect(env.MONGODB_URI, { dbName: env.DB_NAME });
  console.log('✅ Connected');

  // Clean up existing seed data
  console.log('🗑️  Cleaning existing seed data...');
  await DairyAccount.deleteMany({ mobile: '9876543210' });

  // 1. Create Dairy Account
  console.log('🏭 Creating dairy account...');
  const dairy = await DairyAccount.create({
    dairyName: 'Shree Gau Dairy',
    ownerName: 'Ramesh Kumar',
    mobile: '9876543210',
    email: 'ramesh@shreegaudairy.com',
    address: 'Main Road, Near Temple',
    village: 'Ramnagar',
    language: 'hi',
    currency: 'INR',
  });

  // 2. Create Dairy Settings
  await DairySettings.create({ dairyId: dairy._id });

  // 3. Create Admin User
  console.log('👤 Creating admin user...');
  const adminPasswordHash = await hashPassword('Admin@123');
  const adminUser = await User.create({
    dairyId: dairy._id,
    role: 'admin',
    username: '9876543210',
    email: 'ramesh@shreegaudairy.com',
    passwordHash: adminPasswordHash,
    isActive: true,
  });

  // 4. Set default milk rates
  console.log('💰 Setting milk rates...');
  await MilkRate.insertMany([
    {
      dairyId: dairy._id,
      customerId: null,
      milkType: 'cow',
      ratePerLitre: 55,
      effectiveFrom: new Date('2026-01-01'),
      createdBy: adminUser._id,
    },
    {
      dairyId: dairy._id,
      customerId: null,
      milkType: 'buffalo',
      ratePerLitre: 70,
      effectiveFrom: new Date('2026-01-01'),
      createdBy: adminUser._id,
    },
    {
      dairyId: dairy._id,
      customerId: null,
      milkType: 'mixed',
      ratePerLitre: 60,
      effectiveFrom: new Date('2026-01-01'),
      createdBy: adminUser._id,
    },
  ]);

  // 5. Create Customers
  console.log('👥 Creating 5 customers...');
  const customerData = [
    { fullName: 'Rahul Kumar', mobile: '9811111111', village: 'Ramnagar', milkType: 'cow', defaultMorningQty: 2, defaultEveningQty: 1.5, customerId: 'DS001' },
    { fullName: 'Priya Sharma', mobile: '9822222222', village: 'Ramnagar', milkType: 'buffalo', defaultMorningQty: 1, defaultEveningQty: 1, customerId: 'DS002' },
    { fullName: 'Suresh Yadav', mobile: '9833333333', village: 'Govindpur', milkType: 'mixed', defaultMorningQty: 1.5, defaultEveningQty: 1, customerId: 'DS003' },
    { fullName: 'Meena Devi', mobile: '9844444444', village: 'Ramnagar', milkType: 'cow', defaultMorningQty: 2, defaultEveningQty: 2, customerId: 'DS004' },
    { fullName: 'Ajay Singh', mobile: '9855555555', village: 'Krishnapur', milkType: 'buffalo', defaultMorningQty: 0.5, defaultEveningQty: 0.5, customerId: 'DS005' },
  ] as const;

  const customers = [];
  for (const data of customerData) {
    const customer = await Customer.create({
      ...data,
      dairyId: dairy._id,
      joinDate: new Date('2026-01-01'),
      isActive: true,
    });

    // Create customer user account
    const tempPassword = `${data.customerId}@123`;
    const passwordHash = await hashPassword(tempPassword);
    const customerUser = await User.create({
      dairyId: dairy._id,
      role: 'customer',
      username: data.customerId.toLowerCase(),
      passwordHash,
      customerId: customer._id,
      isActive: true,
    });

    // Link user to customer
    await Customer.findByIdAndUpdate(customer._id, { userId: customerUser._id });
    customers.push(customer);
    console.log(`  ✅ ${data.fullName} (${data.customerId}) | Login: ${data.customerId.toLowerCase()} / ${tempPassword}`);
  }

  // 6. Generate Milk Records for November 2026
  console.log('\n🥛 Generating November 2026 milk records...');
  const rateMap: Record<string, number> = { cow: 55, buffalo: 70, mixed: 60 };
  const records = [];

  for (const customer of customers) {
    const milkType = customer.milkType as 'cow' | 'buffalo' | 'mixed';
    const rate = rateMap[milkType];

    for (let day = 1; day <= 7; day++) {
      const date = new Date(2026, 10, day, 0, 0, 0, 0); // November 2026
      const morningQty = customer.defaultMorningQty * (0.9 + Math.random() * 0.2);
      const eveningQty = customer.defaultEveningQty * (0.9 + Math.random() * 0.2);
      const mq = parseFloat(morningQty.toFixed(1));
      const eq = parseFloat(eveningQty.toFixed(1));
      const totalQty = parseFloat((mq + eq).toFixed(1));

      records.push({
        dairyId: dairy._id,
        customerId: customer._id,
        date,
        morningQty: mq,
        eveningQty: eq,
        totalQty,
        milkType,
        rateApplied: rate,
        amount: parseFloat((totalQty * rate).toFixed(2)),
        createdBy: adminUser._id,
      });
    }
  }

  await MilkRecord.insertMany(records);
  console.log(`  ✅ ${records.length} milk records created`);

  // 7. Create sample payments
  console.log('\n💳 Creating sample payments...');
  const payment1 = await Payment.create({
    dairyId: dairy._id,
    customerId: customers[0]._id,
    amount: 1500,
    paymentMethod: 'cash',
    paymentDate: new Date('2026-11-05'),
    receiptNumber: `RCP-${Date.now()}-A1B2C3`,
    notes: 'Monthly payment - October',
    recordedBy: adminUser._id,
  });
  await Customer.findByIdAndUpdate(customers[0]._id, { $inc: { currentBalance: -1500 } });

  const payment2 = await Payment.create({
    dairyId: dairy._id,
    customerId: customers[1]._id,
    amount: 800,
    paymentMethod: 'upi',
    paymentDate: new Date('2026-11-06'),
    receiptNumber: `RCP-${Date.now()}-D4E5F6`,
    reference: 'UPI-9876543210',
    recordedBy: adminUser._id,
  });
  await Customer.findByIdAndUpdate(customers[1]._id, { $inc: { currentBalance: -800 } });

  console.log('  ✅ 2 payments recorded');

  console.log('\n' + '='.repeat(60));
  console.log('✅ SEED COMPLETED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📋 Admin Login:');
  console.log(`   Username: 9876543210`);
  console.log(`   Password: Admin@123`);
  console.log('\n📋 Customer Logins:');
  customerData.forEach((c) => {
    console.log(`   ${c.fullName}: ${c.customerId.toLowerCase()} / ${c.customerId}@123`);
  });
  console.log('\n🏭 Dairy: Shree Gau Dairy');
  console.log('='.repeat(60) + '\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
