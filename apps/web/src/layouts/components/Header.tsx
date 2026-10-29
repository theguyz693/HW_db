// ──────────────────────────────────────────────
// Header — search and the one primary action. Every control here works.
// ──────────────────────────────────────────────

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Search, ScanBarcode } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { Button } from '@/components/ui/Button.tsx';

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    navigate(query ? `/search?q=${encodeURIComponent(query)}` : '/search');
  };

  return (
    <header className="h-14 border-b border-border bg-bg-primary/70 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-30">
      <div className="flex items-center gap-3 h-full px-4 lg:px-6">
        <form role="search" onSubmit={submit} className="relative flex-1 max-w-md">
          <label htmlFor="global-search" className="sr-only">
            Search your cars
          </label>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            id="global-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your cars…"
            className="w-full h-9 pl-9 pr-3 rounded-full bg-bg-surface border border-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </form>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ScanBarcode size={16} />}
            className="hidden sm:inline-flex"
            onClick={() => navigate('/scan')}
          >
            Scan a car
          </Button>
          {user && (
            <Link
              to="/profile"
              aria-label="Your profile"
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-white text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {user.displayName?.[0]?.toUpperCase() ?? '?'}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
