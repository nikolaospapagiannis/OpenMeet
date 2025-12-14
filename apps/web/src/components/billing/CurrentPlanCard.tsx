/**
 * CurrentPlanCard Component
 * Displays current subscription plan with features, renewal date, and upgrade options
 */

'use client';

import { useState } from 'react';
import { Check, X, Calendar, CreditCard, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Plan, Subscription } from '@/hooks/useSubscription';

interface CurrentPlanCardProps {
  subscription: Subscription | null;
  currentPlan: Plan | null;
  loading: boolean;
  onUpgrade: () => void;
  onCancel: () => void;
  onResume?: () => void;
}

export function CurrentPlanCard({
  subscription,
  currentPlan,
  loading,
  onUpgrade,
  onCancel,
  onResume,
}: CurrentPlanCardProps) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      await onCancel();
      setShowCancelDialog(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setCancelLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription) return null;

    const statusConfig = {
      active: { color: 'bg-green-500/20 text-green-300 border-green-500/30', label: 'Active' },
      trialing: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', label: 'Trial' },
      canceled: { color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', label: 'Canceled' },
      past_due: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Past Due' },
      unpaid: { color: 'bg-red-500/20 text-red-300 border-red-500/30', label: 'Unpaid' },
    };

    const config = statusConfig[subscription.status as keyof typeof statusConfig] || {
      color: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      label: subscription.status,
    };

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <CardGlass variant="default" className="animate-pulse">
        <div className="h-64 bg-slate-800/30 rounded-xl" />
      </CardGlass>
    );
  }

  const isCanceled = subscription?.status === 'canceled';
  const isFreePlan = currentPlan?.id === 'free';
  const isPlatformOwner = subscription?.isPlatformOwner === true || currentPlan?.id === 'platform-owner';

  return (
    <>
      <CardGlass variant="gradient" className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-purple-500/10 pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-white">
                  {currentPlan?.name || 'No Plan'}
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-slate-400">Your current subscription plan</p>
            </div>
            {!isPlatformOwner && (
              <div className="text-right">
                <div className="text-3xl font-bold text-white">
                  ${currentPlan?.price || 0}
                  <span className="text-lg text-slate-400">/mo</span>
                </div>
                {currentPlan?.priceAnnual && currentPlan.priceAnnual > 0 && (
                  <div className="text-sm text-teal-400 mt-1">
                    ${currentPlan.priceAnnual}/year (save $
                    {currentPlan.price * 12 - currentPlan.priceAnnual})
                  </div>
                )}
              </div>
            )}
            {isPlatformOwner && (
              <Badge className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white border-0 px-3 py-1">
                Owner Access
              </Badge>
            )}
          </div>

          {/* Renewal info */}
          {subscription?.expiresAt && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-slate-800/30 border border-white/5 mb-6">
              <Calendar className="w-5 h-5 text-teal-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-300">
                  {isCanceled ? 'Subscription ends on' : 'Next billing date'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatDate(subscription.expiresAt)}
                </div>
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Plan Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {currentPlan?.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-slate-300"
                >
                  <Check className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Warning for canceled subscription */}
          {isCanceled && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-amber-300">
                  Subscription Canceled
                </div>
                <div className="text-xs text-amber-400/80 mt-1">
                  Your subscription will end on {formatDate(subscription?.expiresAt || null)}.
                  You can still use all features until then.
                </div>
              </div>
            </div>
          )}

          {/* Actions - Hidden for platform owners */}
          {isPlatformOwner ? (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
              <Check className="w-5 h-5 text-teal-400" />
              <span className="text-sm text-teal-300">
                You have full platform access with no billing required.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {!isFreePlan && !isCanceled && (
                <>
                  <Button
                    variant="gradient-primary"
                    size="default"
                    onClick={onUpgrade}
                    className="flex-1 min-w-[200px]"
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  <Button
                    variant="ghost-glass"
                    size="default"
                    onClick={() => setShowCancelDialog(true)}
                    className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Subscription
                  </Button>
                </>
              )}

              {!isFreePlan && isCanceled && onResume && (
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={onResume}
                  className="flex-1 min-w-[200px]"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Resume Subscription
                </Button>
              )}

              {isFreePlan && (
                <Button
                  variant="gradient-primary"
                  size="default"
                  onClick={onUpgrade}
                  className="w-full"
                >
                  <ArrowUpCircle className="w-4 h-4 mr-2" />
                  Upgrade to Pro
                </Button>
              )}
            </div>
          )}
        </div>
      </CardGlass>

      {/* Cancel confirmation dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <CardGlass variant="default" className="max-w-md mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Cancel Subscription?
                </h3>
                <p className="text-sm text-slate-400">
                  Are you sure you want to cancel your subscription? You'll still have access
                  to all features until the end of your billing period on{' '}
                  <span className="font-medium text-white">
                    {formatDate(subscription?.expiresAt || null)}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost-glass"
                size="default"
                onClick={() => setShowCancelDialog(false)}
                disabled={cancelLoading}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                size="default"
                onClick={handleCancel}
                disabled={cancelLoading}
                className="flex-1"
              >
                {cancelLoading ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            </div>
          </CardGlass>
        </div>
      )}
    </>
  );
}
