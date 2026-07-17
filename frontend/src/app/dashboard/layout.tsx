"use client";
import Link from 'next/link';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-gray-800 border-r border-gray-700 p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-wider text-red-500 uppercase">Jevxo Emergency</h1>
          <p className="text-xs text-gray-400 mt-1">User Dashboard</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
            Overview
          </Link>
          <Link href="/dashboard/contacts" className="block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
            Emergency Contacts
          </Link>
          <Link href="/dashboard/history" className="block px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
            SOS History
          </Link>
        </nav>

        <div className="mt-auto pt-6 border-t border-gray-700">
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }} 
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-gray-700 rounded-md transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 lg:p-12 max-h-screen overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
