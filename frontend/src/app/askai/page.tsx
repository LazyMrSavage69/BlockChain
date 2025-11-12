/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Navbar from "@/app/navbar/page";

interface User {
  id: number;
  name: string;
  email: string;
}

interface GeneratedClause {
  title: string;
  body: string;
}

interface GeneratedContract {
  title: string;
  summary: string;
  clauses: GeneratedClause[];
  suggestions?: string[];
  rawText?: string;
}

const DEFAULT_CONTRACT: GeneratedContract = {
  title: "Contrat généré par Gemini",
  summary:
    "Aucun contrat n’a encore été généré. Complétez le formulaire pour créer un projet de contrat intelligent.",
  clauses: [],
};

const normalizeContract = (raw: unknown): GeneratedContract => {
  const data =
    (raw as (Partial<GeneratedContract> & { raw_text?: string })) || {};

  return {
    title: data?.title || DEFAULT_CONTRACT.title,
    summary: data?.summary || "",
    clauses: Array.isArray(data?.clauses) ? data.clauses : [],
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
    rawText: data?.rawText ?? data?.raw_text,
  };
};
export default function AskAiPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contract, setContract] = useState<GeneratedContract>(DEFAULT_CONTRACT);
  const [creatorAgreed, setCreatorAgreed] = useState(false);
  const [counterpartyAgreed, setCounterpartyAgreed] = useState(false);
  const [counterpartyQuery, setCounterpartyQuery] = useState("");
  const [counterpartyResult, setCounterpartyResult] = useState<User | null>(null);
  const [isSearchingCounterparty, setIsSearchingCounterparty] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [pendingFinalize, setPendingFinalize] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usageInfo, setUsageInfo] = useState<{
    canCreate: boolean;
    used: number;
    limit: number | 'unlimited';
    planId: string;
  } | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [formData, setFormData] = useState({
    contractType: "Contrat de prestation de services",
    projectName: "",
    governingLaw: "",
    partiesDescription: "",
    obligations: "",
    deliverables: "",
    paymentTerms: "",
    duration: "",
    confidentiality: true,
    disputeResolution: "Médiation et arbitrage",
  });

  const isFinalizeDisabled = useMemo(() => {
    return (
      !contract ||
      contract.clauses.length === 0 ||
      !creatorAgreed ||
      !counterpartyAgreed ||
      !counterpartyResult ||
      pendingFinalize
    );
  }, [contract, creatorAgreed, counterpartyAgreed, counterpartyResult, pendingFinalize]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/me", { credentials: "include" });
        if (!response.ok) {
          throw new Error("Utilisateur non authentifié");
        }
        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error("Erreur de récupération du profil:", err);
        setUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (user?.email) {
      checkUsage();
    }
  }, [user]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const target = event.target;

    if (target instanceof HTMLInputElement) {
      const { name, value, type, checked } = target;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
      return;
    }

    const textarea = target as HTMLTextAreaElement;
    setFormData((prev) => ({
      ...prev,
      [textarea.name]: textarea.value,
    }));
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
            setIsBlocked(true);
            setShowUsageModal(true);
          } else {
            setIsBlocked(false);
          }
        }
      }
    } catch (err) {
      console.error('Error checking usage:', err);
    }
  };

  const handleGenerateContract = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check usage before generating
    if (isBlocked || (usageInfo && !usageInfo.canCreate)) {
      setShowUsageModal(true);
      return;
    }

    setError(null);
    setIsGenerating(true);
    setSuccessMessage(null);
    setContract(DEFAULT_CONTRACT);
    setCreatorAgreed(false);
    setCounterpartyAgreed(false);
    setCounterpartyResult(null);

    try {
      const response = await fetch("/api/askai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          requesterName: user?.name ?? "Partie A",
          requesterEmail: user?.email ?? "",
        }),
      });

      if (!response.ok) {
        const { error: message } = await response.json().catch(() => ({ error: "Échec de génération" }));
        throw new Error(message || "La génération du contrat a échoué.");
      }

      const data = await response.json();
      setContract(normalizeContract(data.contract));
    } catch (err) {
      console.error("Erreur de génération:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur inattendue est survenue. Merci de réessayer dans quelques instants.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSearchCounterparty = async () => {
    if (!counterpartyQuery.trim()) {
      setSearchError("Veuillez saisir un nom d’utilisateur à rechercher.");
      return;
    }

    setSearchError(null);
    setIsSearchingCounterparty(true);
    setCounterpartyResult(null);

    try {
      const response = await fetch(
        `/api/users/search?query=${encodeURIComponent(counterpartyQuery)}`,
        {
          method: "GET",
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Impossible de trouver un utilisateur correspondant.");
      }

      const result = await response.json();
      const match: User | undefined = Array.isArray(result?.users)
        ? result.users[0]
        : result?.user ?? undefined;

      if (!match) {
        setSearchError("Aucun utilisateur trouvé avec ce nom.");
        return;
      }

      setCounterpartyResult(match);
      setSuccessMessage(
        `Utilisateur ${match.name} trouvé. Vous pouvez préparer la signature.`,
      );
    } catch (err) {
      console.error("Erreur de recherche:", err);
      setSearchError(
        "La recherche a échoué. Assurez-vous que l’API de recherche d’utilisateurs est disponible côté backend.",
      );
    } finally {
      setIsSearchingCounterparty(false);
    }
  };

  const handleFinalizeContract = async () => {
    if (isFinalizeDisabled || !user || !counterpartyResult) {
      return;
    }

    setPendingFinalize(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const status =
        creatorAgreed && counterpartyAgreed
          ? "fully_signed"
          : "pending_counterparty";

      const response = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initiatorId: user.id,
          counterpartyId: counterpartyResult.id,
          title: contract.title,
          summary: contract.summary,
          clauses: contract.clauses,
          suggestions: contract.suggestions ?? [],
          rawText: contract.rawText ?? null,
          initiatorAgreed: creatorAgreed,
          counterpartyAgreed,
          status,
          userEmail: user.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || "Impossible d’enregistrer le contrat.");
      }

      const contractId = result?.id ?? result?.data?.id ?? result?.contract?.id;

      setSuccessMessage(
        `${
          status === "fully_signed"
            ? "Contrat enregistré et signé par les deux parties."
            : "Contrat sauvegardé. La contrepartie doit encore signer."
        }${contractId ? ` (ID: ${contractId})` : ""}`,
      );
    } catch (err) {
      console.error("Erreur de finalisation:", err);
      setError("La finalisation du contrat a échoué. Merci de réessayer.");
    } finally {
      setPendingFinalize(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950 pb-16">
      <Navbar user={user} onLogout={() => fetch("/auth/logout", { method: "POST", credentials: "include" })} />

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
                onClick={() => {
                  setShowUsageModal(false);
                  window.location.href = '/subscription';
                }}
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

      {/* Block overlay if usage limit reached */}
      {isBlocked && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40">
          <div className="bg-indigo-900 rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-purple-500/30 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Accès bloqué
            </h2>
            <p className="text-purple-200 mb-6">
              Vous avez atteint votre limite quotidienne de contrats. Veuillez mettre à niveau votre plan pour continuer.
            </p>
            <button
              onClick={() => window.location.href = '/subscription'}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Voir les plans
            </button>
          </div>
        </div>
      )}

      <main className="pt-24 px-4">
        <div className="max-w-6xl mx-auto space-y-10">
          <section className="bg-indigo-900/70 border border-purple-500/30 rounded-2xl shadow-2xl p-8">
            <header className="flex items-center justify-between pb-6 border-b border-purple-500/20">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Assistant Gemini pour contrats intelligents</h1>
                <p className="text-purple-200 mt-2">
                  Décrivez votre accord et laissez Gemini générer un projet de contrat que vous pourrez relire et faire
                  co-signer.
                </p>
              </div>
              <img
                src="/logo.svg"
                alt="SmartContract AI"
                className="hidden md:block w-20 h-20 opacity-80"
              />
            </header>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6" onSubmit={handleGenerateContract}>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Type de contrat souhaité
                </label>
                <input
                  name="contractType"
                  value={formData.contractType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Ex: Contrat de prestation, NDA, Joint Venture..."
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Nom du projet / de l’accord
                </label>
                <input
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Ex: Développement d’une DApp pour Marketplace"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Droit applicable
                </label>
                <input
                  name="governingLaw"
                  value={formData.governingLaw}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Ex: Droit français, Californie, etc."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Description des parties impliquées
                </label>
                <textarea
                  name="partiesDescription"
                  value={formData.partiesDescription}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none h-24"
                  placeholder="Décrivez chaque partie, rôles, responsabilités..."
                  required
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-semibold text-purple-200 block mb-2">
                    Obligations principales
                  </label>
                  <textarea
                    name="obligations"
                    value={formData.obligations}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none h-32"
                    placeholder="Listez les obligations clés de chaque partie."
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-purple-200 block mb-2">
                    Livrables / Tokenomics
                  </label>
                  <textarea
                    name="deliverables"
                    value={formData.deliverables}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none h-32"
                    placeholder="Fonctionnalités, tokens, jalons à livrer..."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Conditions financières
                </label>
                <textarea
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none h-32"
                  placeholder="Paiements, tokens, échéancier, royalties..."
                  required
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Durée & résiliation
                </label>
                <textarea
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none h-32"
                  placeholder="Durée du contrat, conditions de résiliation..."
                  required
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="confidentiality"
                  type="checkbox"
                  name="confidentiality"
                  checked={formData.confidentiality}
                  onChange={handleInputChange}
                  className="w-5 h-5 rounded border-purple-500/40 text-purple-500 focus:ring-purple-400 focus:outline-none"
                />
                <label htmlFor="confidentiality" className="text-sm font-semibold text-purple-200">
                  Inclure une clause de confidentialité stricte
                </label>
              </div>

              <div>
                <label className="text-sm font-semibold text-purple-200 block mb-2">
                  Méthode de résolution des litiges
                </label>
                <input
                  name="disputeResolution"
                  value={formData.disputeResolution}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                  placeholder="Ex: médiation, arbitrage, tribunal compétent..."
                  required
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isGenerating || isBlocked}
                  className="w-full md:w-auto px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-full shadow-lg transition disabled:bg-purple-300 disabled:cursor-not-allowed"
                >
                  {isGenerating
                    ? "Génération en cours..."
                    : isBlocked
                    ? "Limite atteinte - Mettre à niveau"
                    : "Générer le contrat"}
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-6 rounded-lg border border-red-400 bg-red-900/40 px-4 py-3 text-red-200">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mt-6 rounded-lg border border-emerald-400 bg-emerald-900/30 px-4 py-3 text-emerald-100">
                {successMessage}
              </div>
            )}
          </section>

          <section className="bg-indigo-900/70 border border-purple-500/30 rounded-2xl shadow-2xl p-8">
            <header className="flex items-center justify-between pb-4 border-b border-purple-500/20">
              <div>
                <h2 className="text-2xl font-semibold text-white">Projet de contrat</h2>
                <p className="text-purple-200">
                  Révisez attentivement le contrat généré par Gemini. Validez les clauses avant de solliciter la
                  signature de la contrepartie.
                </p>
              </div>
              <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </header>

            <article className="mt-6 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white">{contract.title}</h3>
                <p className="text-purple-200 mt-2">{contract.summary}</p>
              </div>

              {contract.clauses.length > 0 ? (
                <div className="space-y-4">
                  {contract.clauses.map((clause, index) => (
                    <div
                      key={`${clause.title}-${index}`}
                      className="rounded-lg border border-purple-500/30 bg-indigo-950/40 p-4"
                    >
                      <h4 className="text-lg font-semibold text-purple-100">{clause.title}</h4>
                      <p className="text-purple-200 whitespace-pre-line mt-2">{clause.body}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-purple-500/30 bg-indigo-950/40 p-4 text-purple-200">
                  Aucun contenu généré pour l’instant.
                </div>
              )}

              {contract.suggestions && contract.suggestions.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-4">
                  <h4 className="text-lg font-semibold text-amber-300">Suggestions / Points d’attention</h4>
                  <ul className="list-disc list-inside text-amber-200 mt-2">
                    {contract.suggestions.map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {contract.rawText && (
                <details className="rounded-lg border border-purple-500/20 bg-indigo-950/40 p-4 text-purple-200">
                  <summary className="cursor-pointer font-semibold text-purple-100">
                    Voir la réponse textuelle complète de Gemini
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-sm">{contract.rawText}</pre>
                </details>
              )}
            </article>
          </section>

          <section className="bg-indigo-900/70 border border-purple-500/30 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-semibold text-white">Validation et signatures requises</h2>
            <p className="text-purple-200 mt-2">
              Le contrat doit être approuvé par vous et par la contrepartie avant de passer à la signature finale.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-purple-500/30 bg-indigo-950/40 p-6 space-y-4">
                <h3 className="text-lg font-semibold text-purple-100">Votre validation</h3>
                <p className="text-purple-200">
                  Confirmez que le contrat reflète fidèlement les termes que vous souhaitez proposer.
                </p>
                <label className="flex items-center gap-3 text-purple-100">
                  <input
                    type="checkbox"
                    checked={creatorAgreed}
                    onChange={(event) => setCreatorAgreed(event.target.checked)}
                    className="w-5 h-5 rounded border-purple-500/40 text-purple-500 focus:ring-purple-400 focus:outline-none"
                  />
                  J’atteste que le contrat correspond à mes attentes.
                </label>
              </div>

              <div className="rounded-lg border border-purple-500/30 bg-indigo-950/40 p-6 space-y-4">
                <h3 className="text-lg font-semibold text-purple-100">Recherche de la contrepartie</h3>
                <p className="text-purple-200">
                  Saisissez le nom de l’utilisateur à inviter à signer. Les deux parties devront marquer leur accord.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    value={counterpartyQuery}
                    onChange={(event) => setCounterpartyQuery(event.target.value)}
                    className="flex-1 rounded-lg border border-purple-500/30 bg-indigo-950/40 px-4 py-3 text-white focus:ring-2 focus:ring-purple-400 focus:outline-none"
                    placeholder="Rechercher un utilisateur par nom..."
                  />
                  <button
                    type="button"
                    onClick={handleSearchCounterparty}
                    disabled={isSearchingCounterparty}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition disabled:bg-purple-300 disabled:cursor-not-allowed"
                  >
                    {isSearchingCounterparty ? "Recherche..." : "Rechercher"}
                  </button>
                </div>

                {searchError && <p className="text-sm text-red-300">{searchError}</p>}

                {counterpartyResult && (
                  <div className="rounded-lg border border-purple-500/30 bg-indigo-950/60 p-4">
                    <p className="text-purple-100 font-semibold">
                      Invité : {counterpartyResult.name}
                    </p>
                    <p className="text-purple-200 text-sm">{counterpartyResult.email}</p>

                    <label className="flex items-center gap-3 text-purple-100 mt-3">
                      <input
                        type="checkbox"
                        checked={counterpartyAgreed}
                        onChange={(event) => setCounterpartyAgreed(event.target.checked)}
                        className="w-5 h-5 rounded border-purple-500/40 text-purple-500 focus:ring-purple-400 focus:outline-none"
                      />
                      La contrepartie a confirmé accepter ce projet (à consigner via l’API backend).
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleFinalizeContract}
                disabled={isFinalizeDisabled}
                className="w-full md:w-auto px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-full shadow-lg transition disabled:bg-emerald-200 disabled:cursor-not-allowed"
              >
                {pendingFinalize ? "Préparation..." : "Finaliser et envoyer pour signature"}
              </button>
              <p className="text-sm text-purple-200 mt-3">
                Cette action devra, côté backend, créer l’enregistrement du contrat et déclencher la collecte des deux
                signatures numériques.
              </p>
            </div>
          </section>

          {!isLoadingUser && !user && (
            <section className="bg-red-900/40 border border-red-500/30 rounded-2xl shadow-inner p-6 text-red-100">
              Vous n’êtes pas connecté. Connectez-vous pour sauvegarder ou envoyer les contrats générés.
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

