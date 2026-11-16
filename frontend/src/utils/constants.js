export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
};

export const MARKETPLACES = {
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  MEESHO: 'meesho',
  SHOPIFY: 'shopify',
};

export const NAV_ITEMS = [
  { label: 'Overview', path: '/', icon: 'LayoutDashboard' },
  { label: 'Products', path: '/products', icon: 'Package' },
  { label: 'Warehouses', path: '/warehouses', icon: 'Warehouse' },
  { label: 'Inventory', path: '/inventory', icon: 'BoxesStacked' },
  { label: 'Orders', path: '/orders', icon: 'ShoppingCart' },
  { label: 'Marketplaces', path: '/marketplaces', icon: 'Store' },
  { label: 'Synchronization', path: '/sync', icon: 'RefreshCw' },
  { label: 'Stock Transfers', path: '/transfers', icon: 'ArrowLeftRight' },
  { label: 'AI Forecasting', path: '/forecasting', icon: 'BrainCircuit' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Notifications', path: '/notifications', icon: 'Bell' },
  { label: 'User Management', path: '/users', icon: 'Users' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
];
