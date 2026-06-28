import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { Loader2, Phone, MessageSquare } from 'lucide-react';

import { AuthLayout } from '@/components/layout/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorAlert } from '@/components/ui/error-alert';
import { useAuth } from '@/providers/auth-provider';
import { phoneLoginSchema, type PhoneLoginFormData } from '@/schemas/auth.schema';

export default function LoginPage() {
  const navigate = useNavigate();
  const { requestOtp } = useAuth();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneLoginFormData>({
    resolver: zodResolver(phoneLoginSchema),
    defaultValues: {
      phone: '',
    },
  });

  const onSubmit = async (data: PhoneLoginFormData) => {
    try {
      setError('');
      // Request OTP
      const result = await requestOtp(data.phone);
      
      // Navigate to OTP verification screen passing the phone
      navigate('/verify-otp', {
        state: { 
          phone: data.phone,
          deliveryChannel: result.deliveryChannel,
          expiresInSeconds: result.expiresInSeconds
        },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    }
  };

  return (
    <AuthLayout
      title="Sign in or Sign up"
      subtitle="Enter your mobile number to verify and access your account"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <ErrorAlert message={error} />

        <div className="space-y-2">
          <Label htmlFor="phone" required>Mobile Number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="+919999999999"
              className="pl-10"
              {...register('phone')}
            />
          </div>
          {errors.phone && (
            <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>
          )}
          <p className="text-[11px] text-muted-foreground mt-1">
            Include country code (e.g. +91 for India). We will send a 6-digit OTP code to this number.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full h-11 gradient-primary text-white font-semibold"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending OTP...
            </>
          ) : (
            <>
              <MessageSquare className="h-4 w-4 mr-2" />
              Get Verification Code
            </>
          )}
        </Button>

        <div className="rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-100/50 dark:border-teal-900/30 p-3 text-xs text-teal-800 dark:text-teal-400">
          🔒 MedCounsel AI will first try delivering verification codes instantly via <strong>WhatsApp</strong>. If it fails or is unavailable, we will automatically fallback to standard carrier <strong>SMS</strong>.
        </div>
      </form>
    </AuthLayout>
  );
}
