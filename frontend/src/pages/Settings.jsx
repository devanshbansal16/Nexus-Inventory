import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, ShieldCheck, Database, Key } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function Settings() {
  const [settings, setSettings] = useState({
    defaultSafetyBuffer: 5,
    autoSyncEnabled: true,
    syncIntervalSec: 5,
    aiModelEndpoint: 'http://localhost:8000',
    lowStockGlobalThreshold: 10,
  });

  const handleSave = (e) => {
    e.preventDefault();
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">System Settings & Configuration</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure safety stock buffers, marketplace broadcast frequencies, and AI endpoint connectors
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="Inventory Safety Buffers" subtitle="Protect against concurrent multi-channel overselling">
          <div className="space-y-4">
            <div className="max-w-xs">
              <Input
                label="Safety Buffer Percentage (%)"
                type="number"
                min="0"
                max="50"
                value={settings.defaultSafetyBuffer}
                onChange={(e) => setSettings({ ...settings, defaultSafetyBuffer: Number(e.target.value) })}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                With a 5% buffer, 100 available units will be published as 95 units across marketplaces.
              </p>
            </div>
          </div>
        </Card>

        <Card title="AI Service Configuration" subtitle="FastAPI Python predictive forecasting connection">
          <div className="max-w-md">
            <Input
              label="FastAPI Endpoint URL"
              value={settings.aiModelEndpoint}
              onChange={(e) => setSettings({ ...settings, aiModelEndpoint: e.target.value })}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" className="gap-2">
            <Save size={16} /> Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
