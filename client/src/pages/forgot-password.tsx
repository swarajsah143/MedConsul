import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/providers/auth-provider';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const result = await forgotPassword(email.trim());
      setSent(true);
      if (result.resetToken) setDevToken(result.resetToken);
    } catch (err: any) {
      setError(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We've sent password reset instructions">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              If an account exists for <span className="font-semibold text-foreground">{email}</span>,
              you will receive a password reset link shortly.
            </p>
            <p className="text-xs text-muted-foreground">
              Didn't receive the email? Check your spam folder or try again.
            </p>
          </div>

          {/* Dev mode: show reset link */}
          {devToken && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4 space-y-2">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Dev Mode — Reset Link
              </p>
              <Link
                to={`/reset-password?token=${devToken}`}
                className="text-xs text-primary hover:underline break-all block font-mono"
              >
                /reset-password?token={devToken}
              </Link>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={() => { setSent(false); setDevToken(null); }}
              variant="outline"
              className="w-full"
            >
              Try a different email
            </Button>
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we'll send you a reset link">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg border border-destructive/20 animate-fade-in">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" required>Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>
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
              Sending...
            </>
          ) : (
            'Send Reset Link'
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
