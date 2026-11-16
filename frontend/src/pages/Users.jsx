import React, { useState } from 'react';
import { Users as UsersIcon, Shield, CheckCircle, XCircle } from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export default function Users() {
  const [users] = useState([
    {
      id: 1,
      name: 'Aditi Sharma',
      email: 'admin@cims.com',
      role: 'Super Admin',
      assignedWarehouses: 'All Warehouses',
      isActive: true,
    },
    {
      id: 2,
      name: 'Rajesh Verma',
      email: 'inventory@cims.com',
      role: 'Inventory Manager',
      assignedWarehouses: 'Global Catalog',
      isActive: true,
    },
    {
      id: 3,
      name: 'Vikram Singh',
      email: 'warehouse.delhi@cims.com',
      role: 'Warehouse Manager',
      assignedWarehouses: 'Delhi Northern Hub',
      isActive: true,
    },
    {
      id: 4,
      name: 'Pooja Nair',
      email: 'warehouse.mumbai@cims.com',
      role: 'Warehouse Manager',
      assignedWarehouses: 'Mumbai Western Hub',
      isActive: true,
    },
    {
      id: 5,
      name: 'Suresh Patel',
      email: 'sales@cims.com',
      role: 'Sales Manager',
      assignedWarehouses: 'Omnichannel Orders',
      isActive: true,
    },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">User & Access Management</h1>
        <p className="text-xs text-slate-500 mt-1">
          Role-Based Access Control (RBAC) governing multi-warehouse permissions and executive access
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
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
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                <td className="py-3 px-4 text-slate-500">{u.email}</td>
                <td className="py-3 px-4">
                  <Badge variant={u.role === 'Super Admin' ? 'danger' : 'indigo'}>
                    {u.role}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-slate-600 font-medium">{u.assignedWarehouses}</td>
                <td className="py-3 px-4">
                  <Badge variant="success">Active</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
