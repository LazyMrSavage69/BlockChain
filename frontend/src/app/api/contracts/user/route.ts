import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required" },
      { status: 400 },
    );
  }

  const cookieHeader = req.headers.get("cookie");

  try {
    const response = await fetch(
      `${GATEWAY_URL}/contracts/user/${userId}`,
      {
        method: "GET",
        headers: {
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        cache: "no-store",
      },
    );

    const data = await response
      .json()
      .catch(() => ({ error: "Invalid response from backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error || "Failed to fetch user contracts from backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Contracts - erreur de récupération:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de la récupération des contrats." },
      { status: 500 },
    );
  }
}







