const { Warehouse, Inventory } = require('../models');
const ApiError = require('../utils/ApiError');

// Geographic coordinates lookup for Indian cities to estimate distance (Haversine formula)
const CITY_COORDINATES = {
  delhi: { lat: 28.6139, lon: 77.2090 },
  mumbai: { lat: 19.0760, lon: 72.8777 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  hyderabad: { lat: 17.3850, lon: 78.4867 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  pune: { lat: 18.5204, lon: 73.8567 },
  ahmedabad: { lat: 23.0225, lon: 72.5714 },
  jaipur: { lat: 26.9124, lon: 75.7873 },
  lucknow: { lat: 26.8467, lon: 80.9462 },
  chandigarh: { lat: 30.7333, lon: 76.7794 },
};

function calculateDistanceKm(cityA, cityB) {
  const normA = String(cityA || '').toLowerCase().trim();
  const normB = String(cityB || '').toLowerCase().trim();

  if (normA === normB) return 25; // Same city local delivery

  const coordsA = CITY_COORDINATES[normA] || { lat: 28.6, lon: 77.2 };
  const coordsB = CITY_COORDINATES[normB] || { lat: 19.0, lon: 72.8 };

  const R = 6371; // Earth radius in km
  const dLat = ((coordsB.lat - coordsA.lat) * Math.PI) / 180;
  const dLon = ((coordsB.lon - coordsA.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coordsA.lat * Math.PI) / 180) *
      Math.cos((coordsB.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function calculateShippingCost(distanceKm, weightKg = 1) {
  const baseRate = 50;
  const perKmRate = 0.25;
  return Math.round(baseRate + distanceKm * perKmRate * weightKg);
}

class AllocationService {
  constructor() {
    // Configurable scoring weights
    this.weights = {
      proximity: 0.35,      // Shorter distance = higher score
      stockSufficiency: 0.30,// Ample available stock
      shippingCost: 0.20,   // Lower shipping cost
      priority: 0.15,       // Warehouse operational tier
    };
  }

  /**
   * Intelligently selects the best warehouse to fulfill a product quantity
   */
  async allocateWarehouse({ productId, quantity, customerCity = 'Delhi', allowSplit = false }) {
    // Fetch all active warehouses
    const warehouses = await Warehouse.find({ isActive: true });
    if (!warehouses || warehouses.length === 0) {
      throw new ApiError(500, 'No active warehouses configured in system');
    }

    // Fetch inventory for this product across all warehouses
    const inventories = await Inventory.find({ productId });
    const stockMap = new Map();
    inventories.forEach((inv) => {
      stockMap.set(String(inv.warehouseId), inv.availableStock);
    });

    const evaluatedWarehouses = warehouses.map((wh) => {
      const available = stockMap.get(String(wh._id)) || 0;
      const distanceKm = calculateDistanceKm(wh.address?.city, customerCity);
      const shippingCost = calculateShippingCost(distanceKm);

      // Normalize scores between 0 and 100
      const distanceScore = Math.max(0, 100 - (distanceKm / 20)); // 0km = 100, 2000km = 0
      const stockScore = available >= quantity ? 100 : (available / quantity) * 50;
      const costScore = Math.max(0, 100 - (shippingCost / 5));
      const priorityScore = (wh.priority || 1) * 20;

      const totalScore =
        distanceScore * this.weights.proximity +
        stockScore * this.weights.stockSufficiency +
        costScore * this.weights.shippingCost +
        priorityScore * this.weights.priority;

      return {
        warehouse: wh,
        warehouseId: wh._id,
        warehouseCode: wh.warehouseCode,
        warehouseName: wh.name,
        city: wh.address?.city,
        availableStock: available,
        hasFullStock: available >= quantity,
        distanceKm,
        shippingCost,
        totalScore: Math.round(totalScore * 10) / 10,
        allocationReason: `Distance: ${distanceKm} km, Shipping: ₹${shippingCost}, Stock: ${available} units`,
      };
    });

    // Filter warehouses that have full stock to fulfill the order
    const eligible = evaluatedWarehouses.filter((w) => w.hasFullStock);

    if (eligible.length > 0) {
      // Sort by highest total score
      eligible.sort((a, b) => b.totalScore - a.totalScore);
      const selected = eligible[0];
      const alternatives = eligible.slice(1);

      return {
        selectedWarehouse: selected.warehouse,
        allocatedWarehouseId: selected.warehouseId,
        warehouseCode: selected.warehouseCode,
        warehouseName: selected.warehouseName,
        availableStock: selected.availableStock,
        estimatedDistanceKm: selected.distanceKm,
        estimatedShippingCost: selected.shippingCost,
        allocationScore: selected.totalScore,
        allocationReason: `Optimally matched: lowest composite distance (${selected.distanceKm}km) & shipping (₹${selected.shippingCost}) with ${selected.availableStock} available units`,
        alternatives,
        isSplitAllocation: false,
      };
    }

    // If no single warehouse has full stock, check total stock
    const totalAvailable = evaluatedWarehouses.reduce((sum, w) => sum + w.availableStock, 0);

    if (totalAvailable < quantity) {
      throw new ApiError(
        409,
        `Global inventory shortage. Total available across all warehouses: ${totalAvailable}, Ordered: ${quantity}`
      );
    }

    if (!allowSplit) {
      throw new ApiError(
        409,
        `No single warehouse can fulfill ${quantity} units. Single-warehouse fulfillment required. Max in one warehouse: ${Math.max(...evaluatedWarehouses.map((w) => w.availableStock))}`
      );
    }

    // Split allocation across multiple warehouses
    evaluatedWarehouses.sort((a, b) => b.availableStock - a.availableStock);
    let remaining = quantity;
    const splitAllocations = [];

    for (const wh of evaluatedWarehouses) {
      if (remaining <= 0) break;
      if (wh.availableStock > 0) {
        const take = Math.min(wh.availableStock, remaining);
        splitAllocations.push({
          warehouseId: wh.warehouseId,
          warehouseName: wh.warehouseName,
          quantity: take,
          distanceKm: wh.distanceKm,
          shippingCost: wh.shippingCost,
        });
        remaining -= take;
      }
    }

    return {
      selectedWarehouse: splitAllocations[0],
      allocatedWarehouseId: splitAllocations[0].warehouseId,
      warehouseName: 'SPLIT_FULFILLMENT',
      splitAllocations,
      isSplitAllocation: true,
      allocationReason: `Split fulfillment across ${splitAllocations.length} warehouses to fulfill total ${quantity} units`,
    };
  }
}

module.exports = new AllocationService();
