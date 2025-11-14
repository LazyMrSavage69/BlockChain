import { NextRequest, NextResponse } from "next/server";

// Route handlers run server-side, so use API_URL (defined in Docker) or fallback
const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://gateway:8000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  const cookieHeader = req.headers.get("cookie");
  const body = await req.json();

  try {
    const response = await fetch(
      `${GATEWAY_URL}/contracts/${contractId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        },
        body: JSON.stringify(body),
        cache: "no-store",
      }
    );

    const data = await response
      .json()
      .catch(() => ({ error: "Invalid response from backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "Failed to accept contract.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Contract accept error:", error);
    return NextResponse.json(
      { error: "Erreur interne lors de l'acceptation du contrat." },
      { status: 500 }
    );
  }
}

