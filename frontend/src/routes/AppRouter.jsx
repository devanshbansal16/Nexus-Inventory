import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';

import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Warehouses from '../pages/Warehouses';
import Inventory from '../pages/Inventory';
import Orders from '../pages/Orders';
import Marketplaces from '../pages/Marketplaces';
import Synchronization from '../pages/Synchronization';
import Transfers from '../pages/Transfers';
import Forecasting from '../pages/Forecasting';
import Analytics from '../pages/Analytics';
import Notifications from '../pages/Notifications';
import Users from '../pages/Users';
import Settings from '../pages/Settings';
import Login from '../pages/Login';
import Register from '../pages/Register';
import NotFound from '../pages/NotFound';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppRouter() {
  return (
    <Routes>
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/marketplaces" element={<Marketplaces />} />
        <Route path="/sync" element={<Synchronization />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/forecasting" element={<Forecasting />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRouter;
