"""
Forecast model implementations.
"""

from typing import List, Optional
import numpy as np


class ForecastModel:
    """
    Demand forecasting model.

    Uses a simple moving average as the baseline approach,
    with a placeholder for scikit-learn based models
    (e.g., LinearRegression or RandomForestRegressor).
    """

    def __init__(self, window_size: int = 7):
        self.window_size = window_size
        self.is_fitted = False
        self.history: Optional[np.ndarray] = None
        self.model_type = "moving_average"

    def fit(self, sales_data: List[float]) -> dict:
        """
        Fit the model on historical sales data.

        Args:
            sales_data: List of historical daily sales quantities.

        Returns:
            Dictionary with training metrics.
        """
        self.history = np.array(sales_data, dtype=float)
        self.is_fitted = True

        # Calculate basic metrics
        mean_sales = float(np.mean(self.history))
        std_sales = float(np.std(self.history))

        # TODO: Replace with sklearn model training
        # from sklearn.linear_model import LinearRegression
        # from sklearn.ensemble import RandomForestRegressor
        #
        # X = np.arange(len(self.history)).reshape(-1, 1)
        # y = self.history
        # self.sklearn_model = RandomForestRegressor(n_estimators=100)
        # self.sklearn_model.fit(X, y)
        # self.model_type = "random_forest"

        return {
            "samples_used": len(self.history),
            "mean_daily_sales": round(mean_sales, 2),
            "std_daily_sales": round(std_sales, 2),
            "model_type": self.model_type,
            "window_size": self.window_size,
        }

    def predict(self, horizon: int = 7) -> List[dict]:
        """
        Generate demand predictions for the given horizon.

        Args:
            horizon: Number of days to forecast.

        Returns:
            List of prediction dicts with date offset, predicted quantity,
            lower bound, and upper bound.
        """
        if not self.is_fitted or self.history is None:
            # Return dummy predictions if not fitted
            return self._generate_dummy_predictions(horizon)

        # Moving average prediction
        window = self.history[-self.window_size:]
        mean_val = float(np.mean(window))
        std_val = float(np.std(window)) if len(window) > 1 else mean_val * 0.1

        predictions = []
        for day in range(1, horizon + 1):
            # Add slight trend and noise variation
            trend_factor = 1.0 + (day * 0.001)
            predicted = round(mean_val * trend_factor, 2)
            lower = round(max(0, predicted - 1.96 * std_val), 2)
            upper = round(predicted + 1.96 * std_val, 2)

            predictions.append({
                "day_offset": day,
                "predicted_quantity": predicted,
                "lower_bound": lower,
                "upper_bound": upper,
            })

        return predictions

    def _generate_dummy_predictions(self, horizon: int) -> List[dict]:
        """Generate sample predictions when no real data is available."""
        base_value = 50.0
        predictions = []
        for day in range(1, horizon + 1):
            predicted = round(base_value + np.random.uniform(-5, 5), 2)
            predictions.append({
                "day_offset": day,
                "predicted_quantity": predicted,
                "lower_bound": round(predicted * 0.8, 2),
                "upper_bound": round(predicted * 1.2, 2),
            })
        return predictions
