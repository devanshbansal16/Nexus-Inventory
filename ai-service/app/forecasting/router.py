"""
Forecasting API routes.
"""

from datetime import date, timedelta
from typing import Dict

from fastapi import APIRouter, HTTPException

from app.forecasting.schemas import (
    TrainRequest,
    TrainResponse,
    PredictRequest,
    ForecastResponse,
    ForecastPoint,
)
from app.forecasting.models import ForecastModel

router = APIRouter(prefix="/forecast", tags=["Forecasting"])

# In-memory model store (keyed by product ID)
_models: Dict[str, ForecastModel] = {}


@router.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """
    Train or retrain a forecasting model for a specific product.

    In production this would fetch historical sales data from the
    Node.js backend. For now it uses stub sample data.
    """
    product_id = request.product_id

    # Check if model already exists and force_retrain is not set
    if product_id in _models and not request.force_retrain:
        return TrainResponse(
            product_id=product_id,
            status="exists",
            message=f"Model for product {product_id} already trained. Set forceRetrain=true to retrain.",
            metrics=None,
        )

    # TODO: Fetch real sales data from the backend via data_service
    # For now, generate sample historical data
    import numpy as np
    sample_sales = list(np.random.poisson(lam=45, size=90).astype(float))

    # Train the model
    model = ForecastModel(window_size=7)
    metrics = model.fit(sample_sales)

    # Store the model
    _models[product_id] = model

    return TrainResponse(
        product_id=product_id,
        status="trained",
        message=f"Model successfully trained for product {product_id} using {len(sample_sales)} data points.",
        metrics=metrics,
    )


@router.post("/predict", response_model=ForecastResponse)
async def predict_demand(request: PredictRequest):
    """
    Generate demand predictions for a specific product.

    If no trained model exists for the product, returns sample forecast data.
    """
    product_id = request.product_id
    horizon = request.horizon

    # Validate horizon
    if horizon not in (7, 14, 30):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported horizon: {horizon}. Supported values are 7, 14, and 30.",
        )

    # Get or create model
    model = _models.get(product_id)
    if model is None:
        model = ForecastModel(window_size=7)
        model_used = "default (untrained)"
        confidence = 0.5
    else:
        model_used = model.model_type
        confidence = 0.85

    # Generate predictions
    raw_predictions = model.predict(horizon)

    # Convert to response format with actual dates
    today = date.today()
    predictions = []
    for pred in raw_predictions:
        forecast_date = today + timedelta(days=pred["day_offset"])
        predictions.append(
            ForecastPoint(
                date=forecast_date.isoformat(),
                predicted_quantity=pred["predicted_quantity"],
                lower_bound=pred["lower_bound"],
                upper_bound=pred["upper_bound"],
            )
        )

    return ForecastResponse(
        product_id=product_id,
        horizon=horizon,
        predictions=predictions,
        model_used=model_used,
        confidence=confidence,
    )
