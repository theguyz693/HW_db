// ──────────────────────────────────────────────
// Sidebar — main navigation for desktop
// ──────────────────────────────────────────────

import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
  Library,
  Search,
  BarChart3,
  ScanBarcode,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
  CarFront,
  Home,
  Warehouse,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider.tsx';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const mainNav: NavItem[] = [
  { label: 'Home', path: '/', icon: <Home size={20} /> },
  { label: 'Explore', path: '/search', icon: <Search size={20} /> },
  { label: 'My Garage', path: '/garage', icon: <Warehouse size={20} /> },
  { label: 'Scan a car', path: '/scan', icon: <ScanBarcode size={20} /> },
];

const manageNav: NavItem[] = [
  { label: 'Collections', path: '/collections', icon: <Library size={20} /> },
  { label: 'Statistics', path: '/stats', icon: <BarChart3 size={20} /> },
];

const isActivePath = (current: string, path: string) =>
  path === '/' ? current === '/' : current === path || current.startsWith(`${path}/`);

const bottomNav: NavItem[] = [
  { label: 'Profile', path: '/profile', icon: <User size={20} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={20} /> },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className={clsx(
        'hidden lg:flex flex-col h-screen sticky top-0',
        'bg-bg-secondary border-r border-border',
        'select-none z-40',
      )}
    >
      {/* ── Logo / Brand ── */}
      <div className="flex items-center h-14 px-4 border-b border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <CarFront size={18} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-lg text-text-primary whitespace-nowrap"
              >
                CollectorHub
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Main Navigation ── */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {mainNav.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={isActivePath(location.pathname, item.path)}
          />
        ))}
        <p className={clsx(
          'text-[10px] uppercase tracking-wider text-text-muted font-semibold pt-4 pb-1',
          collapsed ? 'text-center' : 'px-3',
        )}>
          {collapsed ? '•' : 'Manage'}
        </p>
        {manageNav.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={isActivePath(location.pathname, item.path)}
          />
        ))}
      </nav>

      {/* ── Bottom Section ── */}
      <div className="px-3 py-2 space-y-1 border-t border-border">
        {bottomNav.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            collapsed={collapsed}
            isActive={isActivePath(location.pathname, item.path)}
          />
        ))}

        {/* User Info */}
        {user && (
          <div
            className={clsx(
              'flex items-center gap-3 rounded-xl p-2 mt-2',
              'bg-bg-surface/50',
              collapsed && 'justify-center',
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white text-sm font-bold">
              {user.displayName[0]?.toUpperCase()}
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-xs text-text-muted truncate">@{user.username}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Collapse Toggle ── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={clsx(
          'absolute -right-3 top-20 z-50',
          'w-6 h-6 rounded-full',
          'bg-bg-surface border border-border',
          'flex items-center justify-center',
          'text-text-muted hover:text-text-primary hover:bg-bg-hover',
          'transition-all duration-200 cursor-pointer',
          'shadow-md',
        )}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  );
}

// ── Individual nav link ──

function SidebarLink({
  item,
  collapsed,
  isActive,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  return (
    <NavLink
      to={item.path}
      className={clsx(
        'flex items-center gap-3 h-10 rounded-xl text-sm font-medium',
        'transition-all duration-200 relative group',
        collapsed ? 'justify-center px-0' : 'px-3',
        isActive
          ? 'bg-accent/10 text-accent'
          : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover',
      )}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-accent"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span className="flex-shrink-0">{item.icon}</span>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-bg-surface border border-border text-xs text-text-primary whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
          {item.label}
        </div>
      )}
    </NavLink>
  );
}
