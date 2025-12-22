import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://gateway:8000';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  const cookieHeader = req.headers.get("cookie");

  try {
    const body = await req.json();
    const url = `${GATEWAY_URL}/contracts/${contractId}/set-amounts`;
    
    console.log(`[API Route] Setting payment amounts for contract ${contractId}`);
    
    const response = await fetch(url, {
      method: "PUT",
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
      console.error("Set amounts error:", response.status, errorData);
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || `Failed to set payment amounts (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Payment amounts set successfully");
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Set amounts error:", error);
    return NextResponse.json(
      { error: `Erreur interne lors de la définition des montants: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}
