// ──────────────────────────────────────────────
// Register Page
// ──────────────────────────────────────────────

import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, User, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/Button.tsx';
import { Input } from '@/components/ui/Input.tsx';
import { useAuth } from '@/providers/AuthProvider.tsx';

export function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(form.email, form.username, form.displayName, form.password);
      navigate('/');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ?? 'Registration failed. Please try again.';
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
        <h2 className="text-2xl font-bold mb-2">Create your account</h2>
        <p className="text-text-secondary">
          Start organizing your collections today
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" id="register-form">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm"
          >
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Display Name"
            type="text"
            id="register-display-name"
            placeholder="John Doe"
            value={form.displayName}
            onChange={(e) => updateField('displayName', e.target.value)}
            leftIcon={<User size={16} />}
            autoComplete="name"
            required
          />

          <Input
            label="Username"
            type="text"
            id="register-username"
            placeholder="johndoe"
            value={form.username}
            onChange={(e) => updateField('username', e.target.value)}
            leftIcon={<AtSign size={16} />}
            autoComplete="username"
            required
          />
        </div>

        <Input
          label="Email"
          type="email"
          id="register-email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          leftIcon={<Mail size={16} />}
          autoComplete="email"
          required
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          id="register-password"
          placeholder="Minimum 8 characters"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
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
          autoComplete="new-password"
          hint="Must be at least 8 characters"
          required
        />

        <Input
          label="Confirm Password"
          type={showPassword ? 'text' : 'password'}
          id="register-confirm-password"
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          leftIcon={<Lock size={16} />}
          autoComplete="new-password"
          required
        />

        <div className="pt-1">
          <Button
            type="submit"
            variant="accent"
            size="lg"
            fullWidth
            isLoading={isLoading}
            id="register-submit"
          >
            Create Account
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-accent hover:text-accent-hover font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
