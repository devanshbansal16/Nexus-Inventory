import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, CheckCircle, Truck, PackageCheck, AlertCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import api from '../services/api';

export default function Transfers() {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    productId: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    quantity: 10,
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, prodRes, whRes] = await Promise.all([
        api.get('/transfers'),
        api.get('/products'),
        api.get('/warehouses'),
      ]);
      if (transRes.data?.data) setTransfers(transRes.data.data);
      if (prodRes.data?.data?.products) {
        setProducts(prodRes.data.data.products);
        if (prodRes.data.data.products.length > 0 && !formData.productId) {
          setFormData((prev) => ({ ...prev, productId: prodRes.data.data.products[0]._id }));
        }
      }
      if (whRes.data?.data) {
        setWarehouses(whRes.data.data);
        if (whRes.data.data.length >= 2 && !formData.sourceWarehouseId) {
          setFormData((prev) => ({
            ...prev,
            sourceWarehouseId: whRes.data.data[0]._id,
            destinationWarehouseId: whRes.data.data[1]._id,
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/transfers', {
        productId: formData.productId,
        sourceWarehouseId: formData.sourceWarehouseId,
        destinationWarehouseId: formData.destinationWarehouseId,
        quantity: Number(formData.quantity),
        notes: formData.notes,
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Transfer request failed');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.patch(`/transfers/${id}/approve`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Approve failed');
    }
  };

  const handleDispatch = async (id) => {
    try {
      await api.patch(`/transfers/${id}/dispatch`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Dispatch failed');
    }
  };

  const handleReceive = async (id) => {
    try {
      await api.patch(`/transfers/${id}/receive`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Receive failed');
    }
  };

  const columns = [
    {
      header: 'Transfer #',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-slate-800">{row.transferNumber}</p>
          <p className="text-[11px] text-slate-400">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      header: 'Product / Qty',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800 text-xs">{row.productId?.name}</p>
          <p className="text-[11px] font-bold text-indigo-600">
            Quantity: {row.quantity} units ({row.productId?.sku})
          </p>
        </div>
      ),
    },
    {
      header: 'Route (Source → Destination)',
      render: (row) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-700">{row.sourceWarehouseId?.name}</span>
          <span className="text-slate-400 mx-1.5">→</span>
          <span className="font-semibold text-slate-700">{row.destinationWarehouseId?.name}</span>
        </div>
      ),
    },
    {
      header: 'Transfer Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Workflow Stage Action',
      render: (row) => {
        if (row.status === 'REQUESTED') {
          return (
            <Button
              size="sm"
              onClick={() => handleApprove(row._id)}
              className="text-xs gap-1 py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700"
            >
              <CheckCircle size={12} /> Approve Request
            </Button>
          );
        }
        if (row.status === 'APPROVED') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDispatch(row._id)}
              className="text-xs gap-1 py-1 px-2.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Truck size={12} /> Dispatch Shipment
            </Button>
          );
        }
        if (row.status === 'IN_TRANSIT') {
          return (
            <Button
              size="sm"
              onClick={() => handleReceive(row._id)}
              className="text-xs gap-1 py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <PackageCheck size={12} /> Accept Stock
            </Button>
          );
        }
        return <span className="text-xs text-slate-400 font-medium">Completed</span>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Warehouse Stock Transfers</h1>
          <p className="text-xs text-slate-500 mt-1">
            Rebalance inventory between regional hubs with in-transit isolation and dual-confirmation
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus size={16} /> Request Transfer
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={transfers}
        loading={loading}
        emptyMessage="No stock transfers requested"
      />

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Inter-Warehouse Transfer Request"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Product
            </label>
            <select
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.sku}) — Available: {p.stock?.availableStock ?? 0}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Source Warehouse
              </label>
              <select
                value={formData.sourceWarehouseId}
                onChange={(e) => setFormData({ ...formData, sourceWarehouseId: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Destination Warehouse
              </label>
              <select
                value={formData.destinationWarehouseId}
                onChange={(e) => setFormData({ ...formData, destinationWarehouseId: e.target.value })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <Input
            label="Transfer Quantity (Units)"
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            required
          />

          <Input
            label="Transfer Justification / Notes"
            placeholder="e.g. Replenishing Western Hub for festival surge"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
