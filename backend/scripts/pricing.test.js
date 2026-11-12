const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveMilkRate, calculateMilkProcurementAmount } = require('../dist/src/utils/milkRateUtils')

const customerId = '64b000000000000000000001'

test('customer-specific purchase rate overrides this dairy default', () => {
  const rates = [
    { customerId: null, milkType: 'cow', rateUnit: 'kg', ratePerLitre: 42 },
    { customerId, milkType: 'cow', rateUnit: 'kg', ratePerLitre: 48.5 },
  ]
  assert.equal(resolveMilkRate(rates, customerId, 'cow', 'kg'), 48.5)
})

test('Mongo-style customer IDs match the configured customer rate', () => {
  const rates = [{ customerId: { toString: () => customerId }, milkType: 'cow', rateUnit: 'kg', ratePerLitre: 47 }]
  assert.equal(resolveMilkRate(rates, customerId, 'cow', 'kg'), 47)
})

test('a customer without an override receives the dairy cow rate', () => {
  const rates = [{ customerId: null, milkType: 'cow', rateUnit: 'kg', ratePerLitre: 42 }]
  assert.equal(resolveMilkRate(rates, customerId, 'cow', 'kg'), 42)
})

test('a dairy mixed purchase rate is the last milk-type fallback', () => {
  const rates = [{ customerId: null, milkType: 'mixed', rateUnit: 'kg', ratePerLitre: 39 }]
  assert.equal(resolveMilkRate(rates, customerId, 'buffalo', 'kg'), 39)
})

test('supply litre rates never become purchase kg rates', () => {
  const rates = [{ customerId: null, milkType: 'cow', rateUnit: 'litre', ratePerLitre: 60 }]
  assert.equal(resolveMilkRate(rates, customerId, 'cow', 'kg'), null)
})

test('old rates without a unit remain usable as litre supply rates', () => {
  const rates = [{ customerId: null, milkType: 'cow', ratePerLitre: 60 }]
  assert.equal(resolveMilkRate(rates, customerId, 'cow', 'litre'), 60)
})

test('accepted collection amount is rounded to paise', () => {
  assert.equal(calculateMilkProcurementAmount(10.5, 45.25, true), 475.13)
})

test('rejected collection has no payable amount', () => {
  assert.equal(calculateMilkProcurementAmount(10.5, 45.25, false), 0)
})
