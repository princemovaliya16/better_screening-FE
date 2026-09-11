import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, Input, Logo } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/client';
import { acceptInviteSchema, type AcceptInviteFormValues } from '@/lib/validation/auth.schemas';

export function AcceptInvitePage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<AcceptInviteFormValues>({ resolver: zodResolver(acceptInviteSchema) });

  const mutation = useMutation({
    mutationFn: (values: AcceptInviteFormValues) => authApi.acceptInvite({ token, ...values }),
    onSuccess: ({ token: authToken, user }) => {
      signIn(authToken, user);
      navigate('/app/dashboard');
    },
    onError: (err) => {
      setError('root', {
        message: err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      });
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-white px-6 py-10">
        <div className="w-full max-w-sm text-center">
          <Logo />
          <p className="text-[15px] text-ink-500 mt-6">
            This invite link is missing its token — ask whoever invited you to resend it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="font-extrabold text-[26px] text-ink-900 mt-8">Join your team</h1>
        <p className="text-[15px] text-ink-500 mt-1.5">Set your name and password to get started.</p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <Field label="Full name" error={errors.fullName?.message}>
            <Input placeholder="Priya Sharma" {...register('fullName')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" placeholder="At least 8 characters" {...register('password')} />
          </Field>
          {errors.root && <p className="text-sm text-rose-500">{errors.root.message}</p>}
          <Button type="submit" variant="ai" size="lg" className="w-full" loading={mutation.isPending}>
            Join team
          </Button>
        </form>
      </div>
    </div>
  );
}
