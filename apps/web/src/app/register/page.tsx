'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Check, Users, Shield, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain lowercase, uppercase, number, and special character (@$!%*?&)'),
  confirmPassword: z.string(),
  organizationName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await registerUser({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        organizationName: data.organizationName,
      });
      // Redirect to email verification pending page
      router.push(`/verify-email/pending?email=${encodeURIComponent(data.email)}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000211] flex">
      {/* Left Column - Register Form */}
      <div className="w-full lg:w-3/5 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8">
            <Link href="/" className="text-2xl font-semibold">
              <span className="gradient-text">
                OpenMeet
              </span>
            </Link>
          </div>

          <h1 className="heading-l text-white mb-2">Get started free</h1>
          <p className="paragraph-m text-[#cbd5e1] mb-8">Create your account in seconds</p>

          {/* Social Signup */}
          <button
            type="button"
            className="w-full bg-white hover:bg-gray-50 text-gray-800 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 mb-6 transition-colors"
            onClick={() => window.location.href = '/api/auth/google'}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </button>

          <button
            type="button"
            className="w-full bg-[#2F2F2F] hover:bg-[#3F3F3F] text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 mb-6 transition-colors"
            onClick={() => window.location.href = '/api/auth/microsoft'}
          >
            <svg className="h-5 w-5" viewBox="0 0 23 23">
              <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
              <path fill="#f35325" d="M1 1h10v10H1z"/>
              <path fill="#81bc06" d="M12 1h10v10H12z"/>
              <path fill="#05a6f0" d="M1 12h10v10H1z"/>
              <path fill="#ffba08" d="M12 12h10v10H12z"/>
            </svg>
            Sign up with Microsoft
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e293b]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#000211] paragraph-s text-[#94a3b8]">Or sign up with email</span>
            </div>
          </div>

          {/* Register Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block label-m text-[#cbd5e1] mb-2">
                  First name
                </label>
                <input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  {...register('firstName')}
                  disabled={isLoading}
                  className="input-ff"
                />
                {errors.firstName && (
                  <p className="paragraph-s text-red-400 mt-1">{errors.firstName.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block label-m text-[#cbd5e1] mb-2">
                  Last name
                </label>
                <input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  {...register('lastName')}
                  disabled={isLoading}
                  className="input-ff"
                />
                {errors.lastName && (
                  <p className="paragraph-s text-red-400 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

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
              />
              {errors.email && (
                <p className="paragraph-s text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="organizationName" className="block label-m text-[#cbd5e1] mb-2">
                Organization name (optional)
              </label>
              <input
                id="organizationName"
                type="text"
                placeholder="Acme Corp"
                {...register('organizationName')}
                disabled={isLoading}
                className="input-ff"
              />
            </div>

            <div>
              <label htmlFor="password" className="block label-m text-[#cbd5e1] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                {...register('password')}
                disabled={isLoading}
                className="input-ff"
              />
              {errors.password && (
                <p className="paragraph-s text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block label-m text-[#cbd5e1] mb-2">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                {...register('confirmPassword')}
                disabled={isLoading}
                className="input-ff"
              />
              {errors.confirmPassword && (
                <p className="paragraph-s text-red-400 mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start paragraph-s text-[#cbd5e1]">
              <input type="checkbox" className="mr-2 mt-0.5 rounded" required />
              <span>
                By signing up, you agree to our{' '}
                <Link href="/terms" className="text-[#7a5af8] hover:text-[#9945ff]">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-[#7a5af8] hover:text-[#9945ff]">
                  Privacy Policy
                </Link>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </span>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <p className="text-center paragraph-m text-[#94a3b8] mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7a5af8] hover:text-[#9945ff] font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column - Social Proof */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0a0a1a] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 blur-backdrop"></div>
        <div className="relative z-10 max-w-md">
          <h2 className="heading-l text-white mb-8">Join 800,000+ companies</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Users className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Trusted by top teams</h3>
                <p className="paragraph-s text-[#94a3b8]">Used across startups to Fortune 500 companies</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Shield className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Enterprise-grade security</h3>
                <p className="paragraph-s text-[#94a3b8]">SOC 2 Type II, GDPR, and HIPAA compliant</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#7a5af8]/10 flex items-center justify-center flex-shrink-0">
                <Zap className="text-[#7a5af8] w-6 h-6" />
              </div>
              <div>
                <h3 className="paragraph-m text-white font-semibold mb-1">Start in seconds</h3>
                <p className="paragraph-s text-[#94a3b8]">No credit card required, free forever plan</p>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-[#1e293b]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#7a5af8] to-[#9945ff] flex items-center justify-center text-white font-bold">
                TC
              </div>
              <div>
                <p className="paragraph-m text-white font-semibold">Tom Chen</p>
                <p className="paragraph-s text-[#94a3b8]">CEO, TechStartup</p>
              </div>
            </div>
            <p className="paragraph-m text-[#cbd5e1] italic">"OpenMeet saved our team 15 hours per week. The AI summaries are incredibly accurate!"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
