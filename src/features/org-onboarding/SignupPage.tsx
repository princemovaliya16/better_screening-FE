import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Field, Input, Logo } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/client';
import { signupSchema, type SignupFormValues } from '@/lib/validation/auth.schemas';

export function SignupPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupFormValues>({ resolver: zodResolver(signupSchema) });

  const mutation = useMutation({
    mutationFn: authApi.signup,
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
    <div className="min-h-screen grid place-items-center bg-white px-6 py-10">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="font-extrabold text-[26px] text-ink-900 mt-8">Create your organization</h1>
        <p className="text-[15px] text-ink-500 mt-1.5">
          Set up your hiring workspace in under a minute.
        </p>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          <Field label="Full name" error={errors.fullName?.message}>
            <Input placeholder="Priya Sharma" {...register('fullName')} />
          </Field>
          <Field label="Work email" error={errors.email?.message}>
            <Input type="email" placeholder="you@company.com" {...register('email')} />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <Input type="password" placeholder="At least 8 characters" {...register('password')} />
          </Field>
          <Field label="Organization name" error={errors.organizationName?.message}>
            <Input placeholder="HireAi Technologies" {...register('organizationName')} />
          </Field>
          {errors.root && <p className="text-sm text-rose-500">{errors.root.message}</p>}
          <Button
            type="submit"
            variant="ai"
            size="lg"
            className="w-full"
            loading={mutation.isPending}
          >
            Create organization
          </Button>
        </form>

        <p className="text-sm text-ink-500 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
