'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import apiClient from '@/lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiClient.forgotPassword(data.email);
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        'Failed to send reset email. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#000211] flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-semibold">
              <span className="gradient-text">
                OpenMeet
              </span>
            </Link>
          </div>

          <div className="bg-[#0a0a1a] border border-[#1e293b] rounded-lg p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="heading-m text-white mb-2">Check your email</h1>
            <p className="paragraph-m text-[#cbd5e1] mb-6">
              We've sent password reset instructions to your email address.
              Please check your inbox and follow the link to reset your password.
            </p>
            <p className="paragraph-s text-[#94a3b8] mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 paragraph-m text-[#7a5af8] hover:text-[#9945ff]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000211] flex items-center justify-center px-8 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8">
          <Link href="/" className="text-2xl font-semibold">
            <span className="gradient-text">
              OpenMeet
            </span>
          </Link>
        </div>

        <h1 className="heading-l text-white mb-2">Forgot your password?</h1>
        <p className="paragraph-m text-[#cbd5e1] mb-8">
          No worries! Enter your email address and we'll send you instructions to reset your password.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block label-m text-[#cbd5e1] mb-2">
              Work email
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@company.com"
              {...register('email')}
              disabled={isLoading}
              className="input-ff"
              autoFocus
            />
            {errors.email && (
              <p className="paragraph-s text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full button-primary"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 paragraph-m text-[#7a5af8] hover:text-[#9945ff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
