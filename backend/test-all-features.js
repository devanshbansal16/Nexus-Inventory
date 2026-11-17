const BASE_URL = 'http://localhost:5000/api/v1';

const results = [];

function record(suite, testName, passed, details = '') {
  results.push({ suite, testName, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} [${suite}] ${testName} ${details ? '(' + details + ')' : ''}`);
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // raw text
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  CIMS — Comprehensive Feature & End-to-End Test Suite ');
  console.log('═══════════════════════════════════════════════════════\n');

  let adminToken = '';
  let invToken = '';
  let testProductId = '';
  let testWarehouseId = '';
  let testOrderId = '';
  let testTransferId = '';

  // 1. Authentication Suite
  console.log('--- 1. Authentication Suite ---');
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@cims.com', password: 'Admin@123' }),
    });
    adminToken = loginRes.data?.data?.token;
    record('Auth', 'Admin Login', loginRes.status === 200 && !!adminToken, `Role: ${loginRes.data?.data?.user?.role}`);
  } catch (err) {
    record('Auth', 'Admin Login', false, err.message);
  }

  try {
    const invRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'inventory@cims.com', password: 'Admin@123' }),
    });
    invToken = invRes.data?.data?.token;
    record('Auth', 'Inventory Manager Login', invRes.status === 200 && !!invToken);
  } catch (err) {
    record('Auth', 'Inventory Manager Login', false, err.message);
  }

  try {
    const badLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@cims.com', password: 'WrongPassword123' }),
    });
    record('Auth', 'Reject Invalid Credentials', badLogin.status === 401, `Status ${badLogin.status}`);
  } catch (err) {
    record('Auth', 'Reject Invalid Credentials', false, err.message);
  }

  const authHeaders = { Authorization: `Bearer ${adminToken}` };

  try {
    const meRes = await request('/auth/me', { headers: authHeaders });
    const userEmail = meRes.data?.data?.user?.email;
    record('Auth', 'Get Profile (/auth/me)', meRes.status === 200 && userEmail === 'admin@cims.com', `User: ${userEmail}`);
  } catch (err) {
    record('Auth', 'Get Profile (/auth/me)', false, err.message);
  }

  // 2. Dashboard Suite
  console.log('\n--- 2. Dashboard Suite ---');
  try {
    const dashRes = await request('/dashboard/overview', { headers: authHeaders });
    const data = dashRes.data?.data;
    const hasStats = data && data.stats && data.stats.totalProducts > 0;
    const hasWarehouses = data && Array.isArray(data.warehouseStock);
    record('Dashboard', 'Get Overview Stats & Charts', hasStats && hasWarehouses, 
      `Products: ${data?.stats?.totalProducts}, Warehouses: ${data?.stats?.totalWarehouses}`);
  } catch (err) {
    record('Dashboard', 'Get Overview Stats & Charts', false, err.message);
  }

  // 3. Warehouses Suite
  console.log('\n--- 3. Warehouses Suite ---');
  let warehouses = [];
  try {
    const whRes = await request('/warehouses', { headers: authHeaders });
    warehouses = whRes.data?.data || [];
    const count = warehouses.length;
    if (count > 0) {
      testWarehouseId = warehouses[0]._id;
    }
    record('Warehouses', 'List Warehouses', count >= 3, `Count: ${count}`);
  } catch (err) {
    record('Warehouses', 'List Warehouses', false, err.message);
  }

  try {
    if (testWarehouseId) {
      const whDetail = await request(`/warehouses/${testWarehouseId}`, { headers: authHeaders });
      record('Warehouses', 'Get Warehouse Details', whDetail.status === 200 && !!whDetail.data?.data?.name, whDetail.data?.data?.name);
    }
  } catch (err) {
    record('Warehouses', 'Get Warehouse Details', false, err.message);
  }

  // 4. Products Suite
  console.log('\n--- 4. Products Suite ---');
  try {
    const prodRes = await request('/products', { headers: authHeaders });
    const prods = prodRes.data?.data?.products;
    record('Products', 'List Products', Array.isArray(prods) && prods.length > 0, `Total: ${prods?.length}`);
  } catch (err) {
    record('Products', 'List Products', false, err.message);
  }

  const testSku = 'TEST-DEVICE-' + Date.now().toString().slice(-4);
  try {
    const createRes = await request('/products', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Test Smart Sensor Ultra',
        sku: testSku,
        category: 'Accessories',
        brand: 'TestBrand',
        purchasePrice: 1500,
        sellingPrice: 2999,
        minimumStockLevel: 5,
        reorderQuantity: 20,
        description: 'End-to-end integration test product'
      }),
    });
    testProductId = createRes.data?.data?._id;
    record('Products', 'Create Product', !!testProductId, `SKU: ${testSku}`);
  } catch (err) {
    record('Products', 'Create Product', false, err.message);
  }

  try {
    if (testProductId) {
      const detailRes = await request(`/products/${testProductId}`, { headers: authHeaders });
      const fetchedSku = detailRes.data?.data?.product?.sku;
      record('Products', 'Get Product Details', detailRes.status === 200 && fetchedSku === testSku, `SKU: ${fetchedSku}`);
    }
  } catch (err) {
    record('Products', 'Get Product Details', false, err.message);
  }

  try {
    if (testProductId) {
      const updateRes = await request(`/products/${testProductId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          sellingPrice: 3199,
          description: 'Updated test product'
        }),
      });
      record('Products', 'Update Product', updateRes.data?.data?.sellingPrice === 3199);
    }
  } catch (err) {
    record('Products', 'Update Product', false, err.message);
  }

  // 5. Centralized Inventory Engine Suite
  console.log('\n--- 5. Inventory Engine Suite ---');
  try {
    const invList = await request('/inventory', { headers: authHeaders });
    const inventories = invList.data?.data;
    record('Inventory', 'List Centralized Stock across Warehouses', Array.isArray(inventories) && inventories.length > 0, `Entries: ${inventories?.length}`);
  } catch (err) {
    record('Inventory', 'List Centralized Stock', false, err.message);
  }

  try {
    if (testProductId && testWarehouseId) {
      const stockInRes = await request('/inventory/stock-in', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          productId: testProductId,
          warehouseId: testWarehouseId,
          quantity: 50,
          notes: 'E2E Test Initial Stock In'
        }),
      });
      const phys = stockInRes.data?.data?.inventory?.physicalStock;
      record('Inventory', 'Stock-In Inbound Receiving', stockInRes.status === 200 && phys >= 50, `Physical: ${phys}`);
    }
  } catch (err) {
    record('Inventory', 'Stock-In Inbound Receiving', false, err.message);
  }

  try {
    if (testProductId && testWarehouseId) {
      const adjustRes = await request('/inventory/adjust', {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          productId: testProductId,
          warehouseId: testWarehouseId,
          newPhysicalStock: 48,
          reason: 'DAMAGED_ITEM',
          notes: 'Found 2 defective packaging units during inspection'
        }),
      });
      record('Inventory', 'Stock Adjustment Audit', adjustRes.status === 200, adjustRes.data?.message);
    }
  } catch (err) {
    record('Inventory', 'Stock Adjustment Audit', false, err.message);
  }

  try {
    const ledgerRes = await request('/inventory/transactions', { headers: authHeaders });
    record('Inventory', 'Inventory Audit Ledger (Immutable History)', Array.isArray(ledgerRes.data?.data) && ledgerRes.data?.data?.length > 0, `Transactions: ${ledgerRes.data?.data?.length}`);
  } catch (err) {
    record('Inventory', 'Inventory Audit Ledger', false, err.message);
  }

  // 6. Orders & Smart Allocation Suite
  console.log('\n--- 6. Orders & Allocation Suite ---');
  try {
    const orderList = await request('/orders', { headers: authHeaders });
    record('Orders', 'List Orders', Array.isArray(orderList.data?.data?.orders), `Existing: ${orderList.data?.data?.orders?.length}`);
  } catch (err) {
    record('Orders', 'List Orders', false, err.message);
  }

  try {
    const prodsRes = await request('/products', { headers: authHeaders });
    const prods = prodsRes.data?.data?.products || [];
    const seededProduct = prods.find(p => p.sku === 'LAP-MBP-16') || prods[0];

    const orderRes = await request('/orders', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customer: {
          name: 'Devan Test Customer',
          email: 'customer.test@example.com',
          phone: '9988776655',
          shippingAddress: { street: 'Connaught Place', city: 'Delhi', state: 'Delhi', pincode: '110001' }
        },
        items: [
          {
            productId: seededProduct._id,
            sku: seededProduct.sku,
            quantity: 1,
            unitPrice: seededProduct.sellingPrice
          }
        ]
      }),
    });

    testOrderId = orderRes.data?.data?._id;
    record('Orders', 'Create Order with Smart Allocation', orderRes.status === 201 && !!testOrderId, 
      `Order: ${orderRes.data?.data?.orderId}, Status: ${orderRes.data?.data?.orderStatus}`);
  } catch (err) {
    record('Orders', 'Create Order with Smart Allocation', false, err.message);
  }

  try {
    if (testOrderId) {
      const statusRes = await request(`/orders/${testOrderId}/status`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'PROCESSING',
          notes: 'Warehouse picked item'
        }),
      });
      record('Orders', 'Update Order Status (PROCESSING)', statusRes.data?.data?.orderStatus === 'PROCESSING', `Status: ${statusRes.data?.data?.orderStatus}`);
    }
  } catch (err) {
    record('Orders', 'Update Order Status', false, err.message);
  }

  // 7. Marketplace Adapters & Simulator Suite
  console.log('\n--- 7. Marketplaces & Simulator Suite ---');
  let testMarketplaceId = '';
  try {
    const mpRes = await request('/marketplaces', { headers: authHeaders });
    const mps = mpRes.data?.data;
    if (mps && mps.length > 0) testMarketplaceId = mps[0]._id;
    record('Marketplaces', 'List Connected Channels', Array.isArray(mps) && mps.length >= 4, `Channels: ${mps?.map(m => m.name).join(', ')}`);
  } catch (err) {
    record('Marketplaces', 'List Connected Channels', false, err.message);
  }

  try {
    if (testMarketplaceId) {
      const syncRes = await request(`/marketplaces/${testMarketplaceId}/sync`, {
        method: 'POST',
        headers: authHeaders,
      });
      record('Marketplaces', 'Trigger Channel Inventory Sync', syncRes.status === 200, syncRes.data?.message);
    }
  } catch (err) {
    record('Marketplaces', 'Trigger Channel Inventory Sync', false, err.message);
  }

  // 8. Webhook Simulators & Idempotency Suite
  console.log('\n--- 8. Webhook Simulators Suite ---');
  const mockWebhookOrderId = 'AMZ-SIM-' + Date.now();
  try {
    const amzHook = await request('/webhooks/amazon/orders', {
      method: 'POST',
      body: JSON.stringify({
        AmazonOrderId: mockWebhookOrderId,
        BuyerInfo: { BuyerName: 'Amazon Prime Buyer', BuyerEmail: 'prime@amazon.in' },
        ShippingAddress: { City: 'Delhi', StateOrRegion: 'Delhi', PostalCode: '110020' },
        OrderItems: [{ SellerSKU: 'LAP-MBP-16', QuantityOrdered: 1, ItemPrice: { Amount: 249900 } }],
        OrderTotal: { Amount: 249900 }
      }),
    });
    record('Webhooks', 'Simulated Amazon SP-API Inbound Webhook', amzHook.status === 200, amzHook.data?.message);
  } catch (err) {
    record('Webhooks', 'Simulated Amazon Webhook', false, err.message);
  }

  // Idempotency Test: Resend identical webhook
  try {
    const dupHook = await request('/webhooks/amazon/orders', {
      method: 'POST',
      body: JSON.stringify({
        AmazonOrderId: mockWebhookOrderId,
        BuyerInfo: { BuyerName: 'Amazon Prime Buyer', BuyerEmail: 'prime@amazon.in' },
        ShippingAddress: { City: 'Delhi', StateOrRegion: 'Delhi', PostalCode: '110020' },
        OrderItems: [{ SellerSKU: 'LAP-MBP-16', QuantityOrdered: 1, ItemPrice: { Amount: 249900 } }],
        OrderTotal: { Amount: 249900 }
      }),
    });
    const isIdempotent = dupHook.data?.message?.includes('already processed') || dupHook.data?.data?.isDuplicate === true;
    record('Webhooks', 'Idempotency Duplicate Webhook Protection', isIdempotent, dupHook.data?.message);
  } catch (err) {
    record('Webhooks', 'Idempotency Duplicate Protection', false, err.message);
  }

  // 9. Stock Transfers Suite
  console.log('\n--- 9. Stock Transfers Suite ---');
  try {
    const prods = (await request('/products', { headers: authHeaders })).data?.data?.products || [];
    const seededProduct = prods.find(p => p.sku === 'LAP-MBP-16') || prods[0];

    if (warehouses.length >= 2 && seededProduct) {
      const trfRes = await request('/transfers', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          productId: seededProduct._id,
          sourceWarehouseId: warehouses[0]._id,
          destinationWarehouseId: warehouses[1]._id,
          quantity: 2,
          notes: 'Urgent transfer for Mumbai demand spike'
        }),
      });

      testTransferId = trfRes.data?.data?._id;
      record('Transfers', 'Request Inter-Warehouse Stock Transfer', trfRes.status === 201 && !!testTransferId, 
        `Transfer: ${trfRes.data?.data?.transferNumber}`);
    }
  } catch (err) {
    record('Transfers', 'Request Stock Transfer', false, err.message);
  }

  try {
    if (testTransferId) {
      const approveRes = await request(`/transfers/${testTransferId}/approve`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({
          notes: 'Approved by central inventory team'
        }),
      });
      record('Transfers', 'Approve Stock Transfer', approveRes.data?.data?.status === 'APPROVED');
    }
  } catch (err) {
    record('Transfers', 'Approve Stock Transfer', false, err.message);
  }

  // 10. Synchronization & Outbox Suite
  console.log('\n--- 10. Synchronization & Outbox Suite ---');
  try {
    const syncStatus = await request('/sync/status', { headers: authHeaders });
    record('Sync', 'Get Channel Sync Health & Status', syncStatus.status === 200, `Health: ${syncStatus.data?.data?.health || 'OK'}`);
  } catch (err) {
    record('Sync', 'Get Sync Status', false, err.message);
  }

  try {
    const reconRes = await request('/sync/reconcile', {
      method: 'POST',
      headers: authHeaders,
    });
    record('Sync', 'Global Manual Stock Reconciliation', reconRes.status === 200, reconRes.data?.message);
  } catch (err) {
    record('Sync', 'Global Manual Reconciliation', false, err.message);
  }

  // 11. AI Forecasting Suite
  console.log('\n--- 11. AI Forecasting Suite ---');
  try {
    const prods = (await request('/products', { headers: authHeaders })).data?.data?.products || [];
    if (prods.length > 0) {
      const forecastRes = await request(`/forecast/${prods[0]._id}`, { headers: authHeaders });
      record('Forecasting', 'Fetch Demand Forecast / Predictive Data', forecastRes.status === 200, 
        `Points: ${forecastRes.data?.data?.forecast?.length || 0}`);
    }
  } catch (err) {
    record('Forecasting', 'Fetch Demand Forecast', false, err.message);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(`  Summary: ${passed}/${total} Passed (${failed} Failed)`);
  console.log('═══════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error('Failed Tests:');
    results.filter(r => !r.passed).forEach(f => console.error(` - [${f.suite}] ${f.testName}: ${f.details}`));
    process.exit(1);
  } else {
    console.log('🎉 ALL FEATURE TESTS PASSED! ZERO ERRORS!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
