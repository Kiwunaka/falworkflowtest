import { NextRequest, NextResponse } from "next/server";
import { planStory } from "@/lib/story-planner";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idea, style, sceneCount } = body;

    if (!idea || typeof idea !== "string") {
      return NextResponse.json(
        { error: "Поле 'idea' обязательно" },
        { status: 400 }
      );
    }

    // Extract optional API keys from browser settings (headers)
    const llmKeys = {
      fireworksKey: request.headers.get("x-fireworks-key") || undefined,
      fireworksModel: request.headers.get("x-fireworks-model") || undefined,
      openrouterKey: request.headers.get("x-openrouter-key") || undefined,
      openrouterModel: request.headers.get("x-openrouter-model") || undefined,
    };

    const plan = await planStory(idea, style, sceneCount || 4, llmKeys);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Story planning error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ошибка планирования" },
      { status: 500 }
    );
  }
}
