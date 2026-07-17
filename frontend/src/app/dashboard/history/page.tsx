"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface EmergencyEvent {
  _id: string;
  triggerType: string;
  status: string;
  createdAt: string;
  locationTrail: { lat: number, lng: number, batteryLevel: number, timestamp: string }[];
}

export default function HistoryPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EmergencyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchHistory(token);
  }, [router]);

  const fetchHistory = async (authToken: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/emergency/history`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-gray-400">Loading SOS history...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">SOS History</h2>
        <p className="text-gray-400 mt-2">View the history of emergency alerts triggered from your account.</p>
      </header>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            You have no SOS history yet. Stay safe!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="bg-gray-900 text-gray-300 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Trigger Type</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Battery</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {events.map((event) => (
                  <tr key={event._id} className="hover:bg-gray-750 transition-colors">
                    <td className="px-6 py-4">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        event.triggerType === 'POLICE' ? 'bg-blue-900/50 text-blue-400' :
                        event.triggerType === 'FIRE_SERVICE' ? 'bg-red-900/50 text-red-400' :
                        'bg-yellow-900/50 text-yellow-400'
                      }`}>
                        {event.triggerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        event.status === 'ACTIVE' ? 'bg-red-500/20 text-red-500' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {event.locationTrail[0]?.batteryLevel ? `${event.locationTrail[0].batteryLevel}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/track/${event._id}`} 
                        className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
                      >
                        View Tracking Map
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
