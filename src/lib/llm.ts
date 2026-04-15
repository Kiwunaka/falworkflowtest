import OpenAI from "openai";

export interface LLMOptions {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  // Allow per-request key/model overrides (from browser settings)
  fireworksKey?: string;
  fireworksModel?: string;
  openrouterKey?: string;
  openrouterModel?: string;
}

export interface VisionOptions {
  imageUrl: string;
  prompt: string;
  maxTokens?: number;
  fireworksKey?: string;
  fireworksModel?: string;
}

/**
 * Validate and clean API key: ignore placeholders from .env.local
 */
function cleanApiKey(key?: string): string | undefined {
  if (!key || key.includes("your_") || key.includes("_here")) {
    return undefined;
  }
  return key;
}

/**
 * Resolve API keys: prefer request-level (from browser) → .env.local
 */
function getFireworksClient(apiKey?: string) {
  const key = cleanApiKey(apiKey) || cleanApiKey(process.env.FIREWORKS_API_KEY);
  return new OpenAI({
    apiKey: key || "",
    baseURL: "https://api.fireworks.ai/inference/v1",
  });
}

function getOpenRouterClient(apiKey?: string) {
  const key = cleanApiKey(apiKey) || cleanApiKey(process.env.OPENROUTER_API_KEY);
  return new OpenAI({
    apiKey: key || "",
    baseURL: "https://openrouter.ai/api/v1",
  });
}

/**
 * Call LLM with Fireworks AI (primary) → OpenRouter (fallback).
 * Supports structured JSON output via json_schema.
 */
export async function callLLM(options: LLMOptions): Promise<string> {
  const {
    systemPrompt,
    userPrompt,
    jsonSchema,
    temperature = 0.7,
    maxTokens = 4096,
    fireworksKey,
    fireworksModel,
    openrouterKey,
    openrouterModel,
  } = options;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // If using JSON, ensure the word "JSON" is in the prompt for better compatibility
  if (jsonSchema || options.jsonSchema) {
    messages[0].content += "\n\nCRITICAL: You must return ONLY valid JSON that matches the provided schema.";
  }

  const model =
    fireworksModel ||
    cleanApiKey(process.env.FIREWORKS_MODEL) ||
    "accounts/fireworks/routers/kimi-k2p5-turbo";

  const requestBody: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    ...(jsonSchema
      ? {
          response_format: {
            type: "json_schema" as const,
            json_schema: {
              name: "response",
              strict: false, // Set to false for better compatibility with routers
              schema: jsonSchema,
            },
          },
        }
      : { response_format: { type: "json_object" as const } }),
  };

  let lastError: any = null;

  // Try Fireworks AI first
  const fwKey = cleanApiKey(fireworksKey) || cleanApiKey(process.env.FIREWORKS_API_KEY);
  if (fwKey) {
    try {
      const client = getFireworksClient(fwKey);
      const response = await client.chat.completions.create(requestBody);
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Пустой ответ от Fireworks AI");
      return content;
    } catch (fireworksError: any) {
      lastError = fireworksError;
      console.error("Fireworks AI ошибка:", fireworksError?.message || fireworksError);
      // If it's an auth error and we have no fallback key, don't even try fallback
      if (fireworksError?.status === 401 && !cleanApiKey(openrouterKey) && !cleanApiKey(process.env.OPENROUTER_API_KEY)) {
        throw new Error(`Ошибка авторизации Fireworks AI: ${fireworksError.message}. Убедитесь, что API ключ верный.`);
      }
    }
  }

  // Fallback to OpenRouter
  const orKey = cleanApiKey(openrouterKey) || cleanApiKey(process.env.OPENROUTER_API_KEY);
  if (orKey) {
    try {
      const client = getOpenRouterClient(orKey);
      const openrouterBody = {
        ...requestBody,
        model:
          openrouterModel ||
          cleanApiKey(process.env.OPENROUTER_MODEL) ||
          "qwen/qwen3-30b",
      };
      const response = await client.chat.completions.create(openrouterBody);
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("Пустой ответ от OpenRouter");
      return content;
    } catch (openrouterError: any) {
      lastError = openrouterError;
      console.error("OpenRouter ошибка:", openrouterError?.message || openrouterError);
    }
  }

  // If we reach here, either both failed or no keys were provided
  const errorMessage = lastError?.message || "Не удалось получить ответ от AI провайдеров.";
  if (!fwKey && !orKey) {
    throw new Error("API ключи не настроены. Перейдите в Настройки и введите ключ для Fireworks AI или OpenRouter.");
  }
  
  throw new Error(`Ошибка LLM: ${errorMessage}. Проверьте ключи и лимиты в настройках.`);
}

/**
 * Analyze an image using Fireworks AI vision (Kimi K2.5 or similar).
 * Used to describe generated frames for better consistency between scenes.
 */
export async function analyzeImage(options: VisionOptions): Promise<string> {
  const {
    imageUrl,
    prompt,
    maxTokens = 1024,
    fireworksKey,
    fireworksModel,
  } = options;

  const fwKey = cleanApiKey(fireworksKey) || cleanApiKey(process.env.FIREWORKS_API_KEY);
  if (!fwKey) {
    throw new Error("API ключ Fireworks AI не настроен для Vision-анализа.");
  }

  const client = getFireworksClient(fwKey);

  // Use the same model — Kimi K2.5 supports multimodal natively
  const model =
    fireworksModel ||
    cleanApiKey(process.env.FIREWORKS_MODEL) ||
    "accounts/fireworks/routers/kimi-k2p5-turbo";

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: maxTokens,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Пустой ответ vision");
  return content;
}
