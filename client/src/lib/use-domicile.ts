import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

/**
 * The signed-in student's domicile state, used to flag fee rows they are not eligible for.
 *
 * `domicileState` lives on the PROFILE (`GET /api/profile`), not on the auth user object, so it
 * needs a fetch. The result is cached module-wide for the session: the fee matrix, the fee detail
 * page and the counsellor lookup all ask for it, and it changes about once in a user's lifetime.
 *
 * Returns '' when unknown — not logged in, profile not set, or the request failed. Callers must
 * treat '' as "say nothing", never as "ineligible": a student who has not filled in their profile
 * must not be told a seat is closed to them (see isOpenTo in ./quota).
 */
let cached: string | null = null;
let inflight: Promise<string> | null = null;

async function fetchDomicile(): Promise<string> {
  if (cached !== null) return cached;
  if (!inflight) {
    inflight = api
      .get<{ data: { profile: { domicileState?: string } } }>('/profile')
      .then((r) => {
        cached = r.data?.profile?.domicileState?.trim() || '';
        return cached;
      })
      // A failed profile read must degrade to "unknown", never block or mislabel the fee table.
      .catch(() => {
        cached = '';
        return cached;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/** Clear the cache — call after the profile is saved so a changed domicile takes effect. */
export function resetDomicileCache(): void {
  cached = null;
}

/**
 * Deliberately does NOT use `useAuth()`. This hook is called from pages (fee matrix, fee detail)
 * that are also rendered outside the provider — in tests, and anywhere a page is mounted
 * standalone — and `useAuth` throws when there is no AuthProvider above it. Reading the token
 * straight from localStorage, exactly where auth-provider puts it, keeps the hook usable anywhere
 * and skips the request entirely for signed-out visitors.
 */
export function useDomicile(): string {
  const [domicile, setDomicile] = useState(cached ?? '');

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem('accessToken');
    } catch {
      token = null; // storage can be unavailable (private mode, SSR-ish environments)
    }
    if (!token) { setDomicile(''); return; }

    let alive = true;
    void fetchDomicile().then((d) => { if (alive) setDomicile(d); });
    return () => { alive = false; };
  }, []);

  return domicile;
}
