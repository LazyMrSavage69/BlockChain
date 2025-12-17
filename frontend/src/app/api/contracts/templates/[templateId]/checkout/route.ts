import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://gateway:8000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;
  const cookieHeader = req.headers.get("cookie");

  try {
    const body = await req.json();
    const { userEmail, userId, successUrl, cancelUrl } = body;

    if (!userEmail || !userId || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const url = `${GATEWAY_URL}/contracts/templates/${templateId}/checkout`;
    console.log(`[API Route] Creating checkout for template ${templateId}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        userEmail,
        userId,
        successUrl,
        cancelUrl,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || `Failed to create checkout (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: `Erreur interne lors de la création du checkout: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}


