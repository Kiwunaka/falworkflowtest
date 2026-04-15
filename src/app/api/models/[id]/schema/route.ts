import { NextRequest, NextResponse } from "next/server";

const FAL_API_BASE = "https://api.fal.ai/v1/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Decode the model ID (it comes URL-encoded with %2F for /)
  const decodedId = decodeURIComponent(id);

  try {
    const falKey =
      request.headers.get("x-fal-key") ||
      process.env.FAL_KEY ||
      "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(falKey ? { Authorization: `Key ${falKey}` } : {}),
    };

    const searchParams = new URLSearchParams();
    searchParams.set("endpoint_id", decodedId);
    searchParams.set("expand", "openapi-3.0");

    const response = await fetch(
      `${FAL_API_BASE}?${searchParams.toString()}`,
      {
        headers,
        next: { revalidate: 3600 }, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Модель не найдена" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const model = data.models?.[0];

    if (!model) {
      return NextResponse.json(
        { error: "Модель не найдена" },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error("Model schema error:", error);
    return NextResponse.json(
      { error: "Ошибка загрузки схемы модели" },
      { status: 500 }
    );
  }
}
