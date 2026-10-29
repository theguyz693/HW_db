// ──────────────────────────────────────────────
// BottomNav — mobile navigation
// ──────────────────────────────────────────────

import { NavLink, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { Home, Library, ScanBarcode, Search, Warehouse } from 'lucide-react';

const navItems = [
  { label: 'Home', path: '/', icon: Home },
  { label: 'Garage', path: '/garage', icon: Warehouse },
  { label: 'Scan', path: '/scan', icon: ScanBarcode, isCenter: true },
  { label: 'Collections', path: '/collections', icon: Library },
  { label: 'Explore', path: '/search', icon: Search },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-secondary/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="relative -mt-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-violet flex items-center justify-center shadow-lg shadow-accent/20 active:scale-95 transition-transform">
                  <Icon size={24} className="text-white" />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={clsx(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-xl relative',
                'transition-colors duration-200',
                isActive ? 'text-accent' : 'text-text-muted',
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-indicator"
                  className="absolute -top-1 w-4 h-0.5 rounded-full bg-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
