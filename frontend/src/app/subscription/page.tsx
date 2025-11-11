"use client"

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '../navbar/page';

type PlanId = 'FREE' | 'STANDARD' | 'CREATOR';

interface User {
  id: number;
  email: string;
  name: string;
}

interface SubscriptionDto {
  id: string;
  user_email: string;
  plan_id: 'free' | 'standard' | 'creator';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
}

interface UsageHistoryItem {
  id: string;
  user_email: string;
  date: string;
  contracts_created: number;
  created_at: string;
  updated_at: string;
}

interface UsageCheck {
  canCreate: boolean;
  used: number;
  limit: number | 'unlimited';
  planId: string;
}

const PLANS: Array<{
  id: PlanId;
  name: string;
  priceDisplay: string;
  priceAmount: number;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: 'FREE',
    name: 'Free',
    priceDisplay: '$0',
    priceAmount: 0,
    features: [
      'Access to 1 free contract template',
      'Basic contract customization',
      'Community support',
      'Read-only marketplace access',
    ],
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    priceDisplay: '$29',
    priceAmount: 29,
    features: [
      'Up to 10 contracts per day',
      'Access to all marketplace templates',
      'Advanced customization tools',
      'Multi-party signature support',
      'Priority email support',
      'Blockchain verification',
      'Version history tracking',
    ],
    highlight: true,
  },
  {
    id: 'CREATOR',
    name: 'Creator',
    priceDisplay: '$99',
    priceAmount: 99,
    features: [
      'Unlimited contract usage',
      'Create & submit custom templates',
      'Sell templates on marketplace',
      '70% revenue share on sales',
      'Featured creator badge',
      'Analytics dashboard',
      '24/7 priority support',
      'Early access to new features',
      'Custom branding options',
    ],
  },
];

function titleCasePlan(p?: string) {
  if (!p) return '';
  const m = p.toLowerCase();
  if (m === 'free') return 'Free';
  if (m === 'standard') return 'Standard';
  if (m === 'creator') return 'Creator';
  return p;
}

export default function Subscription() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [usage, setUsage] = useState<UsageCheck | null>(null);
  const [history, setHistory] = useState<UsageHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState<PlanId | null>(null);
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000', []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data);
      } catch {
        router.push('/login');
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user?.email) return;
      setLoadingData(true);
      try {
        const subRes = await fetch(
          `${apiBase}/api/subscriptions/user/${encodeURIComponent(user.email)}`
        );
        const subJson = await subRes.json();
        setSubscription(subJson?.data ?? null);

        const checkRes = await fetch(`${apiBase}/api/subscriptions/usage/check`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userEmail: user.email }),
        });
        const checkJson = await checkRes.json();
        setUsage(checkJson?.data ?? null);

        const histRes = await fetch(
          `${apiBase}/api/subscriptions/usage/history/${encodeURIComponent(
            user.email,
          )}?days=30`,
        );
        const histJson = await histRes.json();
        setHistory(histJson?.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingData(false);
      }
    };
    loadData();
  }, [apiBase, user?.email]);

  const handleChoosePlan = useCallback(
    async (plan: PlanId) => {
      if (!user) return;
      setIsSubmitting(plan);
      try {
        if (plan === 'FREE') {
          await fetch(`${apiBase}/api/subscriptions/user/${encodeURIComponent(user.email)}`);
          await fetch(`${apiBase}/api/subscriptions/user/${encodeURIComponent(user.email)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId: 'FREE', status: 'active' }),
          });
          router.push('/success');
          return;
        }

        const res = await fetch(`${apiBase}/api/subscriptions/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: user.email,
            planId: plan,
            successUrl: `${window.location.origin}//success`,
            cancelUrl: `${window.location.origin}//cancel`,
          }),
        });
        if (!res.ok) throw new Error('Failed to start checkout');
        const data = await res.json();
        const checkoutUrl = data?.data?.checkoutUrl;
        if (!checkoutUrl) throw new Error('No checkout URL returned');
        window.location.href = checkoutUrl;
      } catch (e) {
        console.error(e);
        alert('Payment setup failed. Please try again.');
      } finally {
        setIsSubmitting(null);
      }
    },
    [apiBase, router, user],
  );

  const renderSubscriptionSummary = () => {
    if (loadingData) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
        </div>
      );
    }
    if (!subscription) return null;

    const periodStart = subscription.current_period_start
      ? new Date(subscription.current_period_start).toLocaleDateString()
      : '-';
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end).toLocaleDateString()
      : '-';

    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-800 p-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Your Subscription</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div className="bg-black/20 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Plan</p>
            <p className="text-lg font-semibold">{titleCasePlan(subscription.plan_id)}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Status</p>
            <p className="text-lg font-semibold capitalize">{subscription.status}</p>
          </div>
          <div className="bg-black/20 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm">Current Period</p>
            <p className="text-lg font-semibold">
              {periodStart} → {periodEnd}
            </p>
          </div>
        </div>

        {usage && (
          <div className="mt-6 bg-black/20 rounded-lg p-4 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Today&apos;s Usage</p>
            <p className="text-white">
              {usage.used} / {usage.limit === 'unlimited' ? '∞' : usage.limit} contracts
              {usage.canCreate ? ' (can create more)' : ' (limit reached)'}
            </p>
          </div>
        )}

        {history && history.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2">Usage last 30 days</p>
            <div className="max-h-56 overflow-auto rounded-lg border border-gray-800">
              <table className="w-full text-left text-gray-300">
                <thead className="bg-black/30 text-gray-400 text-sm sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Date</th>
                    <th className="px-4 py-2">Contracts Created</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-gray-800">
                      <td className="px-4 py-2">{new Date(h.date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{h.contracts_created}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPlanCards = () => {
    const currentPlanId = subscription?.plan_id?.toUpperCase() as PlanId | undefined;
    const shouldShowPlans = !subscription || subscription.plan_id === 'free';

    if (!shouldShowPlans) {
      return (
        <div className="mt-8 text-center text-gray-400">
          You are currently on the {titleCasePlan(subscription?.plan_id)} plan. Contact support if
          you need to switch plans.
        </div>
      );
    }

    return (
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl overflow-hidden border transition-all ${
              plan.highlight
                ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                : 'border-gray-800'
            } bg-gradient-to-br from-gray-900 to-gray-800`}
          >
            <div
              className={`p-6 ${
                plan.highlight ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-black/20'
              }`}
            >
              <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              <p className="text-white text-4xl font-extrabold mt-2">
                {plan.priceDisplay}
                <span className="text-white/70 text-base font-normal"> / month</span>
              </p>
            </div>
            <div className="p-6 space-y-4">
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-gray-300">
                    <span className="text-orange-500 mt-1">
                      <Check size={18} />
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={isSubmitting !== null || plan.id === currentPlanId}
                onClick={() => handleChoosePlan(plan.id)}
                className={`w-full mt-4 px-6 py-3 rounded-lg font-medium transition-all ${
                  plan.highlight
                    ? 'bg-black/20 hover:bg-black/30 text-white border border-white/20'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg'
                } ${isSubmitting === plan.id ? 'opacity-70 cursor-wait' : ''}`}
              >
                {isSubmitting === plan.id ? 'Processing...' : 'Choose Plan'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <Navbar user={user} onLogout={async () => {}} />
        <div className="pt-24 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar
        user={user}
        onLogout={async () => {
          try {
            await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
            router.push('/');
          } catch (e) {
            console.error(e);
          }
        }}
      />

      <div className="pt-20 px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold mb-4 text-white">Choose your plan</h1>
            <p className="text-gray-400 text-lg">
              Simple pricing, powerful features, same modern look and feel.
            </p>
          </div>

          {renderSubscriptionSummary()}

          {renderPlanCards()}
        </div>
      </div>
    </div>
  );
}

