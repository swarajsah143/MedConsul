import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';

/**
 * Public Privacy Policy + Terms. Required before collecting student identity documents (DPDP Act,
 * 2023). This is a plain-language, good-faith template — have it reviewed by a lawyer before
 * relying on it commercially. Rendered for both /privacy and /terms via the `doc` prop.
 */

const UPDATED = '17 July 2026';
const CONTACT = 'services@earthlingaidtech.com';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
      <div className="mt-2 space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{children}</div>
    </section>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="sticky top-0 z-40 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
        <nav className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-sm"><Stethoscope className="w-5 h-5 text-white" /></div>
            <span className="text-lg font-extrabold tracking-tight">MedCounsel AI</span>
          </Link>
          <div className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/privacy" className="hover:text-emerald-600">Privacy</Link>
            <Link to="/terms" className="hover:text-emerald-600">Terms</Link>
          </div>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {UPDATED} · MedCounsel AI, operated by Earthling Aid Tech.</p>
        {children}
        <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link to="/" className="text-sm text-slate-400 hover:text-emerald-600">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}

function Privacy() {
  return (
    <Shell title="Privacy Policy">
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        This policy explains what personal data MedCounsel AI collects, why, and your rights over it.
        We collect the minimum needed to help you plan your NEET-UG counselling.
      </p>
      <Section title="1. What we collect">
        <p>• <strong>Account details</strong> — your name, email, and password (stored only as a one-way hash).</p>
        <p>• <strong>Counselling profile</strong> — the NEET rank/score, category, domicile state and preferences you choose to enter.</p>
        <p>• <strong>Documents you upload</strong> — identity and counselling documents (e.g. Aadhaar, marksheets) that you choose to add to your checklist.</p>
        <p>• <strong>Usage data</strong> — basic technical logs needed to run and secure the service.</p>
      </Section>
      <Section title="2. How we use it">
        <p>To provide the service — predictions, shortlists, your document checklist and verification — and to secure your account. We do <strong>not</strong> sell your data or share it with advertisers.</p>
      </Section>
      <Section title="3. Your documents">
        <p>Uploaded documents are visible only to you and to authorised counsellors/administrators who help you. They are stored on our servers with restricted access and are never made public.</p>
      </Section>
      <Section title="4. Storage & security">
        <p>Data is transmitted over HTTPS and stored on access-controlled servers. No system is perfectly secure, but we take reasonable technical and organisational measures to protect your information.</p>
      </Section>
      <Section title="5. Retention & your rights (DPDP Act, 2023)">
        <p>We keep your data only as long as your account is active or as needed to provide the service. You may request access to, correction of, or deletion of your personal data — including your uploaded documents — at any time by emailing <a href={`mailto:${CONTACT}`} className="text-emerald-600 hover:underline">{CONTACT}</a>. We will respond within a reasonable time.</p>
      </Section>
      <Section title="6. Children & consent">
        <p>By creating an account you consent to this policy. If you are a minor, a parent or guardian should create and manage the account.</p>
      </Section>
      <Section title="7. Contact">
        <p>Questions or requests: <a href={`mailto:${CONTACT}`} className="text-emerald-600 hover:underline">{CONTACT}</a>.</p>
      </Section>
    </Shell>
  );
}

function Terms() {
  return (
    <Shell title="Terms of Service">
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        By using MedCounsel AI you agree to these terms.
      </p>
      <Section title="1. The service">
        <p>MedCounsel AI provides NEET-UG counselling planning tools — rank prediction, cutoff insights, fee comparison, seat-allotment data, college information and a document checklist.</p>
      </Section>
      <Section title="2. Estimates, not guarantees">
        <p>Predictions, cutoffs, fees and allotment data are <strong>estimates based on previous years' published data</strong>. They are for guidance only and are not a guarantee of admission, seat, rank or fee. Always confirm against the official counselling portals (MCC / your state authority) before making decisions.</p>
      </Section>
      <Section title="3. Your account">
        <p>You are responsible for the accuracy of the information you provide and for keeping your login secure. Don't misuse the service, attempt to breach its security, or upload documents that aren't yours.</p>
      </Section>
      <Section title="4. Subscriptions & payments">
        <p>Paid plans (Pro / Premium) unlock additional features for one counselling season. Pricing is shown on the pricing page. Refunds, where applicable, are handled case by case — contact us. (Online payments are being rolled out; until then plans are activated on request.)</p>
      </Section>
      <Section title="5. Limitation of liability">
        <p>The service is provided "as is". To the extent permitted by law, MedCounsel AI and Earthling Aid Tech are not liable for admission outcomes or decisions made based on the information provided.</p>
      </Section>
      <Section title="6. Changes & contact">
        <p>We may update these terms; material changes will be reflected here with a new date. Questions: <a href={`mailto:${CONTACT}`} className="text-emerald-600 hover:underline">{CONTACT}</a>.</p>
      </Section>
    </Shell>
  );
}

export function PrivacyPage() { return <Privacy />; }
export function TermsPage() { return <Terms />; }
