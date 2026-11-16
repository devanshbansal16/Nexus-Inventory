import React, { useState } from 'react';
import { Bell, AlertTriangle, CheckCircle, RefreshCw, ShoppingCart, ShieldAlert } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function Notifications() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Low Inventory Warning: MacBook Pro 16 M3 Max',
      message: 'Available stock across all warehouses has dropped to 12 units (threshold: 15). AI recommends restocking 40 units.',
      type: 'LOW_STOCK',
      severity: 'warning',
      timestamp: '10 minutes ago',
      read: false,
    },
    {
      id: 2,
      title: 'New Amazon Order Received: AMZ-402-9182374',
      message: 'Customer purchased 2 units of LAP-MBP-16. Delhi Northern Hub allocated for fulfillment.',
      type: 'NEW_ORDER',
      severity: 'info',
      timestamp: '25 minutes ago',
      read: false,
    },
    {
      id: 3,
      title: 'Multi-Channel Stock Synchronization Completed',
      message: 'Published updated stock (88 units) to Amazon, Flipkart, Meesho, and Shopify in 45ms.',
      type: 'SYNC_SUCCESS',
      severity: 'success',
      timestamp: '26 minutes ago',
      read: true,
    },
    {
      id: 4,
      title: 'Stock Transfer In-Transit: TRF-2026-001',
      message: 'Vikram Singh dispatched 10 units of LAP-MBP-16 from Delhi Northern Hub to Mumbai Western Hub.',
      type: 'TRANSFER',
      severity: 'info',
      timestamp: '2 hours ago',
      read: true,
    },
  ]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">System Notifications & Alerts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time feed for inventory breaches, order webhooks, sync errors, and warehouse operations
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} className="text-xs">
          Mark All as Read
        </Button>
      </div>

      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-4 rounded-xl border transition-colors flex items-start gap-3.5 ${
              n.read ? 'bg-white border-slate-200/80' : 'bg-indigo-50/40 border-indigo-200'
            }`}
          >
            <div
              className={`p-2 rounded-lg flex-shrink-0 ${
                n.severity === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : n.severity === 'success'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {n.severity === 'warning' ? (
                <AlertTriangle size={18} />
              ) : n.severity === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <Bell size={18} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                <span className="text-[10px] text-slate-400">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
