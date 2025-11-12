import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");

  try {
    const response = await fetch(`${GATEWAY_URL}/friends`, {
      method: "GET",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ error: "Invalid response from backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "Failed to fetch friends from backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Friends - error fetching:", error);
    return NextResponse.json(
      { error: "Internal error while fetching friends." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const body = await req.json();

  try {
    const response = await fetch(`${GATEWAY_URL}/friends/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await response
      .json()
      .catch(() => ({ error: "Invalid response from backend." }));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: data?.error || "Failed to send invitation from backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Friends - error sending invitation:", error);
    return NextResponse.json(
      { error: "Internal error while sending invitation." },
      { status: 500 },
    );
  }
}

