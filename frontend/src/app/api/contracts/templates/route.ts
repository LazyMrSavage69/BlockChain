import { NextRequest, NextResponse } from "next/server";

const GATEWAY_URL =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://gateway:8000';

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie");

  try {
    const url = `${GATEWAY_URL}/contracts`;
    console.log(`[API Route] Fetching templates from ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          error: errorData?.error || errorData?.message || `Failed to fetch templates (${response.status})`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`[API Route] Fetched ${Array.isArray(data) ? data.length : 0} templates`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Templates fetch error:", error);
    return NextResponse.json(
      { error: `Erreur interne lors de la récupération des templates: ${error instanceof Error ? error.message : 'Erreur inconnue'}` },
      { status: 500 }
    );
  }
}

