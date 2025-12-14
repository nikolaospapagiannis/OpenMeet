'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingSurvey } from '@/components/onboarding/OnboardingSurvey';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function OnboardingPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    // In a real app, this would check the auth state
    // For now, we'll just set a small delay to simulate the check
    const checkAuth = async () => {
      try {
        // Simulating auth check - in production, check actual auth state
        // const response = await fetch('/api/auth/session');
        // if (!response.ok) {
        //   router.push('/login');
        //   return;
        // }

        setIsChecking(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Uncomment in production:
        // router.push('/login');
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#000211] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return <OnboardingSurvey />;
}
