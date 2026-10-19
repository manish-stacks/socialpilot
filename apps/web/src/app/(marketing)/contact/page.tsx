'use client';
import { useState } from 'react';
import { PageHead, SUPPORT } from '@/components/marketing/site';

/** No server-side mail service exists, so this opens the visitor's own email app addressed to the configured support address. */
export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const ok = f.name.trim() && /^\S+@\S+\.\S+$/.test(f.email) && f.message.trim().length >= 10;
  const send = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:${SUPPORT}?subject=${encodeURIComponent(`Message from ${f.name}`)}&body=${encodeURIComponent(`${f.message}\n\n— ${f.name} (${f.email})`)}`;
  };
  return (<><PageHead title="Contact us" sub="Questions, feedback or support requests." />
    <div className="mx-auto max-w-xl px-6 pb-10">
      {!SUPPORT ? <div className="card text-sm text-neutral-600">Contact details haven’t been configured yet. The site owner should set <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> in apps/web/.env.local.</div> : (
        <form onSubmit={send} className="card space-y-4">
          <div><label className="mb-1 block text-xs font-medium">Name</label><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium">Email</label><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
          <div><label className="mb-1 block text-xs font-medium">Message (at least 10 characters)</label><textarea className="input min-h-[120px]" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
          <button className="btn w-full" disabled={!ok}>Open in my email app</button>
          <p className="text-xs text-neutral-500">This opens your email app with the message ready to send to {SUPPORT}.</p>
        </form>)}
    </div></>);
}
