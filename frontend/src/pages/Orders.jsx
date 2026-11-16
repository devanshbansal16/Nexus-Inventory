import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Ban, RotateCcw, Eye, MapPin, Truck } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import api from '../services/api';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/orders', { params });
      if (res.data?.data?.orders) {
        setOrders(res.data.data.orders);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await api.post(`/orders/${selectedOrder._id}/cancel`, {
        reason: cancelReason || 'Customer requested cancellation',
      });
      setIsCancelModalOpen(false);
      setCancelReason('');
      fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const columns = [
    {
      header: 'Order IDs',
      render: (row) => (
        <div>
          <p className="font-bold text-slate-800 text-xs font-mono">{row.orderId}</p>
          <p className="text-[11px] text-slate-500 font-mono">Ext: {row.marketplaceOrderId}</p>
        </div>
      ),
    },
    {
      header: 'Marketplace',
      render: (row) => (
        <Badge variant={row.marketplaceId?.code === 'amazon' ? 'warning' : 'info'}>
          {row.marketplaceId?.name || 'Direct'}
        </Badge>
      ),
    },
    {
      header: 'Customer / City',
      render: (row) => (
        <div>
          <p className="font-medium text-slate-800 text-xs">{row.customer?.name}</p>
          <p className="text-[11px] text-slate-500">{row.customer?.shippingAddress?.city || 'Delhi'}</p>
        </div>
      ),
    },
    {
      header: 'Allocated Warehouse',
      render: (row) => {
        const firstItem = row.items?.[0];
        return (
          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
            {firstItem?.allocatedWarehouseId?.name || 'Smart Allocated'}
          </span>
        );
      },
    },
    {
      header: 'Total Amount',
      render: (row) => <span className="font-bold text-slate-800 text-xs">{formatCurrency(row.totalAmount)}</span>,
    },
    {
      header: 'Order Status',
      render: (row) => <StatusBadge status={row.orderStatus} />,
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              setSelectedOrder(row);
              setIsDetailModalOpen(true);
            }}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye size={16} />
          </button>
          {row.orderStatus !== 'CANCELLED' && row.orderStatus !== 'DELIVERED' && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setCancelReason('');
                setIsCancelModalOpen(true);
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Cancel Order & Release Stock"
            >
              <Ban size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Unified Order Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Omnichannel order stream with automated warehouse allocation and reservation tracking
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); fetchOrders(); }} className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by order ID, external order ID, or customer name..."
          />
        </form>
        <div className="flex items-center gap-2 overflow-x-auto">
          {['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((st) => (
            <button
              key={st || 'all'}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st ? st : 'All Orders'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={orders}
        loading={loading}
        emptyMessage="No orders found"
      />

      {/* Order Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Order Details: ${selectedOrder?.orderId}`}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl text-xs">
              <div>
                <p className="text-slate-500 font-medium">Channel / External ID</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {selectedOrder.marketplaceId?.name} ({selectedOrder.marketplaceOrderId})
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Order Placed Date</p>
                <p className="font-bold text-slate-800 text-sm mt-0.5">
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Customer Details</p>
                <p className="font-bold text-slate-800 mt-0.5">{selectedOrder.customer?.name}</p>
                <p className="text-slate-500">{selectedOrder.customer?.email} • {selectedOrder.customer?.phone}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Shipping Destination</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {selectedOrder.customer?.shippingAddress?.city}, {selectedOrder.customer?.shippingAddress?.state} ({selectedOrder.customer?.shippingAddress?.pincode})
                </p>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Ordered Items & Smart Allocation
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-3">Qty</th>
                      <th className="py-2 px-3">Unit Price</th>
                      <th className="py-2 px-3">Allocated Warehouse</th>
                      <th className="py-2 px-3">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{it.productId?.name || it.sku}</p>
                          <p className="text-[11px] text-slate-400 font-mono">SKU: {it.sku}</p>
                        </td>
                        <td className="py-2.5 px-3 font-bold">{it.quantity}</td>
                        <td className="py-2.5 px-3">{formatCurrency(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-700">
                          {it.allocatedWarehouseId?.name || 'Warehouse Match'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {formatCurrency(it.unitPrice * it.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Status: <StatusBadge status={selectedOrder.orderStatus} /></span>
              <span className="text-base font-bold text-slate-800">
                Total: {formatCurrency(selectedOrder.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Order & Release Inventory"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling this order will automatically release all reserved units back to available stock in the allocated warehouse and re-synchronize connected marketplace stock.
          </p>

          <Input
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="e.g. Customer cancelled via support desk"
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Order
            </Button>
            <Button variant="danger" type="submit">
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
