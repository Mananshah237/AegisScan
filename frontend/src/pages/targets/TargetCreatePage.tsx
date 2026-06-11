import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { ArrowLeft } from 'lucide-react';
import { Card, Button, Input, Field, PageHeader } from '@/components/ui';

const targetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  base_url: z.string().url('Must be a valid URL (http/https)'),
});

type TargetForm = z.infer<typeof targetSchema>;

export default function TargetCreatePage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TargetForm>({ resolver: zodResolver(targetSchema) });

  const onSubmit = async (data: TargetForm) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/targets/', data);
      navigate('/targets');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(', '));
      else setError(detail || 'Failed to create target');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/targets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Targets
      </Link>

      <PageHeader title="Add New Target" subtitle="Define a web application to scan." />

      <Card className="p-6">
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <Field label="Target Name" error={errors.name?.message}>
            <Input placeholder="e.g. Production Web App" {...register('name')} />
          </Field>
          <Field
            label="Base URL"
            error={errors.base_url?.message}
            hint="Must be reachable by the scanner (no localhost or private IPs)."
          >
            <Input type="url" placeholder="https://example.com" {...register('base_url')} />
          </Field>

          {error && (
            <div className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/targets')}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save Target
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
