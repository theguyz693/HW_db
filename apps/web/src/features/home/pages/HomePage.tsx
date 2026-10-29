// ──────────────────────────────────────────────
// Home — a 3D wordmark and a few lines of text. Nothing else for now;
// the brands strip is saved for the public landing page.
// ──────────────────────────────────────────────

import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { getTimeGreeting } from '@collectorhub/utilities';
import { useAuth } from '@/providers/AuthProvider.tsx';
import { WordmarkHero3D } from '../components/WordmarkHero3D.tsx';

export function HomePage() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div className="max-w-6xl mx-auto min-h-[calc(100vh-10rem)] grid lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
      <div className="h-[300px] sm:h-[380px] lg:h-[460px]">
        <WordmarkHero3D />
      </div>

      <div className="space-y-5 max-w-md">
        <p className="text-sm text-text-muted">
          {getTimeGreeting()}
          {firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.02] text-text-primary">
          Every car, carded and catalogued.
        </h1>
        <p className="text-text-secondary leading-relaxed">
          Scan a car to identify it, hang it on your shelf, and browse your favourites one at a time in the showcase.
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
          <Link
            to="/garage"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Open my garage <ArrowRight size={17} />
          </Link>
          <Link to="/garage?view=showcase" className="text-sm font-semibold text-text-secondary hover:text-text-primary">
            Showcase
          </Link>
        </div>
      </div>
    </div>
  );
}
