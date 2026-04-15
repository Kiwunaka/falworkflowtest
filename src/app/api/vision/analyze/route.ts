import { NextRequest, NextResponse } from "next/server";
import { analyzeImage } from "@/lib/llm";

/**
 * POST /api/vision/analyze
 * 
 * Analyzes a generated image using Fireworks AI vision (Kimi K2.5).
 * Used in the Story Director pipeline to:
 * - Describe what's in a generated frame (for consistency checks)
 * - Extract character descriptions from start frames
 * - Build context for video motion prompts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, prompt } = body;

    if (!imageUrl || !prompt) {
      return NextResponse.json(
        { error: "imageUrl и prompt обязательны" },
        { status: 400 }
      );
    }

    const fireworksKey = request.headers.get("x-fireworks-key") || undefined;
    const fireworksModel = request.headers.get("x-fireworks-model") || undefined;

    const description = await analyzeImage({
      imageUrl,
      prompt,
      fireworksKey,
      fireworksModel,
    });

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Vision analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка анализа" },
      { status: 500 }
    );
  }
}
