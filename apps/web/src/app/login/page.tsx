'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000211] flex">
      {/* Left Column - Login Form */}
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

          <h1 className="heading-l text-white mb-2">Welcome back</h1>
          <p className="paragraph-m text-[#cbd5e1] mb-8">Sign in to your account to continue</p>

          {/* Social Login */}
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
            Sign in with Google
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
            Sign in with Microsoft
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e293b]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[#000211] paragraph-s text-[#94a3b8]">Or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
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
              />
              {errors.email && (
                <p className="paragraph-s text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block label-m text-[#cbd5e1] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                {...register('password')}
                disabled={isLoading}
                className="input-ff"
              />
              {errors.password && (
                <p className="paragraph-s text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center paragraph-s text-[#cbd5e1]">
                <input type="checkbox" className="mr-2 rounded" />
                Remember me
              </label>
              <Link href="/forgot-password" className="paragraph-s text-[#7a5af8] hover:text-[#9945ff]">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full button-primary"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center paragraph-m text-[#94a3b8] mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-[#7a5af8] hover:text-[#9945ff] font-semibold">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      {/* Right Column - Testimonial */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#0a0a1a] items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 blur-backdrop"></div>
        <div className="relative z-10 max-w-md">
          <div className="flex mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star key={i} size={20} className="fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          <blockquote className="heading-m text-white font-normal italic mb-6">
            "OpenMeet has completely transformed how we handle meetings. The AI summaries are incredibly accurate, and we save hours every week."
          </blockquote>
          <div>
            <p className="paragraph-m text-white font-semibold">Sarah Chen</p>
            <p className="paragraph-s text-[#94a3b8]">VP of Sales, TechCorp</p>
          </div>
        </div>
      </div>
    </div>
  );
}
