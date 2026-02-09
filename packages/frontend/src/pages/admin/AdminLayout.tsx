import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import './admin.css';

const NAV_ITEMS = [
  { to: '/admin/questions', label: 'Questions', icon: 'file-question' },
  { to: '/admin/sessions', label: 'Sessions', icon: 'calendar' },
  { to: '/admin/assign', label: 'Superadmin', icon: 'settings' },
];

// Simple Lucide-style SVG icons
function NavIcon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    'file-question': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <path d="M10 10.3c.2-.4.5-.8.9-1a2.1 2.1 0 0 1 2.6.4c.3.4.5.8.5 1.3 0 1.3-2 2-2 2" />
        <path d="M12 17h.01" />
      </svg>
    ),
    'calendar': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    ),
    'settings': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    'panel-left': (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}

interface AdminLayoutProps {
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function AdminLayout({ sidebarCollapsed: externalCollapsed, onToggleSidebar }: AdminLayoutProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = externalCollapsed ?? internalCollapsed;
  const toggleCollapsed = onToggleSidebar ?? (() => setInternalCollapsed(c => !c));

  return (
    <div className="admin-shell">
      <nav className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
        <button
          className="admin-sidebar__toggle"
          onClick={toggleCollapsed}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <NavIcon name="panel-left" />
        </button>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-nav-item${isActive ? ' admin-nav-item--active' : ''}`
            }
          >
            <span className="admin-nav-icon">
              <NavIcon name={item.icon} />
            </span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
