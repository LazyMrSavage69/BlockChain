"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Navbar from "@/app/navbar/page";

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

  // Convert clauses to HTML for Tiptap
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
      } else if (element.tagName === "P") {
        currentBody += (currentBody ? "\n" : "") + (element.textContent || "");
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Commencez à éditer le contrat...",
      }),
    ],
    content: "",
    editable: true,
    onUpdate: ({ editor }) => {
      // Auto-save could be implemented here
    },
  });

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user && contractId) {
      fetchContract();
    }
  }, [user, contractId]);

  useEffect(() => {
    if (contract && editor) {
      console.log("[ContractViewPage] Setting editor content from contract:", contract);
      const html = clausesToHTML(contract.clauses || []);
      editor.commands.setContent(html);
    }
  }, [contract, editor]);

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
    if (!editor || !contract || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      const html = editor.getHTML();
      const updatedClauses = htmlToClauses(html);

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

  // Disable editor if signed
  useEffect(() => {
    if (editor) {
      editor.setEditable(canEdit);
    }
  }, [editor, canEdit]);

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
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  isSigned
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

          {/* Messages */}
          {error && (
            <div className="bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg p-4">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-900/50 border border-green-500/50 text-green-200 rounded-lg p-4">
              {successMessage}
            </div>
          )}

          {/* Editor */}
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 backdrop-blur-sm border border-purple-500/20 rounded-2xl shadow-2xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Contenu du contrat</h2>
              {!isSigned && (
                <span className="text-purple-300 text-sm">
                  {canEdit ? "Mode édition" : "Mode lecture"}
                </span>
              )}
            </div>

            {isSigned && (
              <div className="mb-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 text-yellow-200 text-sm">
                ⚠️ Ce contrat est signé et ne peut plus être modifié.
              </div>
            )}

            <div className="bg-white rounded-lg p-6 min-h-[500px]">
              <style jsx global>{`
                .ProseMirror {
                  outline: none;
                  min-height: 400px;
                }
                .ProseMirror p {
                  margin: 0.75em 0;
                }
                .ProseMirror h2 {
                  font-size: 1.5em;
                  font-weight: bold;
                  margin-top: 1em;
                  margin-bottom: 0.5em;
                }
                .ProseMirror h3 {
                  font-size: 1.25em;
                  font-weight: bold;
                  margin-top: 0.75em;
                  margin-bottom: 0.5em;
                }
                .ProseMirror ul,
                .ProseMirror ol {
                  padding-left: 1.5em;
                  margin: 0.75em 0;
                }
                .ProseMirror li {
                  margin: 0.25em 0;
                }
                .ProseMirror strong {
                  font-weight: bold;
                }
                .ProseMirror em {
                  font-style: italic;
                }
                .ProseMirror code {
                  background-color: #f4f4f4;
                  padding: 0.2em 0.4em;
                  border-radius: 3px;
                  font-family: monospace;
                }
                .ProseMirror pre {
                  background-color: #f4f4f4;
                  padding: 1em;
                  border-radius: 5px;
                  overflow-x: auto;
                }
                .ProseMirror blockquote {
                  border-left: 3px solid #ccc;
                  padding-left: 1em;
                  margin: 1em 0;
                  font-style: italic;
                }
                .ProseMirror[contenteditable="false"] {
                  background-color: #f9f9f9;
                  cursor: not-allowed;
                }
                .ProseMirror .is-empty::before {
                  content: attr(data-placeholder);
                  float: left;
                  color: #adb5bd;
                  pointer-events: none;
                  height: 0;
                }
              `}</style>
              <EditorContent editor={editor} />
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4 flex-wrap">
              {canEdit && (
                <button
                  onClick={saveContract}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Sauvegarde..." : "Sauvegarder les modifications"}
                </button>
              )}

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

