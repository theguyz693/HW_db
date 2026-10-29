// ──────────────────────────────────────────────
// React Router configuration
// ──────────────────────────────────────────────

import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from '@/layouts/AppLayout.tsx';
import { AuthLayout } from '@/layouts/AuthLayout.tsx';
import { ProtectedRoute, GuestRoute, LoginPage, RegisterPage } from '@/features/auth/index.ts';
import { HomePage } from '@/features/home/index.ts';

// Feature Pages
import { CollectionsPage } from '@/features/collections/pages/CollectionsPage.tsx';
import { CollectionDetailsPage } from '@/features/collections/pages/CollectionDetailsPage.tsx';
import { SearchPage } from '@/features/search/pages/SearchPage.tsx';
import { ScanToCollectPage } from '@/features/hotwheels/pages/ScanToCollectPage.tsx';
import { StatsPage } from '@/features/stats/pages/StatsPage.tsx';
import { ProfilePage } from '@/features/profile/pages/ProfilePage.tsx';
import { SettingsPage } from '@/features/settings/pages/SettingsPage.tsx';
import { GaragePage } from '@/features/hotwheels/pages/GaragePage.tsx';
import { ItemDetailPage } from '@/features/hotwheels/pages/ItemDetailPage.tsx';

export const router = createBrowserRouter([
  // ── Auth routes (guest only) ──
  {
    element: (
      <GuestRoute>
        <AuthLayout />
      </GuestRoute>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },

  // ── App routes (authenticated) ──
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/collections/:slug', element: <CollectionDetailsPage /> },
      { path: '/garage', element: <GaragePage /> },
      // Showcase is now a view inside My Garage.
      { path: '/showcase', element: <Navigate to="/garage?view=showcase" replace /> },
      { path: '/items/:id', element: <ItemDetailPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/scan', element: <ScanToCollectPage /> },
      { path: '/stats', element: <StatsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
]);
