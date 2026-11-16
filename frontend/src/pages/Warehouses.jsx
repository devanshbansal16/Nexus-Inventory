import React, { useState, useEffect } from 'react';
import { Warehouse, Plus, MapPin, User, Package, Layers, ShieldCheck } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { formatNumber } from '../utils/formatters';
import api from '../services/api';

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [warehouseInventory, setWarehouseInventory] = useState([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    warehouseCode: '',
    name: '',
    city: '',
    state: '',
    pincode: '',
    capacity: 5000,
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      if (res.data?.data) {
        setWarehouses(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/warehouses', {
        warehouseCode: formData.warehouseCode,
        name: formData.name,
        address: {
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        capacity: Number(formData.capacity),
      });
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create warehouse');
    }
  };

  const handleViewInventory = async (wh) => {
    try {
      setSelectedWarehouse(wh);
      const res = await api.get(`/warehouses/${wh._id}/inventory`);
      setWarehouseInventory(res.data?.data || []);
      setIsInventoryModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch warehouse inventory:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Multi-Warehouse Network</h1>
          <p className="text-xs text-slate-500 mt-1">
            Regional distribution centers with dedicated stock partitions and smart order routing
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} /> Add Warehouse
        </Button>
      </div>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {warehouses.map((wh) => (
          <div
            key={wh._id}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    {wh.warehouseCode}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 mt-2">{wh.name}</h3>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-100">
                  <Warehouse size={20} />
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin size={15} className="text-slate-400 flex-shrink-0" />
                  <span>
                    {wh.address?.city}, {wh.address?.state} ({wh.address?.pincode})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <User size={15} className="text-slate-400 flex-shrink-0" />
                  <span>Manager: {wh.managerId?.name || 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-slate-400 flex-shrink-0" />
                  <span>Stored SKUs: <strong>{wh.skuCount ?? '10'} active products</strong></span>
                </div>
              </div>

              {/* Capacity Progress Bar */}
              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 font-medium">Capacity Utilization</span>
                  <span className="font-bold text-slate-800">
                    {wh.utilizationPercentage ?? 45}% ({formatNumber(wh.currentPhysicalStock ?? 0)} / {formatNumber(wh.capacity)} units)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (wh.utilizationPercentage ?? 0) > 85
                        ? 'bg-rose-500'
                        : (wh.utilizationPercentage ?? 0) > 65
                        ? 'bg-amber-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, wh.utilizationPercentage ?? 45)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck size={14} className="text-emerald-500" /> Operational
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewInventory(wh)}
                className="text-xs"
              >
                View Stock
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Warehouse"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Warehouse Code"
              placeholder="e.g. WH-HYD-04"
              value={formData.warehouseCode}
              onChange={(e) => setFormData({ ...formData, warehouseCode: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Warehouse Name"
              placeholder="e.g. Hyderabad Southern Hub"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              placeholder="Hyderabad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              required
            />
            <Input
              label="State"
              placeholder="Telangana"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              required
            />
            <Input
              label="Pincode"
              placeholder="500001"
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              required
            />
          </div>

          <Input
            label="Total Storage Capacity (Units)"
            type="number"
            value={formData.capacity}
            onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Warehouse</Button>
          </div>
        </form>
      </Modal>

      {/* Warehouse Stock Modal */}
      <Modal
        isOpen={isInventoryModalOpen}
        onClose={() => setIsInventoryModalOpen(false)}
        title={`${selectedWarehouse?.name || 'Warehouse'} Inventory Breakdown`}
        maxWidth="max-w-2xl"
      >
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Physical</th>
                <th className="py-2.5 px-3">Reserved</th>
                <th className="py-2.5 px-3">Damaged</th>
                <th className="py-2.5 px-3">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseInventory.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-800">{item.productId?.name}</p>
                    <p className="text-[11px] text-slate-400">SKU: {item.productId?.sku}</p>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{item.physicalStock}</td>
                  <td className="py-2.5 px-3 text-amber-600 font-medium">{item.reservedStock}</td>
                  <td className="py-2.5 px-3 text-red-600 font-medium">{item.damagedStock}</td>
                  <td className="py-2.5 px-3 text-emerald-600 font-bold">{item.availableStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}
