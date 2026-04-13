import { Home, Table, Settings } from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 border-r h-screen p-4">
      <h2 className="font-bold mb-6">HGC Admin</h2>

      <nav className="space-y-2">
        <a className="flex gap-2 items-center" href="/dashboard">
          <Home size={16} /> Dashboard
        </a>

        <a className="flex gap-2 items-center" href="/dashboard/pedidos">
          <Table size={16} /> Pedidos
        </a>

        <a className="flex gap-2 items-center" href="/dashboard/settings">
          <Settings size={16} /> Settings
        </a>
      </nav>
    </div>
  );
}