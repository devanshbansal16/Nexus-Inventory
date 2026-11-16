import React from 'react';
import Loader from './Loader';
import EmptyState from './EmptyState';

export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  emptyDescription = 'There are no items to display at this time.',
  onRowClick,
}) {
  if (loading) {
    return <Loader text="Loading data..." />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title={emptyMessage} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`px-5 py-3.5 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || row._id || rowIdx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-slate-50/80' : 'hover:bg-slate-50/50'
              }`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={col.key || colIdx}
                  className={`px-5 py-3.5 whitespace-nowrap ${col.cellClassName || ''}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
