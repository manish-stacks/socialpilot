import { PageHead } from '@/components/marketing/site';
export const metadata = { title: 'Terms of Service' };
const S = ({ t, children }: { t: string; children: React.ReactNode }) => <section className="mt-6"><h2 className="text-lg font-semibold">{t}</h2><p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{children}</p></section>;
export default function P() { return (<><PageHead title="Terms of Service" /><div className="mx-auto max-w-3xl px-6 pb-10"><p className="mb-6 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">Template text. This is not legal advice and has not been reviewed by a lawyer. The operator must review and complete it (company name, contact details, jurisdiction, data retention) before launch.</p>
  <S t="The service">The service helps you draft, schedule and publish content to social platforms you are authorised to manage.</S>
  <S t="Your responsibilities">You are responsible for your content, for having the rights to publish it, and for complying with each platform’s own terms and policies. AI suggestions may be inaccurate; review before publishing.</S>
  <S t="Platform dependence">Publishing depends on third-party platforms whose APIs, permissions and limits can change or be withdrawn. We do not guarantee that any post will be published.</S>
  <S t="Acceptable use">No unlawful, abusive or spam content, and no attempts to bypass limits or security. Accounts may be suspended for violations.</S>
  <S t="Liability">The service is provided as is, to the extent permitted by law.</S>
  <S t="Changes">We may update these terms; continued use means acceptance.</S></div></>); }
