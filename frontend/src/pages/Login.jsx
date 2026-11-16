import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Mail, Lock, LogIn, KeyRound } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail, rolePass) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">Welcome back</h2>
        <p className="text-xs text-slate-500 mt-1">Sign in to your CIMS management console</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          placeholder="admin@cims.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={Mail}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={Lock}
          required
        />

        <Button type="submit" loading={loading} className="w-full gap-2 mt-2">
          <LogIn size={16} /> Sign In
        </Button>
      </form>

      {/* Demo credentials quick login */}
      <div className="mt-6 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mb-3">
          <KeyRound size={14} className="text-indigo-600" />
          <span>Quick Demo Logins:</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickLogin('admin@cims.com', 'Admin@123')}
            className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200/80 transition-colors"
          >
            <p className="font-semibold text-slate-800">Super Admin</p>
            <p className="text-[10px] text-slate-500">admin@cims.com</p>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('inventory@cims.com', 'Admin@123')}
            className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200/80 transition-colors"
          >
            <p className="font-semibold text-slate-800">Inventory Mgr</p>
            <p className="text-[10px] text-slate-500">inventory@cims.com</p>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('warehouse.delhi@cims.com', 'Admin@123')}
            className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200/80 transition-colors"
          >
            <p className="font-semibold text-slate-800">Warehouse Mgr</p>
            <p className="text-[10px] text-slate-500">warehouse.delhi@cims.com</p>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin('sales@cims.com', 'Admin@123')}
            className="p-2 text-left bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200/80 transition-colors"
          >
            <p className="font-semibold text-slate-800">Sales Mgr</p>
            <p className="text-[10px] text-slate-500">sales@cims.com</p>
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-500">
        Need access? Contact your system administrator or{' '}
        <Link to="/register" className="text-indigo-600 font-semibold hover:underline">
          request registration
        </Link>
      </div>
    </div>
  );
}
