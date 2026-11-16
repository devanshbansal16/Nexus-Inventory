const allocationService = require('../src/services/allocation.service');

describe('Smart Warehouse Allocation Logic', () => {
  it('should have configurable weights for distance, stock, cost, and priority', () => {
    expect(allocationService.weights.proximity).toBeDefined();
    expect(allocationService.weights.stockSufficiency).toBeDefined();
    expect(allocationService.weights.shippingCost).toBeDefined();
    expect(allocationService.weights.priority).toBeDefined();

    const sum =
      allocationService.weights.proximity +
      allocationService.weights.stockSufficiency +
      allocationService.weights.shippingCost +
      allocationService.weights.priority;

    expect(Math.round(sum * 100) / 100).toBe(1.0);
  });
});
