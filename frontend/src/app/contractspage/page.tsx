'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/navbar/page';

interface User {
  id: number;
  email: string;
  name: string;
}

export default function ContractsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch('/api/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error('Auth error:', err);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={user} onLogout={handleLogout} />
      
      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Smart Contracts
            </h1>
            <p className="text-purple-200 text-lg mb-8">
              Welcome, <span className="font-semibold text-white">{user?.name}</span>! 
              Your blockchain contracts will appear here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Placeholder contract cards */}
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 hover:bg-purple-900/50 transition-all">
                <h3 className="text-xl font-semibold text-white mb-2">Contract #1</h3>
                <p className="text-purple-300 text-sm">Coming soon...</p>
              </div>
              
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 hover:bg-purple-900/50 transition-all">
                <h3 className="text-xl font-semibold text-white mb-2">Contract #2</h3>
                <p className="text-purple-300 text-sm">Coming soon...</p>
              </div>
              
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 hover:bg-purple-900/50 transition-all">
                <h3 className="text-xl font-semibold text-white mb-2">Contract #3</h3>
                <p className="text-purple-300 text-sm">Coming soon...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}