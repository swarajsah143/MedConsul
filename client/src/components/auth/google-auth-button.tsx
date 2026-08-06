import { useEffect, useRef, useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin, type CredentialResponse } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

/** Whether a Google client id is configured — gate rendering AuthDivider + GoogleAuthButton together. */
export const isGoogleAuthEnabled = !!GOOGLE_CLIENT_ID;

interface GoogleAuthButtonProps {
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function AuthDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-slate-200 dark:border-slate-700" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
      </div>
    </div>
  );
}

/**
 * Wraps @react-oauth/google's official Google-branded button. Scoped to just the
 * login/signup pages (not mounted app-wide) so the Google Identity Services script
 * only loads for visitors who reach an auth screen — this app code-splits every page
 * and keeps the login bundle minimal for students on limited mobile data.
 */
export function GoogleAuthButton({ onCredential, onError, disabled }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // GSI's `width` must be a pixel number, not a CSS percentage — measure the container
  // (which itself just fills the form via block layout) so the button matches its width.
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // No client id configured — hide the button rather than rendering one that can only fail.
  if (!GOOGLE_CLIENT_ID) return null;

  const handleSuccess = (response: CredentialResponse) => {
    if (!response.credential) {
      onError('Google sign-in did not return a credential. Please try again.');
      return;
    }
    onCredential(response.credential);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div ref={containerRef} className={disabled ? 'pointer-events-none opacity-50' : ''}>
        {width && (
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => onError('Google sign-in was cancelled or failed. Please try again.')}
            theme="outline"
            shape="rectangular"
            text="continue_with"
            width={width}
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
