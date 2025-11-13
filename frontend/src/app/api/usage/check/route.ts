import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");

  let body: { userEmail: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  if (!body.userEmail) {
    return NextResponse.json(
      { error: "userEmail is required" },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/api/subscriptions/usage/check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ userEmail: body.userEmail }),
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ error: "Réponse invalide du backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error || "La vérification de l'usage a échoué côté backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Usage check - erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la vérification de l'usage." },
      { status: 500 },
    );
  }
}




