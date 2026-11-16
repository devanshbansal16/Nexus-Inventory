"""
CIMS AI Forecasting Service
FastAPI application for demand forecasting using ML models.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.forecasting.router import router as forecast_router
from app.forecasting.schemas import HealthResponse

app = FastAPI(
    title="CIMS AI Forecasting Service",
    description="AI-powered demand forecasting for the Centralized Inventory Management System",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/forecast/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return HealthResponse(status="healthy", service="CIMS AI Forecasting")


@app.get("/forecast/model-info", tags=["Health"])
async def model_info():
    """Return metadata about the forecasting model."""
    return {
        "model_name": "CIMS Demand Forecaster",
        "version": "1.0.0",
        "algorithm": "Moving Average / Linear Regression",
        "supported_horizons": [7, 14, 30],
        "status": "ready",
        "features": [
            "Historical sales analysis",
            "Seasonal trend detection",
            "Multi-horizon prediction",
        ],
    }


# Include forecasting routes
app.include_router(forecast_router)
