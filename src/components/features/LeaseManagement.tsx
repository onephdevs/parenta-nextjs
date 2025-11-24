'use client';

import { useState, useEffect } from 'react';

export default function LeaseManagement() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'renewals' | 'moveouts'>('alerts');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [renewals, setRenewals] = useState<any[]>([]);
  const [moveouts, setMoveouts] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlerts();
    if (activeTab === 'renewals') fetchRenewals();
    if (activeTab === 'moveouts') fetchMoveouts();
  }, [activeTab]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/alerts', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/renewals', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setRenewals(data.renewals || []);
    } catch (error) {
      console.error('Error fetching renewals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoveouts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/moveouts', { credentials: 'include' });
      const data = await response.json();
      if (data.success) setMoveouts(data.moveouts || []);
    } catch (error) {
      console.error('Error fetching move-outs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/lease/alerts/generate', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        alert(`Generated ${data.alerts_generated} alert(s)`);
        fetchAlerts();
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
      alert('Failed to generate alerts');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Lease Management</h2>
        {activeTab === 'alerts' && (
          <button
            onClick={handleGenerateAlerts}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Generating...' : 'Generate Alerts'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-300 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'alerts' ? 'border-blue-500 text-blue-600' : 'border-transparent'
            }`}
          >
            ⚠️ Expiration Alerts
          </button>
          <button
            onClick={() => setActiveTab('renewals')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'renewals' ? 'border-blue-500 text-blue-600' : 'border-transparent'
            }`}
          >
            🔄 Renewals
          </button>
          <button
            onClick={() => setActiveTab('moveouts')}
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === 'moveouts' ? 'border-blue-500 text-blue-600' : 'border-transparent'
            }`}
          >
            📦 Move-Outs
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length === 0 ? (
                <p className="text-gray-500">No pending alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="p-4 border rounded bg-yellow-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{alert.tenant_name}</h3>
                        <p className="text-sm text-gray-600">
                          {alert.building_name} - Room {alert.room_number}
                        </p>
                        <p className="text-sm mt-2">
                          <strong>Lease Ends:</strong> {new Date(alert.lease_end_date).toLocaleDateString()}
                        </p>
                        <p className="text-sm">
                          <strong>Days Until Expiry:</strong>{' '}
                          <span className="font-bold text-red-600">{alert.days_until_expiry}</span>
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm">
                        {alert.alert_type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'renewals' && (
            <div className="space-y-4">
              {renewals.length === 0 ? (
                <p className="text-gray-500">No renewal requests</p>
              ) : (
                renewals.map((renewal) => (
                  <div key={renewal.id} className="p-4 border rounded bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{renewal.tenant_name}</h3>
                        <p className="text-sm text-gray-600">
                          {renewal.building_name} - Room {renewal.room_number}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Current Rent:</strong> ₱{renewal.current_monthly_rent}
                          </div>
                          <div>
                            <strong>Proposed Rent:</strong> ₱{renewal.proposed_monthly_rent}
                          </div>
                          <div>
                            <strong>Current End:</strong>{' '}
                            {new Date(renewal.current_lease_end_date).toLocaleDateString()}
                          </div>
                          <div>
                            <strong>Proposed End:</strong>{' '}
                            {new Date(renewal.proposed_lease_end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          renewal.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : renewal.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {renewal.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'moveouts' && (
            <div className="space-y-4">
              {moveouts.length === 0 ? (
                <p className="text-gray-500">No move-out processing records</p>
              ) : (
                moveouts.map((moveout) => (
                  <div key={moveout.id} className="p-4 border rounded bg-white">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{moveout.tenant_name}</h3>
                        <p className="text-sm text-gray-600">
                          {moveout.building_name} - Room {moveout.room_number}
                        </p>
                        <p className="text-sm mt-2">
                          <strong>Move-Out Date:</strong>{' '}
                          {new Date(moveout.moveout_date).toLocaleDateString()}
                        </p>
                        {moveout.forwarding_address && (
                          <p className="text-sm">
                            <strong>Forwarding Address:</strong> {moveout.forwarding_address}
                          </p>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 rounded text-sm ${
                          moveout.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {moveout.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

