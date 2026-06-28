import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, RotateCw } from 'lucide-react';

import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { useAuth } from '@/providers/auth-provider';

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { verifyOtp, requestOtp } = useAuth();

  const phone = location.state?.phone || '';
  const initialDeliveryChannel = location.state?.deliveryChannel || 'whatsapp';
  const initialExpiresIn = location.state?.expiresInSeconds || 180;

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(initialExpiresIn);
  const [canResend, setCanResend] = useState(false);
  const [deliveryChannel, setDeliveryChannel] = useState<'whatsapp' | 'sms' | 'console'>(initialDeliveryChannel);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect to login if phone is missing
  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
  }, [phone, navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev: number) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];

    if (value.length > 1) {
      // Handle paste
      const digits = value.slice(0, 6).split('');
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pastedData.split('').forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    try {
      setError('');
      setIsVerifying(true);
      await verifyOtp(phone, otpValue);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsResending(true);
      setError('');
      const result = await requestOtp(phone);
      setCountdown(result.expiresInSeconds);
      setDeliveryChannel(result.deliveryChannel);
      setCanResend(false);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Enter Verification Code"
      subtitle={`We've sent a 6-digit OTP code to ${phone}`}
    >
      <div className="space-y-6">
        <ErrorAlert message={error} />

        <div className="text-sm text-center text-muted-foreground">
          OTP sent via: <span className="font-semibold text-primary capitalize">{deliveryChannel}</span>
        </div>

        {/* OTP Input Boxes */}
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 border-input bg-background focus:border-primary focus:ring-2 focus:ring-ring focus:outline-none transition-all duration-200"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Timer */}
        <div className="text-center">
          {countdown > 0 ? (
            <p className="text-sm text-muted-foreground">
              Resend OTP in{' '}
              <span className="font-semibold text-foreground">
                {formatTime(countdown)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-destructive font-semibold">
              OTP has expired
            </p>
          )}
        </div>

        <Button
          onClick={handleVerify}
          className="w-full h-11 gradient-primary text-white font-semibold"
          size="lg"
          disabled={isVerifying || otp.join('').length !== 6}
        >
          {isVerifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" />
              Verify & Proceed
            </>
          )}
        </Button>

        <div className="text-center">
          <button
            onClick={handleResend}
            disabled={!canResend || isResending}
            className="text-sm text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1 font-semibold"
          >
            {isResending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                Resending...
              </>
            ) : (
              <>
                <RotateCw className="h-3.5 w-3.5 mr-1" />
                Resend OTP
              </>
            )}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
}
