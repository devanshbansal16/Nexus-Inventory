import React from 'react';
import Badge from './Badge';

export default function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toLowerCase();

  const statusMap = {
    // Orders
    pending: { label: 'Pending', variant: 'warning' },
    confirmed: { label: 'Confirmed', variant: 'info' },
    processing: { label: 'Processing', variant: 'indigo' },
    shipped: { label: 'Shipped', variant: 'info' },
    delivered: { label: 'Delivered', variant: 'success' },
    cancelled: { label: 'Cancelled', variant: 'danger' },
    returned: { label: 'Returned', variant: 'neutral' },

    // Stock transfers
    requested: { label: 'Requested', variant: 'warning' },
    approved: { label: 'Approved', variant: 'info' },
    in_transit: { label: 'In Transit', variant: 'indigo' },
    received: { label: 'Received', variant: 'success' },

    // General status
    active: { label: 'Active', variant: 'success' },
    inactive: { label: 'Inactive', variant: 'neutral' },
    completed: { label: 'Completed', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
    success: { label: 'Success', variant: 'success' },

    // Stock alerts
    in_stock: { label: 'In Stock', variant: 'success' },
    low_stock: { label: 'Low Stock', variant: 'warning' },
    out_of_stock: { label: 'Out of Stock', variant: 'danger' },
  };

  const config = statusMap[normalized] || {
    label: status.replace(/_/g, ' ').toUpperCase(),
    variant: 'neutral',
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
