/**
 * Application-wide constants.
 */
const ROLES = {
  SUPER_ADMIN: 'super_admin',
  INVENTORY_MANAGER: 'inventory_manager',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  SALES_MANAGER: 'sales_manager',
  STAFF: 'staff',
};

const ORDER_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  RETURNED: 'RETURNED',
};

const MARKETPLACES = {
  AMAZON: 'amazon',
  FLIPKART: 'flipkart',
  MEESHO: 'meesho',
  SHOPIFY: 'shopify',
  DIRECT: 'direct',
};

const TRANSFER_STATUS = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  IN_TRANSIT: 'IN_TRANSIT',
  RECEIVED: 'RECEIVED',
  CANCELLED: 'CANCELLED',
};

const SYNC_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

module.exports = {
  ROLES,
  ORDER_STATUS,
  MARKETPLACES,
  TRANSFER_STATUS,
  SYNC_STATUS,
};
