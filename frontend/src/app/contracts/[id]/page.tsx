"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/app/navbar/page";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Link as LinkIcon, Wallet } from "lucide-react";
import { registerOnBlockchain, signOnBlockchain, getBlockchainContract } from "../../../lib/web3";

interface User {
  id: number;
  name: string;
  email: string;
}

interface ContractClause {
  title: string;
  body: string;
}

interface Contract {
  id: string;
  owner_id?: number;
  initiator_id: number;
  counterparty_id: number;
  title: string;
  summary: string;
  clauses: ContractClause[];
  suggestions: string[];
  raw_text?: string;
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  status: string;
  generated_by?: string;
  blockchain_hash?: string | null;
  created_at: string;
  updated_at: string;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Simple Rich Text Editor Component
function RichTextEditor({
  content,
  onChange,
  readOnly,
  placeholder,
}: {
  content: string;
  onChange: (html: string) => void;
  readOnly: boolean;
  placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  const formatHeading = (level: number) => {
    execCommand("formatBlock", `h${level}`);
  };

  if (readOnly) {
    return (
      <div
        className="prose max-w-none p-6 min-h-[500px] bg-gray-50"
        dangerouslySetInnerHTML={{ __html: content || placeholder || "" }}
      />
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => formatHeading(2)}
          className="p-2 hover:bg-gray-200 rounded"
          title="Titre 2"
        >
          <span className="font-bold text-sm">H2</span>
        </button>
        <button
          type="button"
          onClick={() => formatHeading(3)}
          className="p-2 hover:bg-gray-200 rounded"
          title="Titre 3"
        >
          <span className="font-bold text-sm">H3</span>
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Gras"
        >
          <Bold size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Italique"
        >
          <Italic size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Souligné"
        >
          <Underline size={18} />
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => execCommand("insertUnorderedList")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Liste à puces"
        >
          <List size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("insertOrderedList")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Liste numérotée"
        >
          <ListOrdered size={18} />
        </button>
        <button
          type="button"
          onClick={() => execCommand("justifyLeft")}
          className="p-2 hover:bg-gray-200 rounded"
          title="Aligner à gauche"
        >
          <AlignLeft size={18} />
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("Entrez l'URL du lien:");
            if (url) execCommand("createLink", url);
          }}
          className="p-2 hover:bg-gray-200 rounded"
          title="Insérer un lien"
        >
          <LinkIcon size={18} />
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-6 min-h-[500px] outline-none prose max-w-none"
        style={{
          fontSize: "16px",
          lineHeight: "1.6",
        }}
        data-placeholder={placeholder || "Commencez à éditer le contrat..."}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #adb5bd;
          pointer-events: none;
        }
        [contenteditable] h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        [contenteditable] h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.75em;
          margin-bottom: 0.5em;
        }
        [contenteditable] p {
          margin: 0.75em 0;
        }
        [contenteditable] ul,
        [contenteditable] ol {
          padding-left: 1.5em;
          margin: 0.75em 0;
        }
        [contenteditable] li {
          margin: 0.25em 0;
        }
      `}</style>
    </div>
  );
}

function InviteCounterparty({ onInvite }: { onInvite: (userId: number) => void }) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<User | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.users?.[0] || data.user;
        if (found) {
          setResult(found);
        } else {
          setSearchError("Aucun utilisateur trouvé.");
        }
      } else {
        setSearchError("Erreur lors de la recherche.");
      }
    } catch (e) {
      setSearchError("Erreur réseau.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="flex-1 px-4 py-2 rounded-lg bg-indigo-950/50 border border-purple-500/30 text-white focus:outline-none focus:border-purple-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isSearching ? '...' : 'Rechercher'}
        </button>
      </div>

      {searchError && <p className="text-red-300 text-sm">{searchError}</p>}

      {result && (
        <div className="flex items-center justify-between p-3 bg-indigo-950/30 rounded-lg border border-purple-500/20">
          <div>
            <p className="font-bold text-white">{result.name}</p>
            <p className="text-sm text-purple-300">{result.email}</p>
          </div>
          <button
            onClick={() => onInvite(result.id)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"
          >
            Inviter
          </button>
        </div>
      )}
    </div>
  );
}

export default function ContractViewPage() {
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isInitialized, setIsInitialized] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  const [isBlockchainLoading, setIsBlockchainLoading] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState<string | null>(null);

  // Convert clauses to HTML
  const clausesToHTML = (clauses: ContractClause[]): string => {
    if (!clauses || clauses.length === 0) return "";
    return clauses
      .map(
        (clause) =>
          `<h2>${clause.title}</h2><p>${clause.body.replace(/\n/g, "<br>")}</p>`
      )
      .join("");
  };

  // Convert HTML back to clauses
  const htmlToClauses = (html: string): ContractClause[] => {
    if (!html) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const clauses: ContractClause[] = [];

    let currentTitle = "";
    let currentBody = "";

    Array.from(doc.body.children).forEach((element) => {
      if (element.tagName === "H2") {
        if (currentTitle && currentBody) {
          clauses.push({
            title: currentTitle,
            body: currentBody.trim(),
          });
        }
        currentTitle = element.textContent || "";
        currentBody = "";
      } else if (element.tagName === "H3") {
        // Treat H3 as part of body or as a subtitle
        if (currentTitle) {
          currentBody += (currentBody ? "\n" : "") + (element.textContent || "");
        }
      } else if (element.tagName === "P" || element.tagName === "DIV") {
        const text = element.textContent || "";
        if (text.trim()) {
          currentBody += (currentBody ? "\n" : "") + text;
        }
      }
    });

    if (currentTitle && currentBody) {
      clauses.push({
        title: currentTitle,
        body: currentBody.trim(),
      });
    }

    return clauses.length > 0 ? clauses : contract?.clauses || [];
  };

  // Auto-save function with debounce
  const autoSaveContract = useCallback(async (content: string) => {
    if (!contract || !user) return;

    // Check if user can edit (not signed and is one of the parties)
    const isInitiator = user.id === contract.initiator_id;
    const isCounterparty = user.id === contract.counterparty_id;
    const isSigned = contract.status === "fully_signed";
    const canEditContract = !isSigned && (isInitiator || isCounterparty);

    if (!canEditContract) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds after last change)
    saveTimeoutRef.current = setTimeout(async () => {
      // Only save if content has changed
      if (content === lastSavedContentRef.current) {
        return;
      }

      setIsSaving(true);
      setAutoSaveStatus("saving");
      setError(null);

      try {
        const updatedClauses = htmlToClauses(content);

        const response = await fetch(
          `/api/contracts/${contractId}/update`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              clauses: updatedClauses,
              title: contract.title,
              summary: contract.summary,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setContract(data.data);
          lastSavedContentRef.current = content;
          setAutoSaveStatus("saved");
          setTimeout(() => {
            setAutoSaveStatus("idle");
          }, 2000);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Erreur lors de la sauvegarde automatique");
          setAutoSaveStatus("idle");
        }
      } catch (err) {
        console.error("Error auto-saving contract:", err);
        setError("Erreur lors de la sauvegarde automatique");
        setAutoSaveStatus("idle");
      } finally {
        setIsSaving(false);
      }
    }, 2000); // 2 second debounce
  }, [contract, user, contractId]);

  // Handle editor content change
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    if (contract && user && isInitialized) {
      const isInitiator = user.id === contract.initiator_id;
      const isCounterparty = user.id === contract.counterparty_id;
      const isSigned = contract.status === "fully_signed";
      const canEditContract = !isSigned && (isInitiator || isCounterparty);

      if (canEditContract) {
        autoSaveContract(content);
      }
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && contractId) {
      fetchContract();
    }
  }, [user, contractId]);

  useEffect(() => {
    if (contract && !isInitialized) {
      console.log("[ContractViewPage] Setting editor content from contract:", contract);
      const html = clausesToHTML(contract.clauses || []);
      setEditorContent(html);
      lastSavedContentRef.current = html;
      setIsInitialized(true);
    }
  }, [contract]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const fetchUser = async () => {
    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push("/login");
      }
    } catch (err) {
      console.error("Auth error:", err);
      router.push("/login");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContract = async () => {
    if (!user || !contractId) {
      console.log("Missing user or contractId:", { user: !!user, contractId });
      return;
    }

    console.log(`[ContractViewPage] Fetching contract with ID: ${contractId}`);
    try {
      const response = await fetch(`/api/contracts/${contractId}`, {
        credentials: "include",
      });

      console.log(`[ContractViewPage] Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`[ContractViewPage] Contract fetched:`, data);
        setContract(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("[ContractViewPage] Contract fetch error:", response.status, errorData);
        setError(
          errorData.error || errorData.message || `Contrat introuvable (${response.status})`
        );
      }
    } catch (err) {
      console.error("[ContractViewPage] Error fetching contract:", err);
      setError(`Erreur lors du chargement du contrat: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    }
  };

  const saveContract = async () => {
    if (!contract || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const updatedClauses = htmlToClauses(editorContent);

      const response = await fetch(
        `/api/contracts/${contractId}/update`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            clauses: updatedClauses,
            title: contract.title,
            summary: contract.summary,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContract(data.data);
        lastSavedContentRef.current = editorContent;
        setSuccessMessage("Contrat sauvegardé avec succès!");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de la sauvegarde");
      }
    } catch (err) {
      console.error("Error saving contract:", err);
      setError("Erreur lors de la sauvegarde du contrat");
    } finally {
      setIsSaving(false);
    }
  };

  const acceptContract = async () => {
    if (!contract || !user) return;

    setIsAccepting(true);
    setError(null);

    try {
      const isInitiator = user.id === contract.initiator_id;
      const isCounterparty = user.id === contract.counterparty_id;

      if (!isInitiator && !isCounterparty) {
        setError("Vous n'êtes pas autorisé à signer ce contrat");
        return;
      }

      const response = await fetch(
        `/api/contracts/${contractId}/accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: user.id,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContract(data.data);
        setSuccessMessage(
          "Contrat accepté! Le contrat sera signé lorsque les deux parties auront accepté."
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de l'acceptation");
      }
    } catch (err) {
      console.error("Error accepting contract:", err);
      setError("Erreur lors de l'acceptation du contrat");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleBlockchainSign = async () => {
    if (!contract || !user) return;
    setIsBlockchainLoading(true);
    setError(null);

    try {
      const isInitiator = user.id === contract.initiator_id;

      // Check if already on blockchain
      let onChain = false;
      try {
        if (contract.blockchain_hash) {
          // Verify persistence
          onChain = true;
        }
      } catch (e) { console.log("Not on chain yet"); }

      let txHash;

      if (isInitiator && !contract.blockchain_hash) {
        // Initiator registers and signs
        const counterpartyAddress = prompt("Veuillez entrer l'adresse Ethereum de la contrepartie:");
        if (!counterpartyAddress) {
          setIsBlockchainLoading(false);
          return;
        }

        // Register
        console.log("Registering on blockchain...");
        await registerOnBlockchain(contract.id, "hash-" + Date.now(), counterpartyAddress); // Using simplified hash for demo

        // Sign
        console.log("Signing on blockchain...");
        txHash = await signOnBlockchain(contract.id);

      } else {
        // Counterparty or subsequent sign
        console.log("Signing on blockchain...");
        txHash = await signOnBlockchain(contract.id);
      }

      // Update backend
      if (txHash) {
        await fetch(`/api/contracts/${contract.id}/blockchain-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ txHash })
        });

        setBlockchainHash(txHash);
        setSuccessMessage("Contrat signé sur la blockchain avec succès! Hash: " + txHash);
        // Refresh contract
        fetchContract();
      }

    } catch (err: any) {
      console.error("Blockchain error:", err);
      setError("Erreur blockchain: " + (err.message || err));
    } finally {
      setIsBlockchainLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
        <Navbar user={user} onLogout={handleLogout} />
        <div className="pt-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-red-400 text-lg">{error || "Contrat introuvable"}</p>
            <button
              onClick={() => router.push("/contractspage")}
              className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
            >
              Retour aux contrats
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isInitiator = user?.id === contract.initiator_id;
  const isCounterparty = user?.id === contract.counterparty_id;
  const isSigned = contract.status === "fully_signed";
  const canEdit = !isSigned && (isInitiator || isCounterparty);
  const userHasAgreed = isInitiator
    ? contract.initiator_agreed
    : contract.counterparty_agreed;
  const otherPartyHasAgreed = isInitiator
    ? contract.counterparty_agreed
    : contract.initiator_agreed;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-950">
      <Navbar user={user} onLogout={handleLogout} />

      <div className="pt-20 pb-12 px-4">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {contract.title}
                </h1>
                <p className="text-purple-200">{contract.summary}</p>
              </div>
              <button
                onClick={() => router.push("/contractspage")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                Retour
              </button>
            </div>

            {/* Status and Agreement Info */}
            <div className="flex items-center gap-4 flex-wrap">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${isSigned
                  ? "bg-green-500 text-white"
                  : contract.status === "pending_counterparty"
                    ? "bg-yellow-500 text-white"
                    : "bg-gray-500 text-white"
                  }`}
              >
                {isSigned
                  ? "✓ Signé"
                  : contract.status === "pending_counterparty"
                    ? "En attente"
                    : "Brouillon"}
              </span>

              <div className="flex items-center gap-4 text-sm text-purple-200">
                <span>
                  {isInitiator ? "Vous (Créateur)" : "Vous (Contrepartie)"}
                  {userHasAgreed ? " ✓ Accepté" : " ⏳ En attente"}
                </span>
                <span>•</span>
                <span>
                  {isInitiator ? "Contrepartie" : "Créateur"}
                  {otherPartyHasAgreed ? " ✓ Accepté" : " ⏳ En attente"}
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg p-4 mb-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900/50 border border-green-500/50 text-green-200 rounded-lg p-4 mb-4">
              {successMessage}
            </div>
          )}

          {/* Invitation Section (if no counterparty) */}
          {isInitiator && !contract.counterparty_id && (
            <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-2xl shadow-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Inviter une contrepartie</h3>
              <p className="text-purple-200 mb-4">
                Ce contrat est actuellement un brouillon personnel. Pour le rendre officiel, invitez une autre partie à le signer.
              </p>

              <InviteCounterparty onInvite={async (userId) => {
                try {
                  const res = await fetch(`/api/contracts/${contractId}/invite`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ counterpartyId: userId })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setSuccessMessage(`Utilisateur invité avec succès!`);
                    fetchContract(); // Reload
                  } else {
                    setError(data.message || 'Erreur lors de l\'invitation');
                  }
                } catch (err) {
                  setError('Erreur réseau lors de l\'invitation');
                }
              }} />
            </div>
          )}

          {/* Editor */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Contenu du contrat</h2>
              <div className="flex items-center gap-3">
                {canEdit && (
                  <span className="text-purple-300 text-sm">
                    {autoSaveStatus === "saving" && "💾 Sauvegarde..."}
                    {autoSaveStatus === "saved" && "✓ Sauvegardé"}
                    {autoSaveStatus === "idle" && "Mode édition"}
                  </span>
                )}
                {!isSigned && !canEdit && (
                  <span className="text-purple-300 text-sm">Mode lecture</span>
                )}
              </div>
            </div>

            {isSigned && (
              <div className="mb-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-yellow-200 text-sm">
                ⚠️ Ce contrat est signé et ne peut plus être modifié.
              </div>
            )}

            <RichTextEditor
              content={editorContent}
              onChange={handleEditorChange}
              readOnly={!canEdit}
              placeholder={canEdit ? "Commencez à éditer le contrat..." : ""}
            />

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 flex-wrap">
              {!isSigned && !userHasAgreed && (
                <button
                  onClick={acceptContract}
                  disabled={isAccepting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAccepting ? "Traitement..." : "J'accepte ce contrat"}
                </button>
              )}

              {userHasAgreed && !isSigned && (
                <div className="px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg font-semibold">
                  ✓ Vous avez accepté ce contrat
                </div>
              )}

              {isSigned && (
                <div className="px-6 py-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg font-semibold">
                  ✓ Contrat signé par les deux parties
                </div>
              )}

              {isSigned && (
                <button
                  onClick={handleBlockchainSign}
                  disabled={isBlockchainLoading || (!!contract.blockchain_hash && !!blockchainHash)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Wallet size={20} />
                  {isBlockchainLoading ? "Signature en cours..." : contract.blockchain_hash ? "Voir sur Blockchain (Signé)" : "Signer sur Blockchain"}
                </button>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {contract.suggestions && contract.suggestions.length > 0 && (
            <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 backdrop-blur-sm border border-amber-500/20 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-amber-200 mb-4">
                Suggestions / Points d'attention
              </h3>
              <ul className="list-disc list-inside space-y-2 text-amber-100">
                {contract.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
