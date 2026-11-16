const { getAdapter, getAllAdapters } = require('../src/adapters/marketplace');

describe('Marketplace Adapters & Simulator Tests', () => {
  it('should support all 4 required platforms', () => {
    const platforms = ['amazon', 'flipkart', 'meesho', 'shopify'];
    platforms.forEach((platform) => {
      const adapter = getAdapter(platform);
      expect(adapter).toBeDefined();
      expect(adapter.code).toBe(platform);
      expect(adapter.isSimulated).toBe(true);
    });
  });

  it('AmazonAdapter should normalize Amazon SP-API payloads', () => {
    const adapter = getAdapter('amazon');
    const rawAmazonPayload = {
      AmazonOrderId: 'AMZ-402-9182374',
      BuyerInfo: { BuyerName: 'Rahul Sharma', BuyerEmail: 'rahul@buyer.in' },
      ShippingAddress: { City: 'Delhi', StateOrRegion: 'Delhi', PostalCode: '110001' },
      OrderItems: [{ SellerSKU: 'LAP-MBP-16', QuantityOrdered: 2, ItemPrice: { Amount: 249900 } }],
      OrderTotal: { Amount: 499800 },
    };

    const normalized = adapter.normalizeOrder(rawAmazonPayload);
    expect(normalized.marketplaceOrderId).toBe('AMZ-402-9182374');
    expect(normalized.marketplaceCode).toBe('amazon');
    expect(normalized.customer.name).toBe('Rahul Sharma');
    expect(normalized.items).toHaveLength(1);
    expect(normalized.items[0].sku).toBe('LAP-MBP-16');
    expect(normalized.items[0].quantity).toBe(2);
    expect(normalized.totalAmount).toBe(499800);
  });

  it('FlipkartAdapter should normalize Flipkart order payloads', () => {
    const adapter = getAdapter('flipkart');
    const rawFlipkartPayload = {
      orderId: 'FLP-8293719284',
      deliveryAddress: { name: 'Pooja Hegde', city: 'Mumbai', pincode: '400001' },
      orderItems: [{ sku: 'MOB-IPH-15P', quantity: 1, sellingPrice: 159900 }],
      totalPrice: 159900,
    };

    const normalized = adapter.normalizeOrder(rawFlipkartPayload);
    expect(normalized.marketplaceOrderId).toBe('FLP-8293719284');
    expect(normalized.marketplaceCode).toBe('flipkart');
    expect(normalized.customer.name).toBe('Pooja Hegde');
    expect(normalized.items[0].sku).toBe('MOB-IPH-15P');
  });

  it('MeeshoAdapter should normalize Meesho sub-order payloads', () => {
    const adapter = getAdapter('meesho');
    const rawMeeshoPayload = {
      sub_order_id: 'MSH-992182',
      customer: { name: 'Amitabh Sen', city: 'Kolkata', pincode: '700001' },
      items: [{ sku: 'AUD-SNY-XM5', quantity: 2, price: 29990 }],
      total_amount: 59980,
    };

    const normalized = adapter.normalizeOrder(rawMeeshoPayload);
    expect(normalized.marketplaceOrderId).toBe('MSH-992182');
    expect(normalized.customer.name).toBe('Amitabh Sen');
    expect(normalized.items[0].quantity).toBe(2);
  });

  it('ShopifyAdapter should normalize Shopify line-item payloads', () => {
    const adapter = getAdapter('shopify');
    const rawShopifyPayload = {
      id: 592819284,
      name: '#SHP-1005',
      customer: { first_name: 'Zoya', last_name: 'Akhtar' },
      shipping_address: { city: 'Bangalore', province: 'Karnataka', zip: '560001' },
      line_items: [{ sku: 'ACC-LOG-MX3S', quantity: 1, price: 9995 }],
      total_price: 9995,
    };

    const normalized = adapter.normalizeOrder(rawShopifyPayload);
    expect(normalized.marketplaceOrderId).toBe('#SHP-1005');
    expect(normalized.customer.name).toBe('Zoya Akhtar');
    expect(normalized.items[0].sku).toBe('ACC-LOG-MX3S');
  });

  it('should support simulated failure injection for resilience testing', async () => {
    const adapter = getAdapter('amazon');
    adapter.setSimulatedFailure(true);

    await expect(adapter.updateInventory('LAP-MBP-16', 50)).rejects.toThrow(
      'Simulated Failure for testing'
    );

    // Verify recovery after failure
    const successResult = await adapter.updateInventory('LAP-MBP-16', 50);
    expect(successResult.status).toBe('SUCCESS');
    expect(successResult.publishedStock).toBe(50);
  });
});
