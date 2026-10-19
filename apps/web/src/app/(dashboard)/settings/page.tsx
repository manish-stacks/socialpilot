'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Globe, Save, Settings as SettingsIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/lib/app-context';
import { workspaceSchema } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/form';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ZONES: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? ['UTC'];

export default function WorkspaceSettingsPage() {
  const { workspace } = useApp();
  const qc = useQueryClient();
  const canEdit = workspace?.role === 'OWNER' || workspace?.role === 'ADMIN';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ name: string; timezone: string }>({
    resolver: zodResolver(workspaceSchema),
    values: workspace ? { name: workspace.name, timezone: workspace.timezone } : undefined,
  });

  const save = useMutation({
    mutationFn: (v: object) =>
      api(`/workspaces/${workspace!.id}`, { method: 'PATCH', body: JSON.stringify(v) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace settings updated');
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!workspace) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Configure branding, target timezone, and publishing clock for {workspace.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>General Properties</CardTitle>
            <CardDescription>Workspace profile and scheduling localization</CardDescription>
          </div>
          <SettingsIcon className="h-4 w-4 text-slate-400" />
        </CardHeader>

        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 pt-2">
          <div>
            <Label>Workspace Name</Label>
            <Input disabled={!canEdit} {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Scheduling Timezone</Label>
            <Select disabled={!canEdit} {...register('timezone')}>
              {ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-400">
              Posts and calendar previews will align with this localized timezone.
            </p>
          </div>

          <div className="pt-2">
            {canEdit ? (
              <Button variant="brand" disabled={save.isPending}>
                <Save className="h-4 w-4" />
                <span>{save.isPending ? 'Saving…' : 'Save Changes'}</span>
              </Button>
            ) : (
              <p className="text-xs text-slate-400">
                Only workspace Owners and Admins have permission to modify settings.
              </p>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
