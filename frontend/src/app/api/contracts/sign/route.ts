import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://gateway-service:8000";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/contracts/signed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      credentials: "include",
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ error: "Réponse invalide du backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            "L'enregistrement du contrat a échoué côté backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Contrat - erreur d'enregistrement:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la sauvegarde du contrat." },
      { status: 500 },
    );
  }
}

