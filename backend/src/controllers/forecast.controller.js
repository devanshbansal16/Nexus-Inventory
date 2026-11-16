const { Forecast, Product, Order, Inventory } = require('../models');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');
const inventoryService = require('../services/inventory.service');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const getForecastByProductId = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const stock = await inventoryService.getTotalStock(productId);

  // Check if saved forecast exists in MongoDB
  let forecast = await Forecast.findOne({ productId }).sort({ createdAt: -1 });

  // If not generated yet or stale, generate moving average forecast
  if (!forecast) {
    const dailyDemand = Math.max(1, Math.round(product.reorderQuantity / 14));
    const predicted7 = dailyDemand * 7;
    const isRisk = stock.availableStock < predicted7;

    forecast = new Forecast({
      productId,
      horizonDays: 7,
      predictedDemand: predicted7,
      confidenceInterval: {
        lower: Math.round(predicted7 * 0.85),
        upper: Math.round(predicted7 * 1.2),
      },
      recommendedReorderQuantity: isRisk ? product.reorderQuantity : 0,
      recommendedRestockDate: isRisk ? new Date(Date.now() + 3 * 86400000) : null,
      isStockoutRisk: isRisk,
      modelName: 'MovingAverage_Baseline_v1',
    });
    await forecast.save();
  }

  // Generate historical trend mockup data for UI charts
  const historicalDays = [];
  for (let i = 14; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    historicalDays.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      actualDemand: Math.max(0, Math.round((forecast.predictedDemand / 7) + (Math.sin(i) * 3))),
    });
  }

  const predictedDays = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    predictedDays.push({
      date: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      predictedDemand: Math.round(forecast.predictedDemand / 7),
    });
  }

  return new ApiResponse(200, 'Product demand forecast fetched', {
    product,
    currentAvailableStock: stock.availableStock,
    forecast,
    historicalDemand: historicalDays,
    predictedDemandChart: predictedDays,
  }).send(res, 200);
});

const generateForecast = asyncHandler(async (req, res) => {
  const { productId, horizonDays = 7 } = req.body;
  const product = await Product.findById(productId);
  if (!product) throw new ApiError(404, 'Product not found');

  const stock = await inventoryService.getTotalStock(productId);

  let predictedDemand = 0;
  let modelName = 'MovingAverage_Baseline_v1';

  try {
    // Attempt calling Python FastAPI AI service
    const response = await fetch(`${AI_SERVICE_URL}/forecast/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, horizon: horizonDays }),
      signal: AbortSignal.timeout(3000),
    });
    if (response.ok) {
      const data = await response.json();
      if (data?.predicted_demand) {
        predictedDemand = Math.round(data.predicted_demand);
        modelName = data.model_name || 'FastAPI_ScikitLearn_v1';
      }
    }
  } catch (err) {
    console.warn(`[AI Service] FastAPI service unreachable (${err.message}), using fallback statistical model`);
    // Fallback baseline: average order demand or reorder quantity ratio
    const avgDaily = Math.max(2, Math.round(product.reorderQuantity / 14));
    predictedDemand = avgDaily * horizonDays;
  }

  const isRisk = stock.availableStock < predictedDemand;
  const recommendedReorder = isRisk ? Math.max(product.reorderQuantity, predictedDemand - stock.availableStock + 10) : 0;

  const forecast = new Forecast({
    productId,
    horizonDays,
    predictedDemand,
    confidenceInterval: {
      lower: Math.round(predictedDemand * 0.85),
      upper: Math.round(predictedDemand * 1.15),
    },
    recommendedReorderQuantity: recommendedReorder,
    recommendedRestockDate: isRisk ? new Date(Date.now() + 4 * 86400000) : null,
    isStockoutRisk: isRisk,
    modelName,
  });

  await forecast.save();

  return new ApiResponse(200, 'Forecast generated successfully', forecast).send(res, 200);
});

const getRecommendations = asyncHandler(async (req, res) => {
  const products = await Product.find({ isActive: true });
  const recommendations = [];

  for (const prod of products) {
    const stock = await inventoryService.getTotalStock(prod._id);
    let forecast = await Forecast.findOne({ productId: prod._id }).sort({ createdAt: -1 });

    if (!forecast) {
      const daily = Math.max(2, Math.round(prod.reorderQuantity / 14));
      const pred = daily * 7;
      forecast = {
        predictedDemand: pred,
        isStockoutRisk: stock.availableStock < pred,
        recommendedReorderQuantity: stock.availableStock < pred ? prod.reorderQuantity : 0,
      };
    }

    if (stock.availableStock <= prod.minimumStockLevel || forecast.isStockoutRisk) {
      recommendations.push({
        productId: prod._id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        brand: prod.brand,
        image: prod.image,
        currentStock: stock.availableStock,
        predictedDemand: forecast.predictedDemand,
        recommendedReorderQuantity: forecast.recommendedReorderQuantity || prod.reorderQuantity,
        urgency: stock.availableStock <= 5 ? 'CRITICAL' : 'HIGH',
      });
    }
  }

  return new ApiResponse(200, 'Reorder recommendations fetched', recommendations).send(res, 200);
});

const getForecastByWarehouse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventories = await Inventory.find({ warehouseId: id }).populate('productId');

  const forecasts = inventories.map((inv) => {
    const dailyDemand = Math.max(1, Math.round((inv.productId?.reorderQuantity || 50) / 20));
    return {
      product: inv.productId,
      availableStock: inv.availableStock,
      predicted7DayDemand: dailyDemand * 7,
      isRisk: inv.availableStock < dailyDemand * 7,
    };
  });

  return new ApiResponse(200, 'Warehouse forecast insights', forecasts).send(res, 200);
});

module.exports = {
  getForecastByProductId,
  generateForecast,
  getRecommendations,
  getForecastByWarehouse,
};
