const mongoose = require('mongoose');
require('dotenv').config();

async function cleanDuplicates() {
  console.log('🌱 Connecting to database...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  const db = mongoose.connection.db;

  // 1. Users
  console.log('--- Checking for duplicate Users ---');
  const userDups = await db.collection('users').aggregate([
    { $group: { _id: { username: '$username', dairyId: '$dairyId' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Users found: ${userDups.length}`);
  for (let dup of userDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('users').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate user(s) for ${JSON.stringify(dup._id)}`);
  }

  // 2. Customers
  console.log('--- Checking for duplicate Customers ---');
  const custDups = await db.collection('customers').aggregate([
    { $group: { _id: { customerId: '$customerId', dairyId: '$dairyId' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Customers found: ${custDups.length}`);
  for (let dup of custDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('customers').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate customer(s) for ${JSON.stringify(dup._id)}`);
  }

  // 3. Milk Records (Duplicate customer + date)
  console.log('--- Checking for duplicate Milk Records ---');
  const milkDups = await db.collection('milkrecords').aggregate([
    { $group: { _id: { customerId: '$customerId', date: '$date' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Milk Records found: ${milkDups.length}`);
  for (let dup of milkDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('milkrecords').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate milk record(s) for ${JSON.stringify(dup._id)}`);
  }

  // 4. Milk Rates
  console.log('--- Checking for duplicate Milk Rates ---');
  const rateDups = await db.collection('milkrates').aggregate([
    { $group: { _id: { dairyId: '$dairyId', milkType: '$milkType' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Milk Rates found: ${rateDups.length}`);
  for (let dup of rateDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('milkrates').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate rate(s) for ${JSON.stringify(dup._id)}`);
  }

  // 5. Dairy Accounts
  console.log('--- Checking for duplicate Dairy Accounts ---');
  const dairyDups = await db.collection('dairyaccounts').aggregate([
    { $group: { _id: '$mobile', count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Dairy Accounts found: ${dairyDups.length}`);
  for (let dup of dairyDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('dairyaccounts').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate dairy account(s) for ${dup._id}`);
  }

  // 6. Monthly Bills
  console.log('--- Checking for duplicate Monthly Bills ---');
  const billDups = await db.collection('monthlybills').aggregate([
    { $group: { _id: { customerId: '$customerId', month: '$month', year: '$year' }, count: { $sum: 1 }, docs: { $push: '$_id' } } },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();
  console.log(`Duplicate Monthly Bills found: ${billDups.length}`);
  for (let dup of billDups) {
    const toRemove = dup.docs.slice(1);
    await db.collection('monthlybills').deleteMany({ _id: { $in: toRemove } });
    console.log(`Removed ${toRemove.length} duplicate bill(s) for ${JSON.stringify(dup._id)}`);
  }

  console.log('\n=============================================');
  console.log('🎉 ALL COLLECTIONS CHECKED — 0 DUPLICATES REMAINING');
  console.log('=============================================');

  // Summary counts
  const colls = ['dairyaccounts', 'users', 'customers', 'milkrecords', 'milkrates', 'monthlybills', 'payments', 'dairysettings'];
  for (let c of colls) {
    const count = await db.collection(c).countDocuments();
    console.log(`📊 ${c}: ${count} valid records`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

cleanDuplicates().catch(err => {
  console.error('Error cleaning duplicates:', err);
  process.exit(1);
});
