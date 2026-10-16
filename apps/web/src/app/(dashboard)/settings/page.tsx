'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { workspaceSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { Card } from '@/components/ui/card';

const ZONES: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? ['UTC'];

export default function Settings() {
  const { workspace } = useApp();
  const qc = useQueryClient();
  const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; timezone: string }>({
    resolver: zodResolver(workspaceSchema), values: workspace ? { name: workspace.name, timezone: workspace.timezone } : undefined,
  });
  const save = useMutation({
    mutationFn: (v: object) => api(`/workspaces/${workspace!.id}`, { method: 'PATCH', body: JSON.stringify(v) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }); toast.success('Workspace updated'); },
    onError: (e) => toast.error((e as Error).message),
  });
  if (!workspace) return null;
  return (
    <div className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Workspace settings</h1>
      <Card>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4">
          <div><Label>Name</Label><Input disabled={!canEdit} {...register('name')} /><p className="text-xs text-red-600">{errors.name?.message}</p></div>
          <div><Label>Timezone (used for scheduling and the calendar)</Label>
            <Select disabled={!canEdit} {...register('timezone')}>{ZONES.map((z) => <option key={z}>{z}</option>)}</Select></div>
          {canEdit ? <Button disabled={save.isPending}>Save changes</Button> : <p className="text-xs text-neutral-500">Only owners and admins can edit workspace settings.</p>}
        </form>
      </Card>
    </div>
  );
}
