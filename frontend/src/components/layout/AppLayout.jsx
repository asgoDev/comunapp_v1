import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useUiStore } from '../../stores/uiStore';

/**
 * Layout principal: sidebar colapsable, topbar y contenido.
 */
export default function AppLayout() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <TopBar onMenuToggle={toggleSidebar} />

        <div className="flex-1 overflow-y-auto p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
