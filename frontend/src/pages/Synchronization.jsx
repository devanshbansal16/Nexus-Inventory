import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, RotateCcw, Clock, ShieldCheck, Activity } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import Badge from '../components/common/Badge';
import StatusBadge from '../components/common/StatusBadge';
import { formatDateTime } from '../utils/formatters';
import api from '../services/api';

export default function Synchronization() {
  const [statusData, setStatusData] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, jobsRes] = await Promise.all([
        api.get('/sync/status'),
        api.get('/sync/jobs?limit=25'),
      ]);
      if (statusRes.data?.data) setStatusData(statusRes.data.data);
      if (jobsRes.data?.data?.jobs) setJobs(jobsRes.data.data.jobs);
    } catch (err) {
      console.error('Failed to load sync status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      await api.post('/sync/reconcile');
      alert('Global inventory reconciliation completed across all marketplace channels!');
      fetchData();
    } catch (err) {
      alert('Reconciliation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setReconciling(false);
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      await api.post(`/sync/jobs/${jobId}/retry`);
      fetchData();
    } catch (err) {
      alert('Retry failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const columns = [
    {
      header: 'Job ID / Created',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-bold text-slate-800">{row.jobId || row._id}</p>
          <p className="text-[11px] text-slate-400">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      header: 'Product SKU',
      render: (row) => (
        <span className="font-semibold text-slate-800 text-xs font-mono">
          {row.productId?.sku || 'SKU'}
        </span>
      ),
    },
    {
      header: 'Marketplace',
      render: (row) => <Badge variant="neutral">{row.marketplaceId?.name || 'Channel'}</Badge>,
    },
    {
      header: 'Stock Broadcasted',
      render: (row) => (
        <span className="text-xs font-bold text-slate-800">
          {row.publishedStock} units <span className="text-slate-400 font-normal">/ {row.requestedStock}</span>
        </span>
      ),
    },
    {
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Latency',
      render: (row) => (
        <span className="text-xs font-mono text-slate-500">
          {row.durationMs ? `${row.durationMs}ms` : '—'}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (row) =>
        row.status === 'FAILED' ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleRetryJob(row._id)}
            className="text-xs gap-1 py-1 px-2"
          >
            <RotateCcw size={12} /> Retry
          </Button>
        ) : (
          <span className="text-xs text-emerald-600 font-medium">Synced</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Event-Driven Synchronization Engine</h1>
          <p className="text-xs text-slate-500 mt-1">
            Transactional outbox pattern with BullMQ & Redis queues, automatic retries, and dead-letter recovery
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            loading={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleReconcile}
            loading={reconciling}
            className="gap-2 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Activity size={14} /> Force Full Reconciliation
          </Button>
        </div>
      </div>

      {/* Health Cards per Platform */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusData?.platforms?.map((p) => (
          <div
            key={p.id}
            className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                <span className="text-xs font-bold text-emerald-600">{p.healthPercentage}%</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {p.inSyncListings} of {p.totalListings} listings in sync
              </p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${p.healthPercentage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Failed: <strong className="text-red-600">{p.failedListings}</strong></span>
              <span className="font-mono text-[10px]">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Jobs Log Table */}
      <Card
        title="Recent Marketplace Synchronization Jobs"
        subtitle="Log of all published inventory broadcast events and adapter responses"
      >
        <Table
          columns={columns}
          data={jobs}
          loading={loading}
          emptyMessage="No synchronization jobs recorded yet"
        />
      </Card>
    </div>
  );
}
