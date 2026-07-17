"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardOverview() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(storedUser);
    if (parsed.role === 'superadmin') {
      router.push('/admin');
      return;
    }

    setUser(parsed);
  }, [router]);

  if (!user) return <div className="text-gray-400">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">Welcome, {user.name}</h2>
        <p className="text-gray-400 mt-2">Manage your emergency settings and view your SOS history.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Emergency Contacts</h3>
          <p className="text-gray-400 text-sm mb-4">Set up trusted contacts who will receive an SMS and email with your live location when you trigger an SOS.</p>
          <button 
            onClick={() => router.push('/dashboard/contacts')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
          >
            Manage Contacts
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-xl font-semibold mb-2">Android App</h3>
          <p className="text-gray-400 text-sm mb-4">Download our Android app to enable voice-activated emergency triggers (e.g., shouting "Help me").</p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors cursor-not-allowed opacity-50">
            Download APK (Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
