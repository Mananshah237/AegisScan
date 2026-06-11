import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { ShieldCheck } from 'lucide-react';
import { Card, Button, Input, Field } from '@/components/ui';

const signupSchema = z
  .object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    setError('');
    try {
      await api.post('/users/signup', { email: data.email, password: data.password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent ring-1 ring-accent/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-muted">Start scanning in minutes</p>
        </div>

        <Card className="p-7">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" placeholder="you@example.com" {...register('email')} />
            </Field>
            <Field label="Password" error={errors.password?.message}>
              <Input type="password" placeholder="At least 8 characters" {...register('password')} />
            </Field>
            <Field label="Confirm password" error={errors.confirmPassword?.message}>
              <Input type="password" placeholder="••••••••" {...register('confirmPassword')} />
            </Field>

            {error && (
              <div className="rounded-lg border border-crit/30 bg-crit/10 px-3 py-2 text-sm text-crit">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Sign up
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
