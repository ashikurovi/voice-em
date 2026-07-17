"use client";
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-red-500">Superadmin</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/admin" className="block p-3 rounded bg-gray-700 text-white hover:bg-gray-600 transition">Dashboard</a>
          <a href="/admin/users" className="block p-3 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition">Users</a>
          <a href="/admin/authorities" className="block p-3 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition">Authorities</a>
          <a href="/admin/events" className="block p-3 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition">Emergency Logs</a>
        </nav>
        <div className="p-4 border-t border-gray-700">
          <button 
            onClick={() => {
              document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
              window.location.href = "/login";
            }}
            className="w-full py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
