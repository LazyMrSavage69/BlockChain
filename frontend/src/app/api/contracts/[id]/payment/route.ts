import { NextRequest, NextResponse } from "next/server";

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

  try {
    const body = await req.json();
    const url = `${GATEWAY_URL}/contracts/${contractId}/payment`;
    
    console.log(`[API Route] Recording payment for contract ${contractId}`);
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error("Payment error:", response.status, errorData);
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || `Failed to record payment (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Payment recorded successfully");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Payment error:", error);
    return NextResponse.json(
      { error: `Erreur interne lors de l'enregistrement du paiement: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}
