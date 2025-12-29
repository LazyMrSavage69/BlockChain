"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/app/navbar/page";
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, Link as LinkIcon, Wallet, ExternalLink } from "lucide-react";
import { registerOnBlockchain, signOnBlockchain, getBlockchainContract, makePaymentOnBlockchain, isContractFullyPaid, calculatePriceFromWordCount } from "../../../lib/web3";

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
  counterparty_id: number | null; // Can be null until assigned
  title: string;
  summary: string;
  clauses: ContractClause[];
  suggestions: string[];
  raw_text?: string;
  initiator_agreed: boolean;
  counterparty_agreed: boolean;
  status: string; // 'draft', 'purchased', 'pending_counterparty', 'pending_acceptance', 'fully_signed', 'archived'
  generated_by?: string;
  blockchain_hash?: string | null;
  payment_tx_hash?: string | null;
  calculated_price?: number;
  chain_id?: number | null;
  registration_cost_eth?: number | null;
  created_at: string;
  updated_at: string;
}

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://4.251.143.80.nip.io";

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
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>("");

  const [isBlockchainLoading, setIsBlockchainLoading] = useState(false);
  const [blockchainHash, setBlockchainHash] = useState<string | null>(null);
  const [showBlockchainPopup, setShowBlockchainPopup] = useState(false);
  const [hasShownPopup, setHasShownPopup] = useState(false);

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

    Array.from(doc.body.childNodes).forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        if (element.tagName === "H2") {
          if (currentTitle || currentBody.trim()) {
            clauses.push({
              title: currentTitle || "Général",
              body: currentBody.trim(),
            });
          }
          currentTitle = element.textContent || "";
          currentBody = "";
        } else if (element.tagName === "H3") {
          if (!currentTitle) currentTitle = "Général";
          currentBody += (currentBody ? "\n" : "") + (element.textContent || "");
        } else if (element.tagName === "P" || element.tagName === "DIV") {
          const text = element.textContent || "";
          if (text.trim()) {
            if (!currentTitle) currentTitle = "Général";
            currentBody += (currentBody ? "\n" : "") + text;
          }
        }
      } else if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (text.trim()) {
          if (!currentTitle) currentTitle = "Général";
          currentBody += (currentBody ? "\n" : "") + text;
        }
      }
    });

    if (currentTitle || currentBody) {
      clauses.push({
        title: currentTitle || "Général",
        body: currentBody.trim(),
      });
    }

    return clauses.length > 0 ? clauses : contract?.clauses || [];
  };

  // Helper to strip HTML tags
  const stripHtml = (html: string): string => {
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  // Handle editor content change
  const handleEditorChange = (content: string) => {
    setEditorContent(content);
    // Mark as having unsaved changes if content differs from last saved
    if (content !== lastSavedContentRef.current) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
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
      setHasUnsavedChanges(false);
      setIsInitialized(true);
    }

    // Check if we should show the blockchain popup
    if (contract && contract.status === 'fully_signed' && !contract.blockchain_hash && !hasShownPopup) {
      // Only show if user is initiator (creator)
      const isInitiator = user?.id === contract.initiator_id;

      if (isInitiator) {
        setShowBlockchainPopup(true);
        setHasShownPopup(true);
      }
    }
  }, [contract, hasShownPopup, user]);

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
      const rawText = stripHtml(editorContent);

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
            raw_text: rawText,
            title: contract.title,
            summary: contract.summary,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContract(data.data);
        lastSavedContentRef.current = editorContent;
        setHasUnsavedChanges(false);
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

  const revokeAgreement = async () => {
    if (!contract || !user) return;

    setIsRevoking(true);
    setError(null);

    try {
      const isInitiator = user.id === contract.initiator_id;
      const isCounterparty = user.id === contract.counterparty_id;

      if (!isInitiator && !isCounterparty) {
        setError("Vous n'êtes pas autorisé à révoquer ce contrat");
        return;
      }

      const response = await fetch(
        `/api/contracts/${contractId}/revoke`,
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
          "Accord révoqué avec succès. Vous pouvez modifier le contrat à nouveau."
        );
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de la révocation");
      }
    } catch (err) {
      console.error("Error revoking agreement:", err);
      setError("Erreur lors de la révocation de l'accord");
    } finally {
      setIsRevoking(false);
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

      let txHash: string | undefined;
      let chainId: number | undefined;
      let estimatedCostEth: number | undefined;

      if (isInitiator && !contract.blockchain_hash) {
        // Initiator registers and signs
        // Get counterparty's Ethereum address from their connected wallet
        let counterpartyAddress: string | null = null;

        // Check if counterparty has Web3 wallet
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            // Request account access if needed
            const accounts = await (window as any).ethereum.request({
              method: 'eth_requestAccounts'
            });

            // For now, we'll use a placeholder since we need the counterparty's address
            // In a real system, this should be stored in the user's profile
            counterpartyAddress = prompt(
              "Entrez l'adresse Ethereum de la contrepartie\n" +
              "(ou laissez vide pour utiliser une adresse par défaut pour le test):"
            );

            // Use a default test address if empty
            if (!counterpartyAddress || counterpartyAddress.trim() === '') {
              counterpartyAddress = accounts[0]; // Use current account as fallback for testing
              console.log("Using current account as counterparty for testing:", counterpartyAddress);
            }
          } catch (error) {
            console.error("Error accessing Web3 wallet:", error);
            setError("Veuillez connecter votre portefeuille MetaMask pour continuer.");
            setIsBlockchainLoading(false);
            return;
          }
        } else {
          // No Web3 wallet, ask for address manually
          counterpartyAddress = prompt(
            "Aucun portefeuille Web3 détecté.\n" +
            "Entrez l'adresse Ethereum de la contrepartie\n" +
            "(format: 0x...):"
          );
        }

        if (!counterpartyAddress) {
          setError("L'adresse de la contrepartie est requise pour enregistrer le contrat sur la blockchain.");
          setIsBlockchainLoading(false);
          return;
        }

        // Register
        console.log("Registering on blockchain...");
        await registerOnBlockchain(contract.id, "hash-" + Date.now(), counterpartyAddress);

        // Sign
        console.log("Signing on blockchain...");
        const signResult = await signOnBlockchain(contract.id) as unknown as { txHash: string; chainId?: number; estimatedCostEth?: number };
        txHash = signResult.txHash;
        chainId = signResult.chainId;
        estimatedCostEth = signResult.estimatedCostEth;

      } else {
        // Counterparty or subsequent sign
        console.log("Signing on blockchain...");
        const signResult2 = await signOnBlockchain(contract.id) as unknown as { txHash: string; chainId?: number; estimatedCostEth?: number };
        txHash = signResult2.txHash;
        chainId = signResult2.chainId;
        estimatedCostEth = signResult2.estimatedCostEth;
      }

      // Calculate price based on word count
      const contractText = contract.raw_text || contract.clauses.map(c => c.title + " " + c.body).join(" ");
      const calculatedPrice = calculatePriceFromWordCount(contractText);

      // Make automatic payment based on word count
      console.log(`💰 Processing automatic payment: ${calculatedPrice} ETH`);
      const paymentTxHash = await makePaymentOnBlockchain(contract.id, calculatedPrice.toString());

      console.log(`[Frontend] Blockchain sign result: txHash=${txHash}, chainId=${chainId}`);

      // Update backend with both transaction hashes
      if (txHash && paymentTxHash) {
        // Validation check
        if (!chainId) {
          console.warn("[Frontend] ChainID missing from sign result, attempting to fetch from window.ethereum");
          try {
            const chainIdHex = await (window as any).ethereum.request({ method: 'eth_chainId' });
            chainId = parseInt(chainIdHex, 16);
            console.log("[Frontend] Refetched ChainID:", chainId);
          } catch (e) {
            console.error("[Frontend] Failed to refetch ChainID", e);
          }
        }

        const payload = {
          txHash,
          paymentTxHash,
          calculatedPrice,
          chainId,
          registrationCostEth: estimatedCostEth
        };
        console.log("[Frontend] Sending blockchain hash update:", payload);

        await fetch(`/api/contracts/${contract.id}/blockchain-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        setBlockchainHash(txHash);
        setSuccessMessage(
          `✅ Contrat signé et enregistré sur la blockchain!\n` +
          (typeof chainId !== 'undefined' ? `🔗 Chain ID: ${chainId}\n` : '') +
          (typeof estimatedCostEth !== 'undefined' ? `⛽ Coût d'enregistrement estimé: ${estimatedCostEth.toFixed(6)} ETH\n` : '') +
          ` Paiement de ${calculatedPrice} ETH effectué (basé sur ${contractText.trim().split(/\s+/).length} mots)\n` +
          `TX: ${txHash.slice(0, 20)}...`
        );
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

  const handleDelete = async () => {
    if (!contract || !user) return;

    // Only owner/initiator can delete usually, or maybe both? 
    // For now, let's allow the initiator or owner to delete.
    const isOwner = user.id === contract.owner_id || user.id === contract.initiator_id;

    if (!isOwner) {
      setError("Seul le créateur du contrat peut le supprimer.");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contrat ? Cette action est irréversible.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        setSuccessMessage("Contrat supprimé avec succès.");
        setTimeout(() => {
          router.push("/contractspage");
        }, 1500);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Erreur lors de la suppression du contrat");
        setIsDeleting(false);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Erreur réseau lors de la suppression");
      setIsDeleting(false);
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

      {/* Blockchain Prompt Popup */}
      {showBlockchainPopup && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-500/50 rounded-2xl shadow-2xl p-8 max-w-lg w-full transform transition-all scale-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                <Wallet className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Félicitations !</h2>
              <p className="text-purple-200">
                Le contrat est signé par les deux parties. Il est maintenant temps de l'enregistrer sur la blockchain pour le rendre immuable.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowBlockchainPopup(false);
                  handleBlockchainSign();
                }}
                disabled={isBlockchainLoading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                {isBlockchainLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signature en cours...
                  </>
                ) : (
                  <>
                    <Wallet size={20} />
                    Enregistrer sur Blockchain maintenant
                  </>
                )}
              </button>
              <button
                onClick={() => setShowBlockchainPopup(false)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
              >
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

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
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors mr-2 disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </button>
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
                  : contract.status === "pending_acceptance"
                    ? "bg-blue-500 text-white"
                    : contract.status === "pending_counterparty"
                      ? "bg-yellow-500 text-white"
                      : contract.status === "purchased"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-500 text-white"
                  }`}
              >
                {isSigned
                  ? (contract.blockchain_hash ? "✓ Signé sur Blockchain" : "✓ Signé")
                  : contract.status === "pending_acceptance"
                    ? "En attente d'acceptation"
                    : contract.status === "pending_counterparty"
                      ? "En attente de contrepartie"
                      : contract.status === "purchased"
                        ? "Acheté - Assigner une contrepartie"
                        : "Brouillon"}
              </span>

              {/* Only show agreement status if counterparty is assigned */}
              {contract.counterparty_id && (
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
              )}

              {/* Transaction Hash Mini Badge */}
              {contract.blockchain_hash && (
                <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-500/50 rounded-full text-xs font-mono text-indigo-200">
                  TX: {contract.blockchain_hash.slice(0, 8)}...
                </span>
              )}
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
                  <>
                    {hasUnsavedChanges && (
                      <span className="text-yellow-300 text-sm">Modifications non sauvegardées</span>
                    )}
                    {!hasUnsavedChanges && (
                      <span className="text-green-300 text-sm">Sauvegardé</span>
                    )}
                  </>
                )}
                {!isSigned && !canEdit && (
                  <span className="text-purple-300 text-sm">Mode lecture</span>
                )}
              </div>
            </div>

            {isSigned && (
              <div className="mb-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-yellow-200 text-sm">
                Ce contrat est signé et ne peut plus être modifié.
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
              {/* Save Changes Button - show when editing */}
              {canEdit && (
                <button
                  onClick={saveContract}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </button>
              )}

              {/* Only show accept button if counterparty is assigned and user hasn't agreed yet */}
              {!isSigned && !userHasAgreed && contract.counterparty_id && (
                <button
                  onClick={acceptContract}
                  disabled={isAccepting}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAccepting ? "Traitement..." : "J'accepte ce contrat"}
                </button>
              )}

              {/* Revoke Agreement Button - show when user has agreed but contract not fully signed */}
              {!isSigned && userHasAgreed && contract.counterparty_id && (
                <button
                  onClick={revokeAgreement}
                  disabled={isRevoking}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRevoking ? "Révocation..." : "⚠ Révoquer mon accord"}
                </button>
              )}

              {/* Show message if no counterparty assigned yet */}
              {!contract.counterparty_id && isInitiator && (
                <div className="px-6 py-3 bg-yellow-500/20 border border-yellow-500/50 text-yellow-200 rounded-lg font-semibold">
                  ⚠ Assignez une contrepartie avant d'accepter
                </div>
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

              {isSigned && !contract.blockchain_hash && isInitiator && (
                <button
                  onClick={handleBlockchainSign}
                  disabled={isBlockchainLoading}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Wallet size={20} />
                  {isBlockchainLoading ? "Signature en cours..." : "Signer sur Blockchain"}
                </button>
              )}
            </div>

            {/* Blockchain status panel */}
            {contract.blockchain_hash && (
              <div className="mt-6 bg-indigo-950/40 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">✓ Enregistré sur la blockchain</div>
                    <div className="text-sm text-purple-200 mt-1">
                      {typeof contract.chain_id !== 'undefined' && contract.chain_id !== null && (
                        <div>Chain ID: <span className="font-mono">{contract.chain_id}</span></div>
                      )}
                      {typeof contract.registration_cost_eth !== 'undefined' && contract.registration_cost_eth !== null && (
                        <div>Coût d'enregistrement estimé: <span className="font-mono">{contract.registration_cost_eth.toFixed ? contract.registration_cost_eth.toFixed(6) : contract.registration_cost_eth} ETH</span></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        // Try to build a reasonable explorer URL for common networks; fallback to alert
                        let url: string | null = null;
                        const tx = contract.blockchain_hash as string;
                        const chainId = contract.chain_id as number | null;
                        if (chainId === 1) url = `https://etherscan.io/tx/${tx}`;
                        else if (chainId === 11155111) url = `https://sepolia.etherscan.io/tx/${tx}`;
                        // Add more explorers here if needed (e.g., Ronin)
                        if (url) {
                          window.open(url, '_blank');
                        } else {
                          alert(`Transaction Hash: ${tx}`);
                        }
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                    >
                      <ExternalLink size={18} /> Voir sur Blockchain
                    </button>
                  </div>
                </div>
                <div className="text-xs text-purple-300 font-mono break-all mt-2">
                  TX: {contract.blockchain_hash}
                </div>
              </div>
            )}
          </div>


        </div>
      </div>
    </div >
  );
}
