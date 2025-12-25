'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/app/navbar/page';

interface User {
  id: number;
  email: string;
  name: string;
}

interface ContractClause {
  title: string;
  body: string;
}

interface Contract {
  id: string;
  initiator_id: number;
  counterparty_id: number | null; // Can be null for purchased templates
  title: string;
  summary: string;
  clauses: ContractClause[];
  suggestions: string[];
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  status: string; // 'draft', 'purchased', 'pending_counterparty', 'pending_acceptance', 'fully_signed', 'archived'
  created_at: string;
  updated_at: string;
}

interface UsageCheck {
  canCreate: boolean;
  used: number;
  limit: number | 'unlimited';
  planId: string;
}

export default function ContractsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createdContracts, setCreatedContracts] = useState<Contract[]>([]);
  const [receivedContracts, setReceivedContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState<UsageCheck | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchContracts();
      checkUsage();

      // Check for purchase success parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('purchase') === 'success') {
        setPurchaseSuccess(true);
        // Remove the query parameter from URL
        window.history.replaceState({}, '', '/contractspage');

        // Auto-dismiss banner after 10 seconds
        setTimeout(() => setPurchaseSuccess(false), 10000);

        // Implement smart polling for purchased contracts
        console.log('[ContractsPage] Purchase detected, starting smart polling...');
        let pollCount = 0;
        const maxPolls = 15; // Poll for up to 30 seconds (15 polls * 2 seconds)

        const pollForContract = () => {
          pollCount++;
          console.log(`[ContractsPage] Polling attempt ${pollCount}/${maxPolls}...`);

          fetchContracts();

          if (pollCount < maxPolls) {
            setTimeout(pollForContract, 2000); // Poll every 2 seconds
          } else {
            console.log('[ContractsPage] Polling timeout reached. Contract may not have been created.');
            // Show error message to user
            setPurchaseSuccess(false);
          }
        };

        // Start polling after 1 second
        setTimeout(pollForContract, 1000);
      }
    }
  }, [user]); // Only depend on user, not on window.location.search

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

  const fetchContracts = async () => {
    if (!user) return;

    setIsLoadingContracts(true);
    try {
      const response = await fetch(`/api/contracts/user?userId=${user.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const created = data.data.created || [];
          const received = data.data.received || [];
          console.log("[ContractsPage] Fetched contracts:", {
            created: created.length,
            received: received.length,
            createdIds: created.map((c: Contract) => c.id),
            receivedIds: received.map((c: Contract) => c.id)
          });
          setCreatedContracts(created);
          setReceivedContracts(received);
        }
      }
    } catch (err) {
      console.error('Error fetching contracts:', err);
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const checkUsage = async () => {
    if (!user?.email) return;

    try {
      const response = await fetch('/api/usage/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userEmail: user.email }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setUsageInfo(data.data);
          if (!data.data.canCreate) {
            setShowUsageModal(true);
          }
        }
      }
    } catch (err) {
      console.error('Error checking usage:', err);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      draft: { text: 'Brouillon', className: 'bg-gray-500' },
      purchased: { text: 'Acheté', className: 'bg-purple-500' },
      pending_counterparty: { text: 'En attente', className: 'bg-yellow-500' },
      pending_acceptance: { text: 'En attente d\'acceptation', className: 'bg-blue-500' },
      fully_signed: { text: 'Signé', className: 'bg-green-500' },
      archived: { text: 'Archivé', className: 'bg-gray-600' },
    };

    const statusInfo = statusMap[status] || statusMap.draft;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${statusInfo.className}`}
      >
        {statusInfo.text}
      </span>
    );
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

      {/* Purchase Success Banner */}
      {purchaseSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-green-300 flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
            <div>
              <p className="font-bold">Contrat acheté avec succès!</p>
              <p className="text-sm">Création du contrat en cours... Veuillez patienter.</p>
            </div>
            <button
              onClick={() => setPurchaseSuccess(false)}
              className="ml-4 text-white hover:text-green-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Usage Limit Modal */}
      {showUsageModal && usageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-indigo-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-purple-500/30">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Limite de plan atteinte
              </h2>
              <p className="text-purple-200">
                Vous avez utilisé tous vos contrats disponibles pour aujourd'hui.
              </p>
            </div>

            <div className="bg-purple-950/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-200">Contrats utilisés:</span>
                <span className="text-white font-bold">
                  {usageInfo.used} / {usageInfo.limit}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.push('/subscription')}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                Mettre à niveau le plan
              </button>
              <button
                onClick={() => setShowUsageModal(false)}
                className="w-full bg-gray-700 text-white py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-8">
            <h1 className="text-4xl font-bold text-white mb-4">
              Mes Contrats Intelligents
            </h1>
            <p className="text-purple-200 text-lg mb-4">
              Bienvenue, <span className="font-semibold text-white">{user?.name}</span>!
            </p>
            {usageInfo && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-purple-300">
                  Usage aujourd'hui: {usageInfo.used} /{' '}
                  {usageInfo.limit === 'unlimited' ? '∞' : usageInfo.limit}
                </span>
                {usageInfo.limit !== 'unlimited' && (
                  <div className="flex-1 max-w-xs bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min((usageInfo.used / usageInfo.limit) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Created Contracts Section */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Contrats créés par moi ({createdContracts.length})
              </h2>
              <button
                onClick={() => fetchContracts()}
                disabled={isLoadingContracts}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualiser
              </button>
            </div>

            {isLoadingContracts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-purple-200">Chargement des contrats...</p>
              </div>
            ) : createdContracts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-purple-300 text-lg">
                  Aucun contrat créé pour le moment.
                </p>
                <button
                  onClick={() => router.push('/askai')}
                  className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Créer un contrat
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 hover:bg-purple-900/50 transition-all cursor-pointer"
                    onClick={() => {
                      console.log("[ContractsPage] Clicked contract:", contract.id, contract);
                      router.push(`/contracts/${contract.id}`);
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-white">
                        {contract.title}
                      </h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    <p className="text-purple-300 text-sm mb-4 line-clamp-2">
                      {contract.summary}
                    </p>
                    <div className="flex justify-between items-center text-xs text-purple-400">
                      <span>{contract.clauses.length} clauses</span>
                      <span>{formatDate(contract.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Received Contracts Section */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              Contrats reçus ({receivedContracts.length})
            </h2>

            {isLoadingContracts ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-purple-200">Chargement des contrats...</p>
              </div>
            ) : receivedContracts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-purple-300 text-lg">
                  Aucun contrat reçu pour le moment.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {receivedContracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="bg-purple-950/50 border border-purple-500/30 rounded-xl p-6 hover:bg-purple-900/50 transition-all cursor-pointer"
                    onClick={() => {
                      console.log("[ContractsPage] Clicked contract:", contract.id, contract);
                      router.push(`/contracts/${contract.id}`);
                    }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-white">
                        {contract.title}
                      </h3>
                      {getStatusBadge(contract.status)}
                    </div>
                    <p className="text-purple-300 text-sm mb-4 line-clamp-2">
                      {contract.summary}
                    </p>
                    <div className="flex justify-between items-center text-xs text-purple-400">
                      <span>{contract.clauses.length} clauses</span>
                      <span>{formatDate(contract.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
