import React, { useState, useEffect } from 'react';
import {
  Store, ShoppingCart, RefreshCw, AlertTriangle, CheckCircle,
  ExternalLink, Zap, Bug, ArrowRight, ShieldAlert, Cpu, Plus, Sparkles
} from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { useSocket } from '../hooks/useSocket';
import api from '../services/api';

const PRESET_MARKETPLACES = [
  { name: 'Amazon US', code: 'amazon-us', defaultBuffer: 5 },
  { name: 'Myntra', code: 'myntra', defaultBuffer: 5 },
  { name: 'Tata CLiQ', code: 'tatacliq', defaultBuffer: 5 },
  { name: 'eBay', code: 'ebay', defaultBuffer: 8 },
  { name: 'WooCommerce Store', code: 'woocommerce', defaultBuffer: 0 },
  { name: 'Nykaa', code: 'nykaa', defaultBuffer: 5 },
];

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

  // Add Marketplace Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newMpName, setNewMpName] = useState('');
  const [newMpCode, setNewMpCode] = useState('');
  const [newMpApiKey, setNewMpApiKey] = useState('');
  const [newMpApiSecret, setNewMpApiSecret] = useState('');
  const [newMpSafetyBuffer, setNewMpSafetyBuffer] = useState(5);
  const [creatingMp, setCreatingMp] = useState(false);
  const [createError, setCreateError] = useState('');

  const socket = useSocket();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mpRes, prodRes] = await Promise.all([
        api.get('/marketplaces'),
        api.get('/products'),
      ]);
      if (mpRes.data?.data) {
        setMarketplaces(mpRes.data.data);
      }
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
    if (!socket || typeof socket.on !== 'function') return;

    const handleSyncCompleted = (data) => {
      console.log('Real-time sync broadcast event:', data);
      fetchData();
    };

    socket.on('sync:completed', handleSyncCompleted);

    return () => {
      if (typeof socket.off === 'function') {
        socket.off('sync:completed', handleSyncCompleted);
      }
    };
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
  const handleToggleFailure = async (mpId) => {
    try {
      await api.post(`/marketplaces/${mpId}/simulate-failure`, {
        failNext: true,
      });
      alert('Simulated 503 error primed! The next sync attempt to this marketplace will fail, testing system resilience.');
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Registering a New Marketplace
  const handleCreateMarketplace = async (e) => {
    e.preventDefault();
    setCreatingMp(true);
    setCreateError('');

    try {
      await api.post('/marketplaces', {
        name: newMpName.trim(),
        code: newMpCode.toLowerCase().trim(),
        apiKey: newMpApiKey.trim() || `key_${Date.now()}`,
        apiSecret: newMpApiSecret.trim() || `sec_${Date.now()}`,
        isSimulated: true,
        settings: {
          safetyBufferPercentage: Number(newMpSafetyBuffer) || 0,
          autoSync: true,
        },
      });

      setIsAddModalOpen(false);
      setNewMpName('');
      setNewMpCode('');
      setNewMpApiKey('');
      setNewMpApiSecret('');
      setNewMpSafetyBuffer(5);
      await fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to register marketplace');
    } finally {
      setCreatingMp(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setNewMpName(preset.name);
    setNewMpCode(preset.code);
    setNewMpSafetyBuffer(preset.defaultBuffer);
  };

  // Available platforms for order simulation
  const activePlatforms = marketplaces.length > 0
    ? marketplaces.map((m) => ({
        code: m.code,
        name: m.name,
      }))
    : [
        { code: 'amazon', name: 'Amazon India' },
        { code: 'flipkart', name: 'Flipkart' },
        { code: 'meesho', name: 'Meesho' },
        { code: 'shopify', name: 'Shopify Store' },
      ];

  return (
    <div className="space-y-6">
      {/* Header with Add Marketplace Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Marketplace Integration & Simulator</h1>
            <Badge variant="indigo" size="sm">SIMULATION MODE ACTIVE</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Test real-time multi-channel inventory deduction and resilience across Amazon, Flipkart, Meesho, Shopify, and connected platforms.
          </p>
        </div>

        <Button
          onClick={() => {
            setCreateError('');
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-xs self-start sm:self-auto"
        >
          <Plus size={16} /> Connect Marketplace
        </Button>
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
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {activePlatforms.map((p) => (
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
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
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
                          ✓ All connected channels synchronized with fresh inventory balances!
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
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-800">
            Connected Channels & Sync Health ({marketplaces.length})
          </h3>
          <button
            onClick={fetchData}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketplaces.map((mp) => (
            <div
              key={mp._id}
              className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm truncate" title={mp.name}>{mp.name}</h4>
                  <Badge variant={mp.status === 'CONNECTED' ? 'success' : 'warning'}>
                    {mp.status || 'CONNECTED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adapter: <span className="font-mono">{mp.code}</span> • Buffer: {mp.settings?.safetyBufferPercentage || 0}%
                </p>

                <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Mapped Products:</span>
                    <strong className="text-slate-800">{mp.totalListings ?? products.length}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>In-Sync Listings:</span>
                    <strong className="text-emerald-600">{mp.inSyncCount ?? products.length}</strong>
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
                <span className="text-[10px] text-slate-400 font-mono">
                  {mp.isSimulated ? 'Simulated' : 'Live API'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connect Marketplace Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Connect New Marketplace Channel"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateMarketplace} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Quick Presets (Click to Auto-fill)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MARKETPLACES.map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2 py-1 text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-md border border-slate-200 transition-colors"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Marketplace Display Name"
            placeholder="e.g., Amazon US, Myntra, Tata CLiQ"
            value={newMpName}
            onChange={(e) => setNewMpName(e.target.value)}
            required
          />

          <Input
            label="Unique Channel Code (Lowercase Identifier)"
            placeholder="e.g., amazon-us, myntra, tatacliq"
            value={newMpCode}
            onChange={(e) => setNewMpCode(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="API Key / Client ID"
              placeholder="e.g., sp_api_key_..."
              value={newMpApiKey}
              onChange={(e) => setNewMpApiKey(e.target.value)}
            />
            <Input
              label="API Secret / Token"
              type="password"
              placeholder="e.g., ••••••••••••"
              value={newMpApiSecret}
              onChange={(e) => setNewMpApiSecret(e.target.value)}
            />
          </div>

          <Input
            label="Safety Buffer Percentage (%)"
            type="number"
            min="0"
            max="50"
            value={newMpSafetyBuffer}
            onChange={(e) => setNewMpSafetyBuffer(e.target.value)}
            helperText="Withholds this buffer % of stock to eliminate overselling risk."
          />

          {createError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {createError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={creatingMp}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Register & Connect
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
