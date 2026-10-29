// ──────────────────────────────────────────────
// AppLayout — main authenticated layout
// ──────────────────────────────────────────────

import { Outlet } from 'react-router';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { BottomNav } from './components/BottomNav.tsx';

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-bg-primary">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}

