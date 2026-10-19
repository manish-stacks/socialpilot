import { Footer, Header } from '@/components/marketing/site';
export default function Marketing({ children }: { children: React.ReactNode }) {
  return (<div className="bg-[#faf7f2] text-stone-900 dark:bg-neutral-950 dark:text-neutral-100"><Header /><main>{children}</main><Footer /></div>);
}
