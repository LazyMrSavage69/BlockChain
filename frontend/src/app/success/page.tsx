"use client"

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../navbar/page';

interface User {
  id: number;
  email: string;
  name: string;
}

export default function SubscriptionSuccess() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/me', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setIsLoadingUser(false);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/');
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="pt-24 px-4 pb-16">
        <div className="max-w-2xl mx-auto">
          {isLoadingUser ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-800 p-8 text-center shadow-xl">
              <h1 className="text-3xl font-bold text-white mb-2">Payment successful</h1>
              <p className="text-gray-300 mb-6">
                Your subscription will be activated shortly. You can now continue to the app.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => router.push('/subscription')}
                  className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-medium transition-all"
                >
                  View Subscription
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
