/**
 * PaymentMethodForm Component
 * Stripe Elements integration for adding/updating payment methods with SCA support
 */

'use client';

import { useState, FormEvent } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { CreditCard, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { CardGlass } from '@/components/ui/card-glass';
import { Button } from '@/components/ui/button-v2';
import { Badge } from '@/components/ui/badge';
import { PaymentMethod } from '@/hooks/useSubscription';

// Only create Stripe promise if key is available
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface PaymentMethodFormProps {
  paymentMethods: PaymentMethod[];
  loading: boolean;
  onAdd: (paymentMethodId: string) => Promise<void>;
  onRemove: (paymentMethodId: string) => Promise<void>;
}

// Stripe Elements custom styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      fontSmoothing: 'antialiased',
      lineHeight: '24px',
      '::placeholder': {
        color: '#94a3b8',
      },
      iconColor: '#94a3b8',
    },
    invalid: {
      color: '#f87171',
      iconColor: '#f87171',
    },
    complete: {
      color: '#2dd4bf',
      iconColor: '#2dd4bf',
    },
  },
  hidePostalCode: false,
};

function PaymentForm({ onAdd, onSuccess }: {
  onAdd: (paymentMethodId: string) => Promise<void>;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Create payment method with Stripe
      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message || 'Failed to create payment method');
        setProcessing(false);
        return;
      }

      if (!paymentMethod) {
        setError('Failed to create payment method');
        setProcessing(false);
        return;
      }

      // Add payment method to backend
      await onAdd(paymentMethod.id);

      // Success
      setSuccess(true);
      cardElement.clear();

      // Reset form after 2 seconds
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Card input */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Card Details
        </label>
        <div className="px-4 py-4 rounded-xl bg-slate-800/60 border border-white/10 focus-within:ring-2 focus-within:ring-teal-500/50 focus-within:border-teal-500/50 transition-all min-h-[52px]">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Your payment information is securely processed by Stripe. We never store your
          card details.
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-300">{error}</div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-300">Payment method added successfully!</div>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        variant="gradient-primary"
        size="default"
        disabled={!stripe || processing || success}
        className="w-full"
      >
        <CreditCard className="w-4 h-4 mr-2" />
        {processing ? 'Processing...' : success ? 'Added!' : 'Add Payment Method'}
      </Button>
    </form>
  );
}

function PaymentMethodCard({
  paymentMethod,
  onRemove,
}: {
  paymentMethod: PaymentMethod;
  onRemove: (id: string) => void;
}) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await onRemove(paymentMethod.id);
    } catch (error) {
      console.error('Error removing payment method:', error);
    } finally {
      setRemoving(false);
    }
  };

  const getBrandIcon = (brand: string) => {
    // You could use actual brand logos here
    return brand.toUpperCase();
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 border border-white/10 hover:bg-slate-800/50 hover:border-white/20 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-12 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10">
          <span className="text-xs font-bold text-white">
            {paymentMethod.card ? getBrandIcon(paymentMethod.card.brand) : 'CARD'}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              •••• {paymentMethod.card?.last4 || '****'}
            </span>
            {paymentMethod.isDefault && (
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">
                Default
              </Badge>
            )}
          </div>
          {paymentMethod.card && (
            <div className="text-xs text-slate-500 mt-0.5">
              Expires {paymentMethod.card.expMonth}/{paymentMethod.card.expYear}
            </div>
          )}
        </div>
      </div>
      <Button
        variant="ghost-glass"
        size="sm"
        onClick={handleRemove}
        disabled={removing || paymentMethod.isDefault}
        className="text-red-300 hover:bg-red-500/10"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export function PaymentMethodForm({
  paymentMethods,
  loading,
  onAdd,
  onRemove,
}: PaymentMethodFormProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  if (loading) {
    return (
      <CardGlass variant="default" className="animate-pulse">
        <div className="h-64 bg-slate-800/30 rounded-xl" />
      </CardGlass>
    );
  }

  return (
    <CardGlass variant="default">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Payment Methods</h2>
          <p className="text-sm text-slate-400">
            Manage your payment methods securely
          </p>
        </div>
        <CreditCard className="w-6 h-6 text-teal-400" />
      </div>

      {/* Existing payment methods */}
      {paymentMethods.length > 0 && (
        <div className="space-y-3 mb-6">
          {paymentMethods.map((pm) => (
            <PaymentMethodCard
              key={pm.id}
              paymentMethod={pm}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      {/* Add new payment method */}
      {!showAddForm ? (
        <Button
          variant="outline-glass"
          size="default"
          onClick={() => setShowAddForm(true)}
          className="w-full"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Add Payment Method
        </Button>
      ) : (
        <div className="p-4 rounded-xl bg-slate-800/30 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Add New Card</h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <PaymentForm
                onAdd={onAdd}
                onSuccess={() => setShowAddForm(false)}
              />
            </Elements>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-300 mb-1">
                    Payment Processing Unavailable
                  </div>
                  <div className="text-xs text-amber-400/80">
                    Stripe payment processing is not configured. Please contact support
                    to set up billing or try again later.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Security notice */}
      <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-300 mb-1">
              Secure Payment Processing
            </div>
            <div className="text-xs text-blue-400/80">
              All transactions are encrypted and processed securely through Stripe.
              We are PCI DSS compliant and never store your card details on our servers.
            </div>
          </div>
        </div>
      </div>
    </CardGlass>
  );
}
