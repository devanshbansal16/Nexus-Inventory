import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '../common/Card';

export default function InventoryChart({ data = [] }) {
  const chartData = data.length > 0 ? data : [
    { warehouse: 'Delhi', available: 120, reserved: 25, damaged: 5 },
    { warehouse: 'Mumbai', available: 95, reserved: 15, damaged: 2 },
    { warehouse: 'Bangalore', available: 140, reserved: 30, damaged: 8 },
  ];

  return (
    <Card title="Warehouse Stock Distribution" subtitle="Available vs Reserved vs Damaged Stock">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="warehouse" stroke="#94a3b8" fontSize={11} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '0.75rem',
                fontSize: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="available" name="Available" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="reserved" name="Reserved" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            <Bar dataKey="damaged" name="Damaged" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
