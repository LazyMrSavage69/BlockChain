import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const limit = Math.min(
    Number.parseInt(searchParams.get("limit") ?? "5", 10) || 5,
    20,
  );

  if (!query) {
    return NextResponse.json({ users: [] });
  }

  try {
    const upstreamUrl = new URL("/api/users/search", GATEWAY_URL);
    upstreamUrl.searchParams.set("query", query);
    upstreamUrl.searchParams.set("limit", limit.toString());

    const cookieHeader = req.headers.get("cookie");

    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ users: [], error: "Invalid upstream response" }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            "La recherche d'utilisateurs a échoué côté service d'authentification.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Recherche utilisateurs - erreur proxy:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la recherche d'utilisateurs." },
      { status: 500 },
    );
  }
}

