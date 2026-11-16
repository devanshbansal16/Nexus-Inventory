import React from 'react';
import Card from '../common/Card';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function RecentOrders({ orders = [], loading = false }) {
  return (
    <Card title="Recent Orders" subtitle="Latest marketplace and store orders">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-3">Order ID</th>
              <th className="py-2.5 px-3">Marketplace</th>
              <th className="py-2.5 px-3">Amount</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-400">
                  No recent orders available
                </td>
              </tr>
            ) : (
              orders.slice(0, 5).map((order) => (
                <tr key={order.orderId || order._id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 font-medium text-slate-800">
                    {order.orderId || order.marketplaceOrderId}
                  </td>
                  <td className="py-3 px-3 capitalize">
                    {order.marketplace?.name || order.marketplace || 'Direct'}
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-700">
                    {formatCurrency(order.totalAmount || 0)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={order.orderStatus} />
                  </td>
                  <td className="py-3 px-3 text-slate-400">
                    {formatDate(order.createdAt || order.orderDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
