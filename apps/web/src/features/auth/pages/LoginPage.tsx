// ──────────────────────────────────────────────
// Login Page
// ──────────────────────────────────────────────

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useAuth } from '@/providers/AuthProvider.tsx';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? 'Login failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Welcome back</h2>
        <p className="text-text-secondary">
          Sign in to continue managing your collections
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-accent/5 border border-accent/15 text-xs text-text-secondary leading-relaxed space-y-1.5 mb-6">
        <p className="font-bold text-accent">Demo Access (Offline Client Mode)</p>
        <p>Use the default collector credentials below or input any details to register a fresh device session:</p>
        <div className="flex items-center justify-between bg-bg-surface/50 p-2.5 rounded-xl border border-border mt-1">
          <div>
            <p className="font-mono"><span className="text-text-muted">Email:</span> collector@example.com</p>
            <p className="font-mono"><span className="text-text-muted">Pass:</span> admin123</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail('collector@example.com');
              setPassword('admin123');
            }}
            className="px-2.5 py-1 rounded bg-accent/10 border border-accent/20 hover:bg-accent/15 text-accent font-semibold transition-colors text-[10px] cursor-pointer"
          >
            Autofill
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm"
          >
            {error}
          </motion.div>
        )}

        <Input
          label="Email"
          type="email"
          id="login-email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail size={16} />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="login-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock size={16} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="cursor-pointer hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border bg-bg-surface accent-accent"
            />
            Remember me
          </label>
          <button
            type="button"
            className="text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="accent"
          size="lg"
          fullWidth
          isLoading={isLoading}
          id="login-submit"
        >
          Sign In
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Don't have an account?{' '}
        <Link
          to="/register"
          className="text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Create one
        </Link>
      </p>
    </motion.div>
  );
}
