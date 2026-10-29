// ──────────────────────────────────────────────
// AuthLayout — login / register pages
// ──────────────────────────────────────────────

import { Outlet } from 'react-router';
import { Sparkles } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex bg-bg-primary dot-pattern">
      {/* Left: Branding panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-2/5 flex-col justify-between p-12 bg-bg-secondary/50 border-r border-border relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-violet/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl gradient-text">CollectorHub</span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            The ultimate platform for
            <span className="gradient-text"> your collections</span>
          </h1>

          <p className="text-text-secondary text-lg leading-relaxed max-w-md">
            Track, organize, and showcase your collectibles with a platform designed
            to make collecting a joy. From Hot Wheels to trading cards — everything
            in one beautiful place.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">50+</p>
            <p className="text-xs text-text-muted">Collection Types</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">∞</p>
            <p className="text-xs text-text-muted">Items Supported</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold gradient-text">Free</p>
            <p className="text-xs text-text-muted">Forever</p>
          </div>
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <span className="font-bold text-2xl gradient-text">CollectorHub</span>
          </div>

          <Outlet />
        </div>
      </div>
    </div>
  );
}
