/**
 * Billing Dashboard Page
 * Complete billing management with real Stripe integration
 */

'use client';

import { useState } from 'react';
import { CreditCard, TrendingUp, FileText, Wallet, AlertCircle } from 'lucide-react';
import { CurrentPlanCard } from '@/components/billing/CurrentPlanCard';
import { UsageMetrics } from '@/components/billing/UsageMetrics';
import { PlanComparison } from '@/components/billing/PlanComparison';
import { InvoiceHistory } from '@/components/billing/InvoiceHistory';
import { PaymentMethodForm } from '@/components/billing/PaymentMethodForm';
import { useSubscription } from '@/hooks/useSubscription';
import { CardGlass } from '@/components/ui/card-glass';
import { Tabs } from '@/components/ui/tabs';

type TabValue = 'overview' | 'plans' | 'invoices' | 'payment';

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('overview');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const {
    subscription,
    plans,
    usage,
    invoices,
    paymentMethods,
    loading,
    plansLoading,
    usageLoading,
    invoicesLoading,
    paymentMethodsLoading,
    error,
    changePlan,
    cancelSubscription,
    resumeSubscription,
    addPaymentMethod,
    removePaymentMethod,
    downloadInvoice,
    refreshData,
  } = useSubscription();

  // Get current plan details
  // Platform owners have special unlimited access - no regular plan
  const isPlatformOwner = subscription?.isPlatformOwner === true;
  const currentPlan = isPlatformOwner
    ? {
        id: 'platform-owner',
        name: 'Platform Owner',
        price: 0,
        priceAnnual: 0,
        interval: 'month',
        features: [
          'Unlimited recordings',
          'Unlimited storage',
          'Unlimited AI processing',
          'Unlimited team members',
          'All enterprise features',
          'Admin dashboard access',
          'Full API access',
          'Priority support',
        ],
      }
    : plans.find((p) => p.id === subscription?.tier) || plans[0];

  const handleChangePlan = async (planId: string, interval: 'month' | 'year') => {
    try {
      await changePlan(planId, interval);
      setShowUpgradeModal(false);
      // Show success notification
    } catch (error: any) {
      console.error('Failed to change plan:', error);
      // Show error notification
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription();
      // Show success notification
    } catch (error: any) {
      console.error('Failed to cancel subscription:', error);
      // Show error notification
    }
  };

  const handleResumeSubscription = async () => {
    try {
      await resumeSubscription();
      // Show success notification
    } catch (error: any) {
      console.error('Failed to resume subscription:', error);
      // Show error notification
    }
  };

  const tabs = [
    {
      value: 'overview' as TabValue,
      label: 'Overview',
      icon: Wallet,
    },
    {
      value: 'plans' as TabValue,
      label: 'Plans',
      icon: TrendingUp,
    },
    {
      value: 'invoices' as TabValue,
      label: 'Invoices',
      icon: FileText,
    },
    {
      value: 'payment' as TabValue,
      label: 'Payment Methods',
      icon: CreditCard,
    },
  ];

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Billing & Subscription</h1>
          <p className="text-slate-400">
            Manage your subscription, usage, and payment methods
          </p>
        </div>

        {/* Error alert */}
        {error && (
          <CardGlass
            variant="default"
            className="mb-6 border-red-500/30 bg-red-500/5"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-300 mb-1">
                  Error Loading Billing Data
                </div>
                <div className="text-xs text-red-400/80">{error}</div>
              </div>
              <button
                onClick={refreshData}
                className="text-sm text-red-300 hover:text-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </CardGlass>
        )}

        {/* Tabs */}
        <CardGlass variant="default" className="mb-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.value
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </CardGlass>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Current plan and usage */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CurrentPlanCard
                subscription={subscription}
                currentPlan={currentPlan}
                loading={loading}
                onUpgrade={() => setActiveTab('plans')}
                onCancel={handleCancelSubscription}
                onResume={handleResumeSubscription}
              />
              <UsageMetrics usage={usage} loading={usageLoading} />
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <CardGlass variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Active Plan</div>
                    <div className="text-2xl font-bold text-white">
                      {currentPlan?.name || 'Free'}
                    </div>
                  </div>
                  <Wallet className="w-8 h-8 text-teal-400" />
                </div>
              </CardGlass>

              <CardGlass variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Total Invoices</div>
                    <div className="text-2xl font-bold text-white">
                      {invoices.length}
                    </div>
                  </div>
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
              </CardGlass>

              <CardGlass variant="default" className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-slate-400 mb-1">Payment Methods</div>
                    <div className="text-2xl font-bold text-white">
                      {paymentMethods.length}
                    </div>
                  </div>
                  <CreditCard className="w-8 h-8 text-cyan-400" />
                </div>
              </CardGlass>
            </div>

            {/* Recent invoices preview */}
            <InvoiceHistory
              invoices={invoices.slice(0, 5)}
              loading={invoicesLoading}
              onDownload={downloadInvoice}
            />
          </div>
        )}

        {activeTab === 'plans' && (
          <PlanComparison
            plans={plans}
            currentSubscription={subscription}
            loading={plansLoading}
            onSelectPlan={handleChangePlan}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoiceHistory
            invoices={invoices}
            loading={invoicesLoading}
            onDownload={downloadInvoice}
          />
        )}

        {activeTab === 'payment' && (
          <PaymentMethodForm
            paymentMethods={paymentMethods}
            loading={paymentMethodsLoading}
            onAdd={addPaymentMethod}
            onRemove={removePaymentMethod}
          />
        )}
      </div>
    </div>
  );
}
