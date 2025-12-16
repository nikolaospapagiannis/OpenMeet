/**
 * PlanComparison Component
 * Side-by-side comparison of subscription plans with features and pricing
 */

'use client';

import { useState } from 'react';
import { Check, Sparkles, Star, Crown, Zap } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Plan, Subscription } from '@/hooks/useSubscription';

interface PlanComparisonProps {
  plans: Plan[];
  currentSubscription: Subscription | null;
  loading: boolean;
  onSelectPlan: (planId: string, interval: 'month' | 'year') => void;
}

// Default plans to show when API fails or returns empty
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    priceAnnual: 0,
    interval: 'month',
    features: [
      '5 meeting recordings/month',
      'Basic transcription',
      '500MB storage',
      'Email support',
      '7-day transcript history',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 15,
    priceAnnual: 144,
    interval: 'month',
    features: [
      'Unlimited recordings',
      'AI-powered transcription',
      '10GB storage',
      'Priority support',
      'Action items extraction',
      'Meeting insights',
      'Team sharing (up to 5)',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 39,
    priceAnnual: 374,
    interval: 'month',
    features: [
      'Everything in Pro',
      '100GB storage',
      'Unlimited team members',
      'Admin dashboard',
      'SSO integration',
      'API access',
      'Custom integrations',
      'Advanced analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    priceAnnual: 950,
    interval: 'month',
    features: [
      'Everything in Business',
      'Unlimited storage',
      'Dedicated account manager',
      'Custom AI training',
      'On-premise deployment',
      'SLA guarantees',
      'Audit logs',
      'HIPAA compliance',
    ],
  },
];

export function PlanComparison({
  plans,
  currentSubscription,
  loading,
  onSelectPlan,
}: PlanComparisonProps) {
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('month');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Use default plans when API returns empty
  const displayPlans = plans.length > 0 ? plans : DEFAULT_PLANS;

  const getPlanIcon = (planId: string) => {
    const icons = {
      free: Zap,
      pro: Sparkles,
      business: Star,
      enterprise: Crown,
    };
    return icons[planId as keyof typeof icons] || Sparkles;
  };

  const getPlanColor = (planId: string) => {
    const colors = {
      free: 'from-slate-500 to-slate-600',
      pro: 'from-teal-500 to-cyan-600',
      business: 'from-purple-500 to-pink-600',
      enterprise: 'from-amber-500 to-orange-600',
    };
    return colors[planId as keyof typeof colors] || 'from-teal-500 to-cyan-600';
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.tier === planId;
  };

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'free' || isCurrentPlan(planId)) return;

    setSelectedPlan(planId);
    try {
      await onSelectPlan(planId, billingInterval);
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setSelectedPlan(null);
    }
  };

  const calculateAnnualSavings = (plan: Plan) => {
    if (!plan.priceAnnual) return 0;
    return plan.price * 12 - plan.priceAnnual;
  };

  if (loading) {
    return (
      <CardGlass variant="default" className="animate-pulse">
        <div className="h-96 bg-slate-800/30 rounded-xl" />
      </CardGlass>
    );
  }

  return (
    <CardGlass variant="default">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-slate-400 mb-6">
          Select the perfect plan for your needs. Upgrade or downgrade anytime.
        </p>

        {/* Billing interval toggle */}
        <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-slate-800/50 border border-white/10">
          <button
            onClick={() => setBillingInterval('month')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              billingInterval === 'month'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval('year')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all relative ${
              billingInterval === 'year'
                ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Annual
            <Badge className="absolute -top-2 -right-2 bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
              Save 20%
            </Badge>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {displayPlans.map((plan) => {
          const Icon = getPlanIcon(plan.id);
          const isPopular = plan.id === 'pro';
          const isCurrent = isCurrentPlan(plan.id);
          const price =
            billingInterval === 'year' && plan.priceAnnual
              ? plan.priceAnnual / 12
              : plan.price;
          const annualSavings = calculateAnnualSavings(plan);

          return (
            <div key={plan.id} className="relative">
              {/* Popular badge */}
              {isPopular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center z-10">
                  <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-0 shadow-lg">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardGlass
                variant={isPopular ? 'gradient' : 'default'}
                className={`h-full flex flex-col ${
                  isPopular ? 'border-teal-500/30 shadow-lg shadow-teal-500/20' : ''
                } ${isCurrent ? 'ring-2 ring-teal-500/50' : ''}`}
              >
                {/* Plan header */}
                <div className="text-center mb-6">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${getPlanColor(
                      plan.id
                    )} flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-white">
                      ${price.toFixed(0)}
                    </span>
                    <span className="text-slate-400">/mo</span>
                  </div>
                  {billingInterval === 'year' && annualSavings > 0 && (
                    <div className="text-sm text-teal-400">
                      Save ${annualSavings}/year
                    </div>
                  )}
                  {isCurrent && (
                    <Badge className="mt-2 bg-teal-500/20 text-teal-300 border-teal-500/30">
                      Current Plan
                    </Badge>
                  )}
                </div>

                {/* Features */}
                <div className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <Button
                  variant={isPopular ? 'gradient-primary' : 'outline'}
                  size="default"
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={plan.id === 'free' || isCurrent || selectedPlan === plan.id}
                  className="w-full"
                >
                  {selectedPlan === plan.id
                    ? 'Processing...'
                    : isCurrent
                    ? 'Current Plan'
                    : plan.id === 'free'
                    ? 'Free Forever'
                    : plan.id === 'enterprise'
                    ? 'Contact Sales'
                    : 'Select Plan'}
                </Button>

                {plan.id === 'enterprise' && (
                  <p className="text-xs text-center text-slate-400 mt-3">
                    Custom pricing available
                  </p>
                )}
              </CardGlass>
            </div>
          );
        })}
      </div>

      {/* Additional info */}
      <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <Star className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-300 mb-1">
              Flexible Billing
            </div>
            <div className="text-xs text-blue-400/80">
              All plans include a 14-day free trial. Cancel anytime with no fees.
              Upgrade or downgrade instantly with automatic proration.
            </div>
          </div>
        </div>
      </div>
    </CardGlass>
  );
}
