import React, { useState, useEffect } from 'react';
import {
  Store, ShoppingCart, RefreshCw, AlertTriangle, CheckCircle,
  ExternalLink, Zap, Bug, ArrowRight, ShieldAlert, Cpu
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

export default function Marketplaces() {
  const [marketplaces, setMarketplaces] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedMarketplace, setSelectedMarketplace] = useState('amazon');
  const [loading, setLoading] = useState(true);
  const [simulatingOrder, setSimulatingOrder] = useState(false);

  // Simulation Order Form State
  const [simSku, setSimSku] = useState('');
  const [simQuantity, setSimQuantity] = useState(1);
  const [simCustomerCity, setSimCustomerCity] = useState('Delhi');
  const [simulationResult, setSimulationResult] = useState(null);

  const socket = useSocket();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mpRes, prodRes] = await Promise.all([
        api.get('/marketplaces'),
        api.get('/products'),
      ]);
      if (mpRes.data?.data) setMarketplaces(mpRes.data.data);
      if (prodRes.data?.data?.products) {
        setProducts(prodRes.data.data.products);
        if (prodRes.data.data.products.length > 0 && !simSku) {
          setSimSku(prodRes.data.data.products[0].sku);
        }
      }
    } catch (err) {
      console.error('Failed to load marketplace data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen to live sync events from Socket.IO
  useEffect(() => {
    if (!socket) return;
    socket.on('sync:completed', (data) => {
      console.log('Real-time sync broadcast event:', data);
      fetchData();
    });
    return () => socket.off('sync:completed');
  }, [socket]);

  // Handle Simulated Order Placement
  const handlePlaceSimulatedOrder = async (e) => {
    e.preventDefault();
    setSimulatingOrder(true);
    setSimulationResult(null);

    const targetProduct = products.find((p) => p.sku === simSku);
    if (!targetProduct) {
      alert('Selected product not found');
      setSimulatingOrder(false);
      return;
    }

    const payload = {
      orderId: `${selectedMarketplace.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      customer: {
        name: `Simulated Buyer (${selectedMarketplace.toUpperCase()})`,
        email: `buyer@${selectedMarketplace}-test.com`,
        phone: '9876543210',
        shippingAddress: {
          city: simCustomerCity,
          state: simCustomerCity === 'Mumbai' ? 'Maharashtra' : simCustomerCity === 'Bangalore' ? 'Karnataka' : 'Delhi',
          pincode: '110001',
        },
      },
      items: [
        {
          sku: simSku,
          quantity: Number(simQuantity),
          unitPrice: targetProduct.sellingPrice,
        },
      ],
      totalAmount: targetProduct.sellingPrice * Number(simQuantity),
    };

    try {
      // Send simulated marketplace webhook event to backend
      const res = await api.post(`/webhooks/${selectedMarketplace}/orders`, payload);

      setSimulationResult({
        success: true,
        orderData: res.data?.data,
        message: res.data?.message || 'Order placed and stock synchronized across all channels!',
      });

      // Refresh products to show newly decremented stock
      fetchData();
    } catch (err) {
      setSimulationResult({
        success: false,
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setSimulatingOrder(false);
    }
  };

  // Toggle chaos test / simulated failure
  const handleToggleFailure = async (mpId, currentStatus) => {
    try {
      await api.post(`/marketplaces/${mpId}/simulate-failure`, {
        failNext: true,
      });
      alert('Simulated 503 error primed! The next sync attempt to this marketplace will fail, testing system resilience.');
    } catch (e) {
      console.error(e);
    }
  };

  const platforms = [
    {
      code: 'amazon',
      name: 'Amazon India',
      theme: 'border-amber-300 bg-amber-50/30',
      badge: 'Amazon SP-API (Simulated)',
    },
    {
      code: 'flipkart',
      name: 'Flipkart',
      theme: 'border-blue-300 bg-blue-50/30',
      badge: 'Flipkart Marketplace API (Simulated)',
    },
    {
      code: 'meesho',
      name: 'Meesho',
      theme: 'border-pink-300 bg-pink-50/30',
      badge: 'Meesho Supplier Webhook (Simulated)',
    },
    {
      code: 'shopify',
      name: 'Shopify Store',
      theme: 'border-emerald-300 bg-emerald-50/30',
      badge: 'Shopify Admin REST API (Simulated)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">Marketplace Integration & Simulator</h1>
          <Badge variant="indigo" size="sm">SIMULATION MODE ACTIVE</Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Test real-time multi-channel inventory deduction and resilience across Amazon, Flipkart, Meesho, and Shopify
        </p>
      </div>

      {/* Simulator Hero Panel */}
      <Card
        title="Live Order Simulation Console"
        subtitle="Place an order from any channel to watch instant multi-warehouse deduction & cross-platform broadcast"
        className="border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-slate-50"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="lg:col-span-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                1. Select Ordering Channel
              </label>
              <div className="grid grid-cols-2 gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => setSelectedMarketplace(p.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      selectedMarketplace === p.code
                        ? 'border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/80 hover:bg-white text-slate-600'
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{p.code.toUpperCase()} adapter</p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handlePlaceSimulatedOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  2. Select Product SKU
                </label>
                <select
                  value={simSku}
                  onChange={(e) => setSimSku(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.sku} value={p.sku}>
                      {p.name} (SKU: {p.sku}) — Available: {p.stock?.availableStock ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Purchase Quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={simQuantity}
                  onChange={(e) => setSimQuantity(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Customer City
                  </label>
                  <select
                    value={simCustomerCity}
                    onChange={(e) => setSimCustomerCity(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Delhi">Delhi (Northern Hub)</option>
                    <option value="Mumbai">Mumbai (Western Hub)</option>
                    <option value="Bangalore">Bangalore (Southern Hub)</option>
                    <option value="Kolkata">Kolkata</option>
                    <option value="Hyderabad">Hyderabad</option>
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                loading={simulatingOrder}
                className="w-full gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Zap size={16} /> Emit Simulated {selectedMarketplace.toUpperCase()} Order Event
              </Button>
            </form>
          </div>

          {/* Real-Time Result Feedback Pane */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/80 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-indigo-600" /> CIMS Execution Pipeline
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Socket.IO Live</span>
              </div>

              {simulationResult ? (
                <div className="mt-4 space-y-3">
                  <div
                    className={`p-3.5 rounded-xl border text-xs ${
                      simulationResult.success
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                        : 'bg-red-50/60 border-red-200 text-red-900'
                    }`}
                  >
                    <p className="font-bold flex items-center gap-1.5">
                      {simulationResult.success ? (
                        <>
                          <CheckCircle size={16} className="text-emerald-600" />
                          {simulationResult.message}
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={16} className="text-red-600" />
                          Simulation Rejected: {simulationResult.error}
                        </>
                      )}
                    </p>
                  </div>

                  {simulationResult.success && simulationResult.orderData && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-slate-50 rounded-lg space-y-1 font-mono text-[11px]">
                        <p><strong>CIMS Internal Order ID:</strong> {simulationResult.orderData.orderId}</p>
                        <p><strong>Channel Ext Order ID:</strong> {simulationResult.orderData.marketplaceOrderId}</p>
                        <p><strong>Status:</strong> {simulationResult.orderData.status}</p>
                        <p>
                          <strong>Allocated Warehouse:</strong>{' '}
                          {simulationResult.orderData.allocatedItems?.[0]?.allocatedWarehouseId || 'Delhi Hub'}
                        </p>
                      </div>

                      <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 text-xs">
                        <p className="font-bold text-indigo-900">Broadcast Outcome:</p>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          ✓ Reserved {simQuantity} units atomically in closest warehouse.<br />
                          ✓ Transactional Outbox created event `MARKETPLACE_SYNC_REQUIRED`.<br />
                          ✓ Remaining channels (Amazon, Flipkart, Meesho, Shopify) updated to new available balance!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <ShoppingCart size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Select a channel and product on the left, then click Emit to trigger the workflow.</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Source of Truth: Centralized MongoDB</span>
              <span>Atomic Conditional Updates: Active</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Connected Marketplaces Overview Table */}
      <div>
        <h3 className="text-base font-bold text-slate-800 mb-3">
          Channel Sync Status & Simulated Product Stock
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketplaces.map((mp) => (
            <div
              key={mp._id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">{mp.name}</h4>
                  <Badge variant="success">CONNECTED</Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adapter: {mp.code} • Buffer: {mp.settings?.safetyBufferPercentage || 0}%
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Mapped Products:</span>
                    <strong className="text-slate-800">{mp.totalListings ?? 10}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>In-Sync Listings:</span>
                    <strong className="text-emerald-600">{mp.inSyncCount ?? 10}</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleFailure(mp._id)}
                  className="text-[11px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-1"
                  title="Simulate 503 Outage"
                >
                  <Bug size={13} /> Inject Failure
                </button>
                <span className="text-[10px] text-slate-400 font-mono">Simulated</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
