import React from 'react';
import Card from '../common/Card';
import { AlertCircle } from 'lucide-react';
import Badge from '../common/Badge';

export default function LowStockAlerts({ items = [] }) {
  return (
    <Card
      title="Low Stock Alerts"
      subtitle="Products below minimum threshold"
      action={<Badge variant="warning">{items.length} items</Badge>}
    >
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">All inventory levels are healthy</p>
        ) : (
          items.slice(0, 5).map((item, idx) => (
            <div
              key={item.productId || item._id || idx}
              className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-100"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {item.productName || item.name || item.sku}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    SKU: {item.sku} • Min: {item.minimumStockLevel || item.minStock || 10}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-red-600">
                  {item.availableStock ?? item.stock ?? 0} left
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
