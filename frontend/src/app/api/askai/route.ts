import { NextRequest, NextResponse } from "next/server";

interface AskAiPayload {
  contractType: string;
  projectName: string;
  governingLaw: string;
  partiesDescription: string;
  obligations: string;
  deliverables?: string;
  paymentTerms: string;
  duration: string;
  confidentiality: boolean;
  disputeResolution: string;
  requesterName?: string;
  requesterEmail?: string;
}

// ✅ Utilisez AIML API avec un modèle puissant (Claude, GPT, ou Gemini via AIML)
// Modèles valides: claude-3-7-sonnet-20250219, claude-sonnet-4-5-20250929, gpt-4o, gemini-2.5-flash, etc.
const AI_MODEL = process.env.AI_MODEL_ID || "anthropic/claude-3.7-sonnet"; // Modèle Claude récent et puissant
// ✅ AIML API utilise une structure compatible OpenAI
const AIML_API_ENDPOINT = "https://api.aimlapi.com/v1/chat/completions";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Clé AI_API_KEY manquante. Ajoutez-la dans .env.local ou .env.production (côté frontend).",
      },
      { status: 500 },
    );
  }

  let payload: AskAiPayload;

  try {
    payload = (await req.json()) as AskAiPayload;
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const {
    contractType,
    projectName,
    governingLaw,
    partiesDescription,
    obligations,
    deliverables = "",
    paymentTerms,
    duration,
    confidentiality,
    disputeResolution,
    requesterName = "Partie A",
    requesterEmail = "",
  } = payload;

  const systemInstruction = `Tu es un assistant juridique expert en rédaction de contrats intelligents pour la blockchain.

⚠️ RÈGLE ABSOLUE: Ta réponse doit être UNIQUEMENT du JSON valide. Pas de texte avant, pas de texte après, pas de markdown (\`\`\`json), pas d'explication.

Structure JSON EXACTE à retourner:
{
  "title": "Titre du contrat",
  "summary": "Résumé du contrat en 2-3 phrases",
  "clauses": [
    {
      "title": "Article 1 : Titre de la clause",
      "body": "Contenu détaillé de la clause avec tous les détails juridiques nécessaires"
    }
  ],
  "suggestions": [
    "Suggestion ou point d'attention 1",
    "Suggestion ou point d'attention 2"
  ]
}

Exigences:
- Tous les textes en français
- Clauses précises, applicables juridiquement
- Adaptées à une implémentation blockchain/smart contract
- Au minimum 5-8 clauses détaillées et professionnelles
- COMMENCE directement par { et termine par }
- Aucun texte explicatif en dehors du JSON`;

  const userPrompt = `Rédige un projet de contrat intelligent blockchain complet avec les informations suivantes:

📋 INFORMATIONS DU CONTRAT:
• Type de contrat: ${contractType}
• Nom du projet: ${projectName}
• Juridiction applicable: ${governingLaw}

👥 PARTIES IMPLIQUÉES:
${partiesDescription}

📝 OBLIGATIONS PRINCIPALES:
${obligations}

🎯 LIVRABLES / TOKENOMICS:
${deliverables || "Non spécifié"}

💰 CONDITIONS FINANCIÈRES:
${paymentTerms}

⏱️ DURÉE ET RÉSILIATION:
${duration}

🔒 CONFIDENTIALITÉ: ${confidentiality ? "Clause stricte requise" : "Non requise"}

⚖️ RÉSOLUTION DES LITIGES: ${disputeResolution}

👤 DEMANDEUR: ${requesterName}${requesterEmail ? ` (${requesterEmail})` : ""}

Le contrat doit être exploitable pour une implémentation en smart contract (Solidity/Rust).
Génère un contrat professionnel, détaillé et juridiquement solide.`;

  // Helper function to make fetch with retry and timeout
  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries = 3,
    timeout = 60000
  ): Promise<Response> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          // Add keepalive and other options for better connection handling
          keepalive: true,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isTimeout = error.name === 'AbortError';
        const isConnectionError =
          error.code === 'ECONNRESET' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('fetch failed') ||
          error.message?.includes('socket disconnected');

        console.error(`Tentative ${attempt}/${maxRetries} échouée:`, error.message || error);

        if (isLastAttempt) {
          throw error;
        }

        // Exponential backoff: wait longer between retries
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Nouvelle tentative dans ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Toutes les tentatives ont échoué');
  };

  try {
    const aiResponse = await fetchWithRetry(
      AIML_API_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "User-Agent": "Ethéré-Platform/1.0",
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            {
              role: "system",
              content: systemInstruction,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 8192,
        }),
      },
      3, // maxRetries
      90000 // timeout: 90 seconds
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Erreur AIML API:", aiResponse.status, errorText);

      let userMsg = `La génération du contrat a échoué côté AI (Status: ${aiResponse.status}).`;

      if (aiResponse.status === 429) {
        userMsg = "Limite de quota API atteinte (429). Veuillez réessayer plus tard ou vérifier votre forfait AIML.";
      } else if (aiResponse.status === 401) {
        userMsg = "Clé API invalide ou non autorisée (401). Vérifiez la configuration AI_API_KEY.";
      } else if (aiResponse.status === 503 || aiResponse.status === 504) {
        userMsg = "Service AI temporairement indisponible. Veuillez réessayer.";
      }

      return NextResponse.json(
        {
          error: userMsg,
          details: errorText,
        },
        { status: aiResponse.status },
      );
    }

    const data = await aiResponse.json();

    // AIML API utilise la structure OpenAI: choices[0].message.content
    const candidateText = data?.choices?.[0]?.message?.content ?? "";

    if (!candidateText) {
      return NextResponse.json(
        { error: "Réponse vide de l'API AI. Réessayez avec plus de contexte." },
        { status: 422 },
      );
    }

    let contractPayload: any;
    try {
      let cleanText = candidateText.trim();
      cleanText = cleanText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
      const firstBrace = cleanText.indexOf("{");
      const lastBrace = cleanText.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanText = cleanText.substring(firstBrace, lastBrace + 1);
      }
      contractPayload = JSON.parse(cleanText);

      if (
        !contractPayload.title ||
        !contractPayload.summary ||
        !Array.isArray(contractPayload.clauses)
      ) {
        throw new Error("Structure JSON invalide");
      }
    } catch (parseError) {
      console.warn("Impossible de parser le JSON AI:", parseError);
      console.warn("Texte reçu:", candidateText);

      contractPayload = {
        title: contractType,
        summary:
          "Contrat généré mais non analysé correctement. Vérifiez le texte brut ci-dessous.",
        clauses: [
          {
            title: "Contenu brut",
            body: "Le contrat a été généré mais la structure JSON n'a pas pu être parsée correctement.",
          },
        ],
        suggestions: [
          "Réessayez la génération pour obtenir un format correct",
        ],
        rawText: candidateText,
      };
    }

    return NextResponse.json({ contract: contractPayload });
  } catch (error: unknown) {
    console.error("Erreur lors de l'appel AIML API:", error);

    // Provide more specific error messages
    let errorMessage = "Erreur interne lors de la communication avec l'API AI.";
    let errorDetails = error instanceof Error ? error.message : "Erreur inconnue";

    if (error instanceof Error) {
      if (error.message.includes('ECONNRESET') || error.message.includes('socket disconnected')) {
        errorMessage = "Connexion interrompue avec l'API AI. Vérifiez votre connexion réseau.";
        errorDetails = "La connexion TLS a été réinitialisée. Cela peut être dû à un problème réseau ou à un timeout.";
      } else if (error.message.includes('timeout') || error.name === 'AbortError') {
        errorMessage = "Timeout lors de l'appel à l'API AI. La requête a pris trop de temps.";
        errorDetails = "Le délai d'attente de 90 secondes a été dépassé.";
      } else if (error.message.includes('fetch failed')) {
        errorMessage = "Impossible de se connecter à l'API AI.";
        errorDetails = "Vérifiez votre connexion internet et que l'API AIML est accessible.";
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = "Clé API invalide ou expirée.";
        errorDetails = "Vérifiez que votre AI_API_KEY est correcte dans .env.production.";
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        retry: true, // Indicate that the user can retry
      },
      { status: 500 },
    );
  }
}
