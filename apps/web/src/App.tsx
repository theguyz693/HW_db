// ──────────────────────────────────────────────
// App — root component, composes all providers
// ──────────────────────────────────────────────

import { RouterProvider } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { QueryProvider } from '@/providers/QueryProvider.tsx';
import { AuthProvider } from '@/providers/AuthProvider.tsx';
import { ThemeProvider } from '@/providers/ThemeProvider.tsx';
import { router } from '@/router.tsx';

export function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#161625',
                color: '#f1f5f9',
                border: '1px solid rgba(148, 163, 184, 0.08)',
                borderRadius: '0.75rem',
                fontSize: '0.875rem',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#161625',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#161625',
                },
              },
            }}
          />
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
