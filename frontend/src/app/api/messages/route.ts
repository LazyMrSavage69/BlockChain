import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://gateway-service:8000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const otherUserId = searchParams.get("otherUserId");
  const cookieHeader = req.headers.get("cookie");

  try {
    let url = `${GATEWAY_URL}/messages/conversations`;
    if (otherUserId) {
      url = `${GATEWAY_URL}/messages/conversation/${otherUserId}`;
    }

    const response = await fetch(url, {
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
          error: data?.error || "Failed to fetch messages from backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Messages - error fetching:", error);
    return NextResponse.json(
      { error: "Internal error while fetching messages." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");
  const body = await req.json();

  try {
    const response = await fetch(`${GATEWAY_URL}/messages`, {
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
          error: data?.error || "Failed to send message from backend.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Messages - error sending:", error);
    return NextResponse.json(
      { error: "Internal error while sending message." },
      { status: 500 },
    );
  }
}

