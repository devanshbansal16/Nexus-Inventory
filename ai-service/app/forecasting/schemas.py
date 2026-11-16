"""
Pydantic schemas for the forecasting service.
"""

from typing import List, Optional
from datetime import date

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str


class TrainRequest(BaseModel):
    """Request body for training a forecast model."""
    product_id: str = Field(..., alias="productId", description="ID of the product to train on")
    force_retrain: bool = Field(False, alias="forceRetrain", description="Force retraining even if model exists")

    model_config = {"populate_by_name": True}


class PredictRequest(BaseModel):
    """Request body for generating predictions."""
    product_id: str = Field(..., alias="productId", description="ID of the product to forecast")
    horizon: int = Field(7, description="Number of days to forecast (7, 14, or 30)", ge=1, le=90)

    model_config = {"populate_by_name": True}


class ForecastPoint(BaseModel):
    """A single forecast data point."""
    date: str
    predicted_quantity: float = Field(..., alias="predictedQuantity")
    lower_bound: float = Field(..., alias="lowerBound")
    upper_bound: float = Field(..., alias="upperBound")

    model_config = {"populate_by_name": True}


class ForecastResponse(BaseModel):
    """Response containing forecast predictions."""
    product_id: str = Field(..., alias="productId")
    horizon: int
    predictions: List[ForecastPoint]
    model_used: str = Field(..., alias="modelUsed")
    confidence: float

    model_config = {"populate_by_name": True}


class TrainResponse(BaseModel):
    """Response after training a model."""
    product_id: str = Field(..., alias="productId")
    status: str
    message: str
    metrics: Optional[dict] = None

    model_config = {"populate_by_name": True}
