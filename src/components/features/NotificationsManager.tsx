'use client';

import { useState } from 'react';

export default function NotificationsManager() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleGenerateReminders = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/notifications/reminders/generate', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        alert(data.message);
      } else {
        alert('Error: ' + (data.error || 'Failed to generate reminders'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to generate reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessQueue = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/notifications/queue/process', {
        credentials: 'include',
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        alert(data.message);
      } else {
        alert('Error: ' + (data.error || 'Failed to process queue'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to process notification queue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Notifications & Reminders</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Generate Reminders Card */}
        <div className="p-6 border border-gray-300 rounded-lg bg-white">
          <h3 className="text-lg font-semibold mb-3">📅 Generate Payment Reminders</h3>
          <p className="text-sm text-gray-900 mb-4">
            Automatically create reminders for upcoming invoice due dates based on your settings.
          </p>
          <button
            onClick={handleGenerateReminders}
            disabled={loading}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Generating...' : 'Generate Reminders'}
          </button>
        </div>

        {/* Process Queue Card */}
        <div className="p-6 border border-gray-300 rounded-lg bg-white">
          <h3 className="text-lg font-semibold mb-3">📧 Process Notification Queue</h3>
          <p className="text-sm text-gray-900 mb-4">
            Send all pending notifications in the queue. This happens automatically, but you can trigger it manually.
          </p>
          <button
            onClick={handleProcessQueue}
            disabled={loading}
            className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Process Queue'}
          </button>
        </div>
      </div>

      {/* Result Display */}
      {result && (
        <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
          <h4 className="font-semibold mb-2">Last Operation Result:</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {/* Information Section */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold mb-3 text-gray-900">ℹ️ How Notifications Work</h3>
        <div className="space-y-2 text-sm">
          <p className="text-gray-900"><strong className="text-gray-900">1. Payment Reminders:</strong> Automatically sent X days before invoice due date</p>
          <p className="text-gray-900"><strong className="text-gray-900">2. Overdue Notices:</strong> Sent when invoices become overdue</p>
          <p className="text-gray-900"><strong className="text-gray-900">3. Payment Confirmations:</strong> Sent when payments are recorded</p>
          <p className="text-gray-900"><strong className="text-gray-900">4. Invoice Notifications:</strong> Sent when new invoices are generated</p>
          <p className="text-gray-900"><strong className="text-gray-900">5. Lease Expiry Warnings:</strong> Sent before lease end dates</p>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm font-medium text-gray-900">⚙️ Configuration Required:</p>
          <p className="text-xs mt-1 text-gray-900">
            Make sure to set your <code className="bg-yellow-100 px-1 py-0.5 rounded text-gray-900">RESEND_API_KEY</code> and <code className="bg-yellow-100 px-1 py-0.5 rounded text-gray-900">EMAIL_FROM</code> environment variables for email sending to work.
          </p>
        </div>
      </div>
    </div>
  );
}

