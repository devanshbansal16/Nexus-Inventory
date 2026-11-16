import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, TrendingUp, AlertTriangle, Calendar, ShieldCheck,
  RefreshCw, PackagePlus, Sparkles, BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { formatNumber, formatCurrency } from '../utils/formatters';
import api from '../services/api';

export default function Forecasting() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [forecastData, setForecastData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [horizonDays, setHorizonDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [prodRes, recRes] = await Promise.all([
        api.get('/products'),
        api.get('/forecast/recommendations'),
      ]);
      if (prodRes.data?.data?.products) {
        setProducts(prodRes.data.data.products);
        if (prodRes.data.data.products.length > 0 && !selectedProductId) {
          const firstId = prodRes.data.data.products[0]._id;
          setSelectedProductId(firstId);
          fetchForecastForProduct(firstId, horizonDays);
        }
      }
      if (recRes.data?.data) {
        setRecommendations(recRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load forecasting data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecastForProduct = async (prodId, horizon = 7) => {
    try {
      setLoading(true);
      const res = await api.get(`/forecast/${prodId}`);
      if (res.data?.data) {
        setForecastData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch forecast:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleProductChange = (prodId) => {
    setSelectedProductId(prodId);
    fetchForecastForProduct(prodId, horizonDays);
  };

  const handleGenerateForecast = async () => {
    if (!selectedProductId) return;
    try {
      setGenerating(true);
      await api.post('/forecast/generate', {
        productId: selectedProductId,
        horizonDays,
      });
      fetchForecastForProduct(selectedProductId, horizonDays);
    } catch (err) {
      alert('Generation error: ' + (err.response?.data?.message || err.message));
    } finally {
      setGenerating(false);
    }
  };

  // Combine historical and predicted points into continuous chart
  const combinedChartData = [
    ...(forecastData?.historicalDemand?.map((d) => ({
      date: d.date,
      'Actual Sales': d.actualDemand,
    })) || []),
    ...(forecastData?.predictedDemandChart?.map((d) => ({
      date: d.date,
      'AI Predicted Demand': d.predictedDemand,
    })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">AI-Based Demand Forecasting</h1>
            <Badge variant="indigo" size="sm" className="gap-1">
              <Sparkles size={12} /> Scikit-learn & Moving Average
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Machine learning projections across 7, 14, and 30-day horizons with dynamic replenishment guidance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-semibold">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                onClick={() => {
                  setHorizonDays(days);
                  if (selectedProductId) fetchForecastForProduct(selectedProductId, days);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  horizonDays === days
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} Days
              </button>
            ))}
          </div>
          <Button
            size="sm"
            onClick={handleGenerateForecast}
            loading={generating}
            className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <BrainCircuit size={14} /> Retrain & Predict
          </Button>
        </div>
      </div>

      {/* Product Selector Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-700 uppercase">Target Product:</label>
          <select
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span>
            Current Stock: <strong className="text-slate-800">{forecastData?.currentAvailableStock ?? 0} units</strong>
          </span>
          <span>
            Model: <strong className="font-mono text-indigo-600">{forecastData?.forecast?.modelName || 'Statistical'}</strong>
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium uppercase">Current Available</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">
            {formatNumber(forecastData?.currentAvailableStock ?? 0)}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Across all warehouses</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium uppercase">{horizonDays}-Day Predicted Demand</p>
          <h3 className="text-2xl font-bold text-indigo-600 mt-1">
            {formatNumber(forecastData?.forecast?.predictedDemand ?? 0)} units
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            CI: [{forecastData?.forecast?.confidenceInterval?.lower || 0} - {forecastData?.forecast?.confidenceInterval?.upper || 0}]
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium uppercase">Stockout Risk</p>
          <h3 className={`text-2xl font-bold mt-1 ${forecastData?.forecast?.isStockoutRisk ? 'text-red-600' : 'text-emerald-600'}`}>
            {forecastData?.forecast?.isStockoutRisk ? 'HIGH RISK' : 'LOW RISK'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {forecastData?.forecast?.isStockoutRisk ? 'Stock depleted before horizon' : 'Stock level is sufficient'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium uppercase">Recommended Reorder</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">
            {formatNumber(forecastData?.forecast?.recommendedReorderQuantity ?? 0)} units
          </h3>
          <p className="text-xs text-slate-400 mt-1">Suggested restock order size</p>
        </div>
      </div>

      {/* Chart: Historical Demand vs Predicted Demand */}
      <Card
        title="Demand Trajectory (Historical Actuals vs AI Projection)"
        subtitle="Continuous timeline tracking historical actual daily sales leading into forecasted future daily demand"
      >
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#64748b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#64748b" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Area
                type="monotone"
                dataKey="Actual Sales"
                stroke="#64748b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#actualGrad)"
              />
              <Area
                type="monotone"
                dataKey="AI Predicted Demand"
                stroke="#4f46e5"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#predGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Global Restock Recommendations Table */}
      <Card
        title="Proactive Restock Recommendations"
        subtitle="Catalog-wide products identified as at risk of stockout within forecast horizon"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Product / SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Predicted Demand</th>
                <th className="py-2.5 px-3">Recommended Reorder</th>
                <th className="py-2.5 px-3">Urgency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recommendations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No urgent restocking needed. All catalog inventory levels are within safe buffers.
                  </td>
                </tr>
              ) : (
                recommendations.map((rec) => (
                  <tr key={rec.productId} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3">
                      <p className="font-semibold text-slate-800">{rec.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">SKU: {rec.sku}</p>
                    </td>
                    <td className="py-2.5 px-3">{rec.category}</td>
                    <td className="py-2.5 px-3 font-bold text-red-600">{rec.currentStock} units</td>
                    <td className="py-2.5 px-3">{rec.predictedDemand} units</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-700">
                      +{rec.recommendedReorderQuantity} units
                    </td>
                    <td className="py-2.5 px-3">
                      <Badge variant={rec.urgency === 'CRITICAL' ? 'danger' : 'warning'}>
                        {rec.urgency}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
