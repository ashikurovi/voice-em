export default function AdminDashboardPage() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">System Overview</h1>
        <p className="text-gray-400">Welcome to the Superadmin control panel.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-semibold uppercase mb-1">Total Users</h3>
          <p className="text-4xl font-bold text-white">1,248</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-semibold uppercase mb-1">Active Alerts</h3>
          <p className="text-4xl font-bold text-red-500">3</p>
        </div>
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
          <h3 className="text-gray-400 text-sm font-semibold uppercase mb-1">Authorities Registered</h3>
          <p className="text-4xl font-bold text-blue-400">42</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Recent Emergency Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-sm">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              <tr className="hover:bg-gray-750 transition">
                <td className="p-4">John Doe</td>
                <td className="p-4"><span className="text-blue-400 font-medium">POLICE</span></td>
                <td className="p-4">23.8103, 90.4125</td>
                <td className="p-4"><span className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-xs font-bold">ACTIVE</span></td>
                <td className="p-4 text-gray-400">2 mins ago</td>
              </tr>
              <tr className="hover:bg-gray-750 transition">
                <td className="p-4">Jane Smith</td>
                <td className="p-4"><span className="text-gray-300 font-medium">GENERAL</span></td>
                <td className="p-4">23.7937, 90.4066</td>
                <td className="p-4"><span className="bg-green-500/20 text-green-500 px-2 py-1 rounded text-xs font-bold">RESOLVED</span></td>
                <td className="p-4 text-gray-400">1 hour ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
