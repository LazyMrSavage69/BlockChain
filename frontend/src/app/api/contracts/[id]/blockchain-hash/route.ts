import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || "http://gateway-service:8000";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { txHash, paymentTxHash, calculatedPrice, chainId, registrationCostEth } = await request.json();

    // Update contract with blockchain hash and payment info
    const res = await fetch(
      `${GATEWAY_URL}/contracts/${id}/blockchain-hash`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          txHash,
          paymentTxHash,
          calculatedPrice,
          chainId,
          registrationCostEth,
        }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      return NextResponse.json(
        { error: error.message || "Failed to update blockchain hash" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
