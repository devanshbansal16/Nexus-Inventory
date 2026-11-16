import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">CIMS</h1>
          <p className="text-slate-500 mt-1">Central Inventory Management System</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
