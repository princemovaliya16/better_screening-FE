import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Logo } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth.api';
import { loginSchema, type LoginFormValues } from '@/lib/validation/auth.schemas';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token, user }) => {
      signIn(token, user);
      navigate('/app/dashboard');
    },
    onError: (err) => {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      });
    },
  });

  return (
    <div className="min-h-screen grid place-items-center bg-white px-6">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="font-extrabold text-[26px] text-ink-900 mt-8">Sign in</h1>
        <p className="text-[15px] text-ink-500 mt-1.5">Welcome back to Better Screening.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <Field label="Work email" error={errors.email?.message}>
            <Input type="email" placeholder="you@company.com" {...register('email')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" placeholder="••••••••" {...register('password')} />
          </Field>
          {errors.root && <p className="text-sm text-rose-500">{errors.root.message}</p>}
          <Button
            type="submit"
            variant="ai"
            size="lg"
            className="w-full"
            loading={mutation.isPending}
          >
            Sign in
          </Button>
        </form>

        <p className="text-sm text-ink-500 mt-6 text-center">
          Don't have an account?{' '}
          <Link to="/signup" className="text-brand-600 font-medium hover:text-brand-700">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
