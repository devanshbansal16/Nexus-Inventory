import React, { useState, useEffect } from 'react';
import { Boxes, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, History, AlertTriangle, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import { formatNumber, formatDate, formatDateTime } from '../utils/formatters';
import api from '../services/api';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'transactions', 'low_stock'
  const [inventories, setInventories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
  const [isStockOutModalOpen, setIsStockOutModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Form State
  const [formQuantity, setFormQuantity] = useState('');
  const [formReason, setFormReason] = useState('');
  const [newPhysical, setNewPhysical] = useState('');
  const [newDamaged, setNewDamaged] = useState('');

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      if (res.data?.data) setWarehouses(res.data.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedWarehouseFilter) params.warehouseId = selectedWarehouseFilter;
      const res = await api.get('/inventory', { params });
      if (res.data?.data) setInventories(res.data.data);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/transactions');
      if (res.data?.data) setTransactions(res.data.data);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (activeTab === 'inventory' || activeTab === 'low_stock') {
      fetchInventory();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, selectedWarehouseFilter]);

  const handleStockInSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.post('/inventory/stock-in', {
        productId: selectedRecord.productId?._id || selectedRecord.productId,
        warehouseId: selectedRecord.warehouseId?._id || selectedRecord.warehouseId,
        quantity: Number(formQuantity),
        notes: formReason,
      });
      setIsStockInModalOpen(false);
      setFormQuantity('');
      setFormReason('');
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Stock In failed');
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;
    try {
      await api.patch('/inventory/adjust', {
        productId: selectedRecord.productId?._id || selectedRecord.productId,
        warehouseId: selectedRecord.warehouseId?._id || selectedRecord.warehouseId,
        newPhysicalStock: Number(newPhysical),
        newDamagedStock: Number(newDamaged),
        reason: formReason,
      });
      setIsAdjustModalOpen(false);
      setFormReason('');
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const inventoryColumns = [
    {
      header: 'Product / SKU',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <img
            src={row.productId?.image}
            alt={row.productId?.name}
            className="w-9 h-9 rounded-lg object-cover bg-slate-100 border border-slate-200"
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm">{row.productId?.name}</p>
            <p className="text-xs text-slate-500 font-mono">SKU: {row.productId?.sku}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Warehouse',
      render: (row) => (
        <span className="font-medium text-slate-700">
          {row.warehouseId?.name} ({row.warehouseId?.warehouseCode})
        </span>
      ),
    },
    {
      header: 'Physical Stock',
      render: (row) => <span className="font-bold text-slate-800">{formatNumber(row.physicalStock)}</span>,
    },
    {
      header: 'Reserved Stock',
      render: (row) => (
        <span className="font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
          {formatNumber(row.reservedStock)}
        </span>
      ),
    },
    {
      header: 'Damaged Stock',
      render: (row) => (
        <span className="font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
          {formatNumber(row.damagedStock)}
        </span>
      ),
    },
    {
      header: 'Available to Sell',
      render: (row) => {
        const isLow = row.availableStock <= (row.productId?.minimumStockLevel || 10);
        return (
          <span className={`text-base font-extrabold ${isLow ? 'text-red-600' : 'text-emerald-600'}`}>
            {formatNumber(row.availableStock)}
          </span>
        );
      },
    },
    {
      header: 'Quick Action',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedRecord(row);
              setFormQuantity('');
              setIsStockInModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Receive Stock"
          >
            <ArrowDownToLine size={16} />
          </button>
          <button
            onClick={() => {
              setSelectedRecord(row);
              setNewPhysical(row.physicalStock);
              setNewDamaged(row.damagedStock);
              setIsAdjustModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Adjust Stock Audit"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      ),
    },
  ];

  const transactionColumns = [
    {
      header: 'Timestamp',
      render: (row) => <span className="text-xs text-slate-500">{formatDateTime(row.createdAt)}</span>,
    },
    {
      header: 'Product',
      render: (row) => (
        <span className="font-medium text-slate-800 text-xs">
          {row.productId?.name} ({row.productId?.sku})
        </span>
      ),
    },
    {
      header: 'Warehouse',
      render: (row) => <span className="text-xs text-slate-600">{row.warehouseId?.name}</span>,
    },
    {
      header: 'Type',
      render: (row) => <StatusBadge status={row.transactionType} />,
    },
    {
      header: 'Quantity',
      render: (row) => (
        <span className={`font-bold text-xs ${row.quantity > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    {
      header: 'Notes / Reference',
      render: (row) => (
        <span className="text-xs text-slate-500 truncate max-w-xs block">
          {row.notes || row.referenceId || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centralized Inventory Engine</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Available Stock = Physical Stock − Reserved Stock − Damaged Stock
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedWarehouseFilter}
            onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w._id} value={w._id}>{w.name}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={activeTab === 'transactions' ? fetchTransactions : fetchInventory}
            className="gap-2 text-xs"
          >
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes size={16} /> All Stock Partition Records
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 px-4 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'transactions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History size={16} /> Full Transaction Audit Log
        </button>
      </div>

      {/* Table Content */}
      {activeTab === 'inventory' && (
        <Table
          columns={inventoryColumns}
          data={inventories}
          loading={loading}
          emptyMessage="No inventory records found"
        />
      )}

      {activeTab === 'transactions' && (
        <Table
          columns={transactionColumns}
          data={transactions}
          loading={loading}
          emptyMessage="No transaction logs recorded"
        />
      )}

      {/* Stock In Modal */}
      <Modal
        isOpen={isStockInModalOpen}
        onClose={() => setIsStockInModalOpen(false)}
        title="Receive Incoming Stock"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleStockInSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-xs">
            <p className="font-bold text-slate-800">{selectedRecord?.productId?.name}</p>
            <p className="text-slate-500">Warehouse: {selectedRecord?.warehouseId?.name}</p>
            <p className="text-slate-500">Current Physical: {selectedRecord?.physicalStock} units</p>
          </div>

          <Input
            label="Quantity to Add"
            type="number"
            min="1"
            value={formQuantity}
            onChange={(e) => setFormQuantity(e.target.value)}
            placeholder="e.g. 50"
            required
          />

          <Input
            label="PO / Invoice / Reference Notes"
            value={formReason}
            onChange={(e) => setFormReason(e.target.value)}
            placeholder="e.g. PO-2026-992 supplier restocking"
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsStockInModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Confirm Stock-In</Button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title="Audit Stock Adjustment"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-lg text-xs">
            <p className="font-bold text-slate-800">{selectedRecord?.productId?.name}</p>
            <p className="text-slate-500">Warehouse: {selectedRecord?.warehouseId?.name}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="New Physical Stock"
              type="number"
              min="0"
              value={newPhysical}
              onChange={(e) => setNewPhysical(e.target.value)}
              required
            />
            <Input
              label="New Damaged Stock"
              type="number"
              min="0"
              value={newDamaged}
              onChange={(e) => setNewDamaged(e.target.value)}
              required
            />
          </div>

          <Input
            label="Audit Justification"
            value={formReason}
            onChange={(e) => setFormReason(e.target.value)}
            placeholder="e.g. Physical cycle count audit discrepancy"
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Adjustment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
