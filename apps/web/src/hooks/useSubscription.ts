/**
 * useSubscription Hook
 * Manages subscription data, plan changes, and Stripe checkout
 */

import { useState, useEffect, useCallback } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import apiClient from '@/lib/api';

// Only create Stripe promise if key is available
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

export interface Plan {
  id: string;
  name: string;
  price: number;
  priceAnnual?: number;
  interval: string;
  features: string[];
}

export interface Subscription {
  tier: string;
  status: string;
  expiresAt: string | null;
  isActive: boolean;
  isPlatformOwner?: boolean;
  planName?: string;
}

export interface Usage {
  meetingsRecorded: number;
  meetingsLimit: number;
  storageUsedMB: number;
  storageLimitMB: number;
  aiMinutesUsed: number;
  aiMinutesLimit: number;
  periodStart: string;
  periodEnd: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  pdfUrl: string;
  hostedUrl: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

// Default plans to use when API fails or returns empty
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

// Default subscription for free tier
const DEFAULT_SUBSCRIPTION: Subscription = {
  tier: 'free',
  status: 'active',
  expiresAt: null,
  isActive: true,
};

// Default usage data
const DEFAULT_USAGE: Usage = {
  meetingsRecorded: 0,
  meetingsLimit: 5,
  storageUsedMB: 0,
  storageLimitMB: 500,
  aiMinutesUsed: 0,
  aiMinutesLimit: 60,
  periodStart: new Date().toISOString(),
  periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

interface UseSubscriptionReturn {
  // Data
  subscription: Subscription | null;
  plans: Plan[];
  usage: Usage | null;
  invoices: Invoice[];
  paymentMethods: PaymentMethod[];

  // Loading states
  loading: boolean;
  plansLoading: boolean;
  usageLoading: boolean;
  invoicesLoading: boolean;
  paymentMethodsLoading: boolean;

  // Error states
  error: string | null;

  // Actions
  changePlan: (planId: string, interval?: 'month' | 'year') => Promise<void>;
  cancelSubscription: () => Promise<void>;
  resumeSubscription: () => Promise<void>;
  addPaymentMethod: (paymentMethodId: string) => Promise<void>;
  removePaymentMethod: (paymentMethodId: string) => Promise<void>;
  downloadInvoice: (invoiceId: string) => void;
  refreshData: () => Promise<void>;

  // Stripe
  stripe: Stripe | null;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);

  // Initialize Stripe
  useEffect(() => {
    if (stripePromise) {
      stripePromise.then(setStripe).catch((err) => {
        console.error('Failed to initialize Stripe:', err);
        setStripe(null);
      });
    } else {
      console.warn('Stripe publishable key not available');
      setStripe(null);
    }
  }, []);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSubscription();

      // Map billing service response to frontend Subscription interface
      // Billing service returns: { subscription: {...}, tier: "...", plan: {...}, isPlatformOwner: bool }
      const mappedSubscription: Subscription = {
        tier: data.tier || data.subscription?.tier || 'free',
        status: data.subscription?.status || 'active',
        expiresAt: data.subscription?.currentPeriodEnd || null,
        isActive: data.subscription?.status === 'active' || data.subscription?.status === 'trialing',
        // Extended fields for platform owner
        isPlatformOwner: data.isPlatformOwner || false,
        planName: data.plan?.nickname || data.tier || 'Free',
      };

      setSubscription(mappedSubscription);
    } catch (err: any) {
      // Use default subscription on error instead of blocking UI
      setSubscription(DEFAULT_SUBSCRIPTION);
      setError(err.response?.data?.error || 'Failed to fetch subscription');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    try {
      setPlansLoading(true);
      const response = await apiClient.get('/billing/plans');
      const fetchedPlans = response.data || [];
      // Use default plans if API returns empty
      setPlans(fetchedPlans.length > 0 ? fetchedPlans : DEFAULT_PLANS);
    } catch (err: any) {
      // Use default plans on error
      setPlans(DEFAULT_PLANS);
      console.error('Error fetching plans:', err);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Fetch usage data
  const fetchUsage = useCallback(async () => {
    try {
      setUsageLoading(true);
      const data = await apiClient.getUsage();

      // Map response - billing service returns { usage: {...}, unlimited: bool, isPlatformOwner: bool }
      if (data.usage) {
        // Handle unlimited (-1) values for platform owners
        const usage: Usage = {
          meetingsRecorded: data.usage.meetingsRecorded || 0,
          meetingsLimit: data.usage.meetingsLimit === -1 ? Infinity : (data.usage.meetingsLimit || 5),
          storageUsedMB: data.usage.storageUsedMB || 0,
          storageLimitMB: data.usage.storageLimitMB === -1 ? Infinity : (data.usage.storageLimitMB || 500),
          aiMinutesUsed: data.usage.aiMinutesUsed || 0,
          aiMinutesLimit: data.usage.aiMinutesLimit === -1 ? Infinity : (data.usage.aiMinutesLimit || 60),
          periodStart: data.usage.periodStart || new Date().toISOString(),
          periodEnd: data.usage.periodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
        setUsage(usage);
      } else {
        setUsage(DEFAULT_USAGE);
      }
    } catch (err: any) {
      // Use default usage on error
      setUsage(DEFAULT_USAGE);
      console.error('Error fetching usage:', err);
    } finally {
      setUsageLoading(false);
    }
  }, []);

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setInvoicesLoading(true);
      const response = await apiClient.getInvoices();
      setInvoices(response.data || []);
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      setPaymentMethodsLoading(true);
      const response = await apiClient.get('/billing/payment-methods');
      setPaymentMethods(response.data || []);
    } catch (err: any) {
      console.error('Error fetching payment methods:', err);
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, []);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchSubscription(),
      fetchPlans(),
      fetchUsage(),
      fetchInvoices(),
      fetchPaymentMethods(),
    ]);
  }, [fetchSubscription, fetchPlans, fetchUsage, fetchInvoices, fetchPaymentMethods]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, []);

  // Change plan (upgrade/downgrade)
  const changePlan = useCallback(async (planId: string, interval: 'month' | 'year' = 'month') => {
    try {
      setError(null);

      // Create subscription or checkout session
      await apiClient.post('/billing/subscription', {
        tier: planId,
        interval,
      });

      // Refresh subscription data
      await fetchSubscription();
      await fetchUsage();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to change plan';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchSubscription, fetchUsage]);

  // Cancel subscription
  const cancelSubscription = useCallback(async () => {
    try {
      setError(null);
      await apiClient.post('/billing/subscription/cancel');
      await fetchSubscription();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to cancel subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchSubscription]);

  // Resume subscription
  const resumeSubscription = useCallback(async () => {
    try {
      setError(null);
      await apiClient.post('/billing/subscription/resume');
      await fetchSubscription();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to resume subscription';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchSubscription]);

  // Add payment method
  const addPaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setError(null);
      await apiClient.post('/billing/payment-methods', { paymentMethodId });
      await fetchPaymentMethods();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to add payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchPaymentMethods]);

  // Remove payment method
  const removePaymentMethod = useCallback(async (paymentMethodId: string) => {
    try {
      setError(null);
      await apiClient.delete(`/billing/payment-methods/${paymentMethodId}`);
      await fetchPaymentMethods();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to remove payment method';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [fetchPaymentMethods]);

  // Download invoice
  const downloadInvoice = useCallback((invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice?.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    } else if (invoice?.hostedUrl) {
      window.open(invoice.hostedUrl, '_blank');
    }
  }, [invoices]);

  return {
    // Data
    subscription,
    plans,
    usage,
    invoices,
    paymentMethods,

    // Loading states
    loading,
    plansLoading,
    usageLoading,
    invoicesLoading,
    paymentMethodsLoading,

    // Error
    error,

    // Actions
    changePlan,
    cancelSubscription,
    resumeSubscription,
    addPaymentMethod,
    removePaymentMethod,
    downloadInvoice,
    refreshData,

    // Stripe
    stripe,
  };
}
