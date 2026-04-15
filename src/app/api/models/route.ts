import { NextRequest, NextResponse } from "next/server";

const FAL_API_BASE = "https://api.fal.ai/v1/models";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "";
  const q = searchParams.get("q") || "";
  const status = searchParams.get("status") || "active";
  const limit = searchParams.get("limit") || "50";
  const cursor = searchParams.get("cursor") || "";
  const expand = searchParams.get("expand") || "";

  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("limit", limit);
  if (cursor) params.set("cursor", cursor);
  if (expand) params.set("expand", expand);

  // Accept FAL key from browser settings (header) or .env.local
  const falKey =
    request.headers.get("x-fal-key") ||
    process.env.FAL_KEY ||
    "";

  if (!falKey || falKey === "your_fal_api_key_here") {
    return NextResponse.json(
      { error: "FAL_KEY не настроен. Введите ключ в Настройках (/settings) или в .env.local" },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${FAL_API_BASE}?${params.toString()}`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Key ${falKey}`,
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("fal.ai models API error:", response.status, errorText);
      return NextResponse.json(
        { error: "Ошибка загрузки моделей", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Models API error:", error);
    return NextResponse.json(
      { error: "Ошибка подключения к fal.ai" },
      { status: 500 }
    );
  }
}
