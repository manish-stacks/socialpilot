import { Faq, PageHead, PlanCards, Section } from '@/components/marketing/site';
export const metadata = { title: 'Pricing' };
export default function P() { return (<><PageHead title="Pricing" sub="Start free. Limits shown here are the limits the app enforces." /><Section title=""><PlanCards /></Section>
  <Section title="Pricing questions"><Faq items={[['Can I upgrade?', 'Paid checkout is not enabled yet. Contact us if you need higher limits.'], ['What counts as an AI generation?', 'Each request to AI Studio (ideas, captions or a rewrite) counts as one.']]} /></Section></>); }
