import { NextRequest, NextResponse } from "next/server";

// Route handlers run server-side, so use API_URL (defined in Docker) or fallback
const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://gateway:8000';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params;
  const cookieHeader = req.headers.get("cookie");

  try {
    const url = `${GATEWAY_URL}/contracts/${contractId}`;
    console.log(`[API Route] Fetching contract ${contractId} from ${url}`);
    console.log(`[API Route] GATEWAY_URL: ${GATEWAY_URL}, API_URL: ${process.env.API_URL}, NEXT_PUBLIC_API_URL: ${process.env.NEXT_PUBLIC_API_URL}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    console.log(`[API Route] Response status: ${response.status} for contract ${contractId}`);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
      console.error("Contract fetch error:", response.status, errorData);
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || `Failed to fetch contract (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Contract fetched successfully:", data?.id);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Contract fetch error:", error);
    return NextResponse.json(
      { error: `Erreur interne lors de la récupération du contrat: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

