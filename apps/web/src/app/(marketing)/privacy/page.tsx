import { PageHead } from '@/components/marketing/site';
export const metadata = { title: 'Privacy Policy' };
const S = ({ t, children }: { t: string; children: React.ReactNode }) => <section className="mt-6"><h2 className="text-lg font-semibold">{t}</h2><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{children}</p></section>;
export default function P() { return (<><PageHead title="Privacy Policy" /><div className="mx-auto max-w-3xl px-6 pb-10"><p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Template text. This is not legal advice and has not been reviewed by a lawyer. The operator must review and complete it (company name, contact details, jurisdiction, data retention) before launch.</p>
  <S t="Data we collect">Account details (name, email, hashed password), workspace content you create (drafts, posts, uploaded media), usage records such as AI generation counts, and audit logs of important actions.</S>
  <S t="Connected social accounts">When you connect Facebook or Instagram we receive access tokens for the Pages and accounts you select. Tokens are stored encrypted and are used only to publish and check status on your behalf.</S>
  <S t="AI processing">Text you submit to AI Studio is sent to Google’s Gemini API to generate suggestions.</S>
  <S t="Sharing">We share data with infrastructure and platform providers needed to operate the service (hosting, object storage, Meta, Google). We do not sell personal data.</S>
  <S t="Your choices">You can disconnect accounts, delete drafts and media, and request deletion of your account by contacting us.</S>
  <S t="Contact">See the Contact page.</S></div></>); }
