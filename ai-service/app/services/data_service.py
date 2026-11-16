"""
Data service for fetching and preprocessing sales data.

This module provides functions to retrieve historical sales data
from the Node.js backend API and preprocess it for model training.
"""

import os
from typing import List, Optional

import httpx
import pandas as pd
import numpy as np
from dotenv import load_dotenv

load_dotenv()

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")


async def fetch_sales_data(product_id: str) -> Optional[List[dict]]:
    """
    Fetch historical sales data for a product from the Node.js backend.

    Args:
        product_id: The product ID to fetch data for.

    Returns:
        List of sales records or None if the request fails.
    """
    url = f"{BACKEND_URL}/api/v1/analytics/sales/{product_id}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
            else:
                print(f"Failed to fetch sales data: {response.status_code}")
                return None
    except httpx.RequestError as e:
        print(f"Error connecting to backend: {e}")
        return None


def preprocess_sales_data(raw_data: List[dict]) -> pd.DataFrame:
    """
    Preprocess raw sales data into a clean DataFrame for model training.

    Args:
        raw_data: List of raw sales records from the backend.

    Returns:
        Cleaned pandas DataFrame with date index and quantity column.
    """
    if not raw_data:
        return pd.DataFrame(columns=["date", "quantity"])

    df = pd.DataFrame(raw_data)

    # Ensure required columns exist
    if "date" not in df.columns or "quantity" not in df.columns:
        raise ValueError("Sales data must contain 'date' and 'quantity' columns.")

    # Parse dates
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Fill missing dates with zero sales
    date_range = pd.date_range(start=df["date"].min(), end=df["date"].max(), freq="D")
    df = df.set_index("date").reindex(date_range, fill_value=0).reset_index()
    df.columns = ["date", "quantity"]

    # Handle negative values
    df["quantity"] = df["quantity"].clip(lower=0)

    return df


def extract_features(df: pd.DataFrame) -> np.ndarray:
    """
    Extract time-series features from the sales DataFrame.

    Args:
        df: Preprocessed sales DataFrame.

    Returns:
        NumPy array of features.
    """
    if df.empty:
        return np.array([])

    features = pd.DataFrame()
    features["day_of_week"] = df["date"].dt.dayofweek
    features["day_of_month"] = df["date"].dt.day
    features["month"] = df["date"].dt.month
    features["is_weekend"] = (df["date"].dt.dayofweek >= 5).astype(int)

    # Rolling statistics
    features["rolling_mean_7"] = df["quantity"].rolling(window=7, min_periods=1).mean()
    features["rolling_std_7"] = df["quantity"].rolling(window=7, min_periods=1).std().fillna(0)
    features["rolling_mean_14"] = df["quantity"].rolling(window=14, min_periods=1).mean()

    # Lag features
    features["lag_1"] = df["quantity"].shift(1).fillna(0)
    features["lag_7"] = df["quantity"].shift(7).fillna(0)

    return features.values
