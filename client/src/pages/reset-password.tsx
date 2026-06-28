import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Eye, EyeOff, Check, CheckCircle2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/auth-provider';

const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p: string) => /[0-9]/.test(p), label: 'One number' },
];

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  if (!token) {
    return (
      <AuthLayout title="Invalid Reset Link" subtitle="This password reset link is invalid or has expired">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Please request a new password reset link.
          </p>
          <div className="space-y-3">
            <Button asChild className="w-full gradient-primary text-white">
              <Link to="/forgot-password">Request New Link</Link>
            </Button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout title="Password reset" subtitle="Your password has been changed successfully">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            You can now sign in with your new password.
          </p>
          <Button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full h-11 gradient-primary text-white font-semibold"
            size="lg"
          >
            Go to Sign In
          </Button>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allRulesPass) {
      setError('Password does not meet the requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Set new password" subtitle="Enter a new password for your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20 animate-fade-in">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password" required>New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Create a new password"
              className="pl-10 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5">
              {PASSWORD_RULES.map((rule) => {
                const pass = rule.test(password);
                return (
                  <span
                    key={rule.label}
                    className={`flex items-center gap-1.5 text-[11px] transition-colors ${pass ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    <Check className={`w-3 h-3 ${pass ? 'opacity-100' : 'opacity-30'}`} />
                    {rule.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" required>Confirm New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your new password"
              className="pl-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="text-destructive text-xs">Passwords do not match</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-primary text-white font-semibold"
          size="lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Resetting...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>

        <Link
          to="/login"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
