'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { Button } from './button';
export function Confirm({ trigger, title, body, action, onConfirm, disabled }: { trigger: string; title: string; body: string; action: string; onConfirm: () => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild><Button variant="outline" size="sm" disabled={disabled}>{trigger}</Button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-lg dark:bg-neutral-900">
          <Dialog.Title className="font-semibold">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-neutral-500">{body}</Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Keep</Button>
            <Button variant="destructive" size="sm" onClick={() => { setOpen(false); onConfirm(); }}>{action}</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
