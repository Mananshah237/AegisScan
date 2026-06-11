import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck, Zap, Lock, Activity } from 'lucide-react';
import { Button, Input, Field } from '@/components/ui';

const loginSchema = z.object({
  username: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

const features = [
  { icon: Zap, title: 'Automated DAST', text: 'Orchestrated OWASP ZAP scans on demand.' },
  { icon: Activity, title: 'Risk scoring', text: 'Every finding scored, deduplicated, tracked.' },
  { icon: Lock, title: 'Self-hosted', text: 'Your targets and data never leave your infra.' },
];

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('username', data.username);
      params.append('password', data.password);
      const response = await api.post('/auth/access-token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      login(response.data.access_token, response.data.refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line-soft p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#04141f] shadow-lg shadow-sky-500/30">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">AegisScan</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-gradient">
            Ship secure web apps, without the SaaS bill.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            A self-hosted dynamic application security testing console — authenticated
            scanning, risk-scored findings, and reports, all on your own infrastructure.
          </p>
          <div className="mt-9 space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-surface-2/70 p-2 text-accent ring-1 ring-inset ring-line">
                  <f.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-fg">{f.title}</p>
                  <p className="text-xs text-muted">{f.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-faint">Powered by OWASP ZAP · FastAPI · React</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#04141f]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">AegisScan</h1>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-fg">Welcome back</h1>
          <p className="mt-1 mb-7 text-sm text-muted">Sign in to your security console.</p>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Email" error={errors.username?.message}>
              <Input type="email" placeholder="you@example.com" autoFocus {...register('username')} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" placeholder="••••••••" {...register('password')} />
            </Field>

            {error && (
              <div className="rounded-xl border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>Sign in</Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            No account?{' '}
            <Link to="/signup" className="font-semibold text-accent hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
