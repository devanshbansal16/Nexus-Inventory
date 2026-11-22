import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Shield, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import api from '../services/api';

const ROLE_FORMATTERS = {
  super_admin: 'Super Admin',
  inventory_manager: 'Inventory Manager',
  warehouse_manager: 'Warehouse Manager',
  sales_manager: 'Sales Manager',
  staff: 'Staff',
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.data?.data) {
        setUsers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load users from database:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getJurisdiction = (user) => {
    if (user.role === 'super_admin') return 'All Warehouses';
    if (user.role === 'inventory_manager') return 'Global Catalog';
    if (user.role === 'sales_manager') return 'Omnichannel Orders';
    if (user.assignedWarehouses && user.assignedWarehouses.length > 0) {
      return user.assignedWarehouses
        .map((w) => (typeof w === 'object' ? w.name || w.warehouseCode : w))
        .join(', ');
    }
    return 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User & Access Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Role-Based Access Control (RBAC) governing multi-warehouse permissions and executive access
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsers}
          loading={loading}
          className="gap-2"
        >
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Loading users from database...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No users found in database.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Warehouse Jurisdiction</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const formattedRole = ROLE_FORMATTERS[u.role] || u.role || 'Staff';
                return (
                  <tr key={u._id || u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                    <td className="py-3 px-4 text-slate-500">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.role === 'super_admin' ? 'danger' : 'indigo'}>
                        {formattedRole}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{getJurisdiction(u)}</td>
                    <td className="py-3 px-4">
                      <Badge variant={u.isActive ? 'success' : 'neutral'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
