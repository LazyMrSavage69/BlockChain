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

// ✅ Utilisez gemini-2.5-flash (meilleur pour votre cas)
const GEMINI_MODEL = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash";
// ✅ API v1 au lieu de v1beta
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Clé GEMINI_API_KEY manquante. Ajoutez-la dans .env.local ou .env.production (côté frontend).",
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

  try {
    const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemInstruction },
              { text: userPrompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Erreur Gemini:", geminiResponse.status, errorText);
      return NextResponse.json(
        {
          error: "La génération du contrat a échoué côté Gemini.",
          details: errorText,
        },
        { status: geminiResponse.status },
      );
    }

    const data = await geminiResponse.json();

    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      data?.candidates?.[0]?.output ??
      "";

    if (!candidateText) {
      return NextResponse.json(
        { error: "Réponse vide de Gemini. Réessayez avec plus de contexte." },
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
      console.warn("Impossible de parser le JSON Gemini:", parseError);
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
    console.error("Erreur lors de l'appel Gemini:", error);
    return NextResponse.json(
      {
        error: "Erreur interne lors de la communication avec Gemini.",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
