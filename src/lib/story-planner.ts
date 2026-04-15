import { callLLM } from "./llm";

export interface StoryScene {
  sceneNumber: number;
  title: string;
  description: string;
  startFramePrompt: string;
  endFramePrompt: string;
  videoMotionPrompt: string;
  audioPrompt?: string;
  negativePrompt?: string;
  cameraAngle: string;
  mood: string;
  duration: number;
}

export interface StoryPlan {
  title: string;
  style: string;
  characters: string[];
  scenes: StoryScene[];
}

export interface LLMKeys {
  fireworksKey?: string;
  fireworksModel?: string;
  openrouterKey?: string;
  openrouterModel?: string;
}

/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  SYSTEM PROMPT — пайплайн апрель 2026, SOTA-модели
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Ключевое отличие от предыдущей версии:
 * 1) Frame Chaining — endFrame[N] = startFrame[N+1]
 * 2) State-change prompting вместо camera jargon
 * 3) Min 5 sec per scene
 */
const SYSTEM_PROMPT = `Ты — профессиональный кинорежиссёр и сторибоардист, эксперт по AI-генерации видео (апрель 2026).

═══════════════════════════════════════════
PIPELINE: ОТ ИДЕИ ДО ВИДЕО
═══════════════════════════════════════════

Шаг 1 (ты). Создаёшь сторибоард — массив сцен.
Шаг 2. Text-to-image модель генерирует статичные кадры по твоим промптам.
Шаг 3. Image-to-video модель (Seedance 2.0 / Kling 3.0 / Veo 3.1) получает
       ПЕРВЫЙ КАДР и ПОСЛЕДНИЙ КАДР и генерирует плавный видеопереход.

═══════════════════════════════════════════
ПРАВИЛО ЦЕПОЧКИ (CHAIN RULE) — САМОЕ ВАЖНОЕ
═══════════════════════════════════════════

Сцены — НЕПРЕРЫВНАЯ ЦЕПОЧКА:
  Scene 1: startFramePrompt → действие → endFramePrompt
  Scene 2: startFramePrompt = ДОСЛОВНАЯ КОПИЯ endFramePrompt сцены 1 → действие → endFramePrompt
  Scene 3: startFramePrompt = ДОСЛОВНАЯ КОПИЯ endFramePrompt сцены 2 → ...

• startFramePrompt сцены N (при N > 1) = ИДЕНТИЧЕН endFramePrompt сцены N-1.
  Копируй ДОСЛОВНО — это ОДИН И ТОТ ЖЕ КАДР.
• Только у Scene 1 startFramePrompt уникален.

═══════════════════════════════════════════
ПЕРСОНАЖИ — "IDENTITY BLOCK"
═══════════════════════════════════════════

В characters[] — ТОЧНОЕ описание каждого персонажа на английском.
Это "Identity Block" — текст который КОПИРУЕТСЯ ДОСЛОВНО в каждый промпт.

Формат Identity Block:
"[Name], [age], [face shape], [hair: color+length+style], [skin tone], 
[clothing: top+bottom+accessories], [distinguishing features]"

Пример:
"Mina, 28, oval face, short black bob cut, olive skin, wearing khaki utility 
jacket over white t-shirt, dark jeans, small silver hoop earrings, warm brown eyes"

ПРАВИЛА:
• НЕ ПЕРЕПИСЫВАЙ Identity Block — копируй ОДИНАКОВО в каждый кадр.
• Описывай конкретные детали: "short black bob" а не "dark hair".
• Одежда и аксессуары — якоря для identity, описывай подробно.

═══════════════════════════════════════════
videoMotionPrompt — ФОРМАТ ПО ШОТАМ
═══════════════════════════════════════════

Видео-модели (Seedance, Kling, Veo) понимают два формата:

ФОРМАТ 1 — SHOT-BY-SHOT (для сложных сцен с действием):
Каждый шот: [Камера]. [Действие с деталями внешности и окружения].

Пример (5 сек, 2 шота):
"Shot 1: Medium shot, slight Dutch angle. A small orange tabby kitten with 
a green bell collar stands on the edge of a white cruise ship deck, wind 
ruffling its fur, looking down at the deep blue ocean far below. The camera 
slowly pushes forward.
Shot 2: Low-angle tracking shot following the fall. The kitten tips forward 
and plummets off the railing, paws spread wide in surprise, the white hull 
rushing past as the camera follows the descent toward the churning water."

ФОРМАТ 2 — TIMELINE (для длинных сцен 8+ сек):
"[0s-3s]: Wide establishing shot. Empty mountain road at dawn. Slow push-in.
[3s-6s]: Cut to medium shot. Motorcyclist appears, approaching slowly.
[6s-8s]: Close-up on rider's gloved hand gripping throttle. Rack focus to face."

ФОРМАТ 3 — SIMPLE TRANSITION (для простых трансформаций):
"Room slowly fills from empty state to fully organized with furniture. 
Camera is fixed, timelapse style."

ПРАВИЛА videoMotionPrompt:
• 100-260 слов — оптимальная длина. Слишком короткий = размытый результат.
• Описывай ДЕЙСТВИЕ и ИЗМЕНЕНИЕ, не статику.
• Указывай конкретные детали: цвета, текстуры, движение камеры.
• Включай Identity Block персонажа в первом упоминании.
• Добавляй quality suffix: "4K, cinematic lighting, stable picture"
• Добавляй constraints: "maintain character identity, no face morphing"
• НЕ пиши абстрактные слова: "beautiful", "stunning", "epic".
• Для сложных сцен — 2-3 шота. Для простых — 1 предложение.

═══════════════════════════════════════════
АУДИО И НЕГАТИВНЫЕ ПРОМПТЫ (ОПЦИОНАЛЬНО)
═══════════════════════════════════════════

Для видео можно добавить "audioPrompt" (звуковое сопровождение):
"Sound of heavy rain hitting metallic surface, distant sirens, wind howling"

И "negativePrompt" (для удаления артефактов):
"face morphing, changing clothes, text, watermark, bad anatomy, deformed"

═══════════════════════════════════════════
ПРОМПТЫ КАДРОВ (IMAGE PROMPTS)
═══════════════════════════════════════════

1. Язык: СТРОГО АНГЛИЙСКИЙ.
2. Каждый промпт — САМОДОСТАТОЧНЫЙ (модель не видит других кадров).
3. Включай ПОЛНЫЙ Identity Block персонажа В КАЖДЫЙ промпт.
4. Описывай КОНКРЕТНОЕ СОСТОЯНИЕ: где стоит, что делает, какая поза.
5. Start и End должны показывать ЧЁТКУЮ визуальную разницу.
6. Добавляй стиль (поле style) в начало каждого промпта.

═══════════════════════════════════════════
ДЛИТЕЛЬНОСТИ
═══════════════════════════════════════════

• МИНИМУМ 5 секунд на сцену (иначе переход будет дёрганым)
• МАКСИМУМ 12 секунд
• Оптимально: 5-8 секунд
• Итого: 25-40 секунд

═══════════════════════════════════════════
ЯЗЫК ВЫВОДА
═══════════════════════════════════════════

• title — русский
• scenes[].title и description — русский
• style, characters[], все промпты — АНГЛИЙСКИЙ
• cameraAngle, mood — из enum'ов

ФОРМАТ: Ответь ТОЛЬКО валидным JSON. Без markdown, без комментариев.`;

const SCENE_SCHEMA = {
  type: "object" as const,
  properties: {
    title: {
      type: "string" as const,
      description: "Название истории на русском",
    },
    style: {
      type: "string" as const,
      description:
        "Визуальный стиль на АНГЛИЙСКОМ. Техничный, не абстрактный. Пример: 'Pixar-style 3D animation, soft diffused lighting, warm color palette'",
    },
    characters: {
      type: "array" as const,
      items: { type: "string" as const },
      description:
        "Список персонажей. Каждый — ПОЛНОЕ описание НА АНГЛИЙСКОМ: возраст, внешность, одежда, отличительные черты. Этот текст будет дословно копироваться в промпты кадров.",
    },
    scenes: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          sceneNumber: { type: "integer" as const },
          title: {
            type: "string" as const,
            description: "Короткое название сцены на русском (2-5 слов)",
          },
          description: {
            type: "string" as const,
            description:
              "Что происходит в сцене — на русском, 1-2 предложения",
          },
          startFramePrompt: {
            type: "string" as const,
            description:
              "Промпт первого кадра НА АНГЛИЙСКОМ. Для сцены N>1 — ДОСЛОВНАЯ КОПИЯ endFramePrompt предыдущей сцены. Для сцены 1 — уникальный самодостаточный промпт.",
          },
          endFramePrompt: {
            type: "string" as const,
            description:
              "Промпт последнего кадра НА АНГЛИЙСКОМ. Показывает РЕЗУЛЬТАТ действия — визуально отличается от startFramePrompt. Этот же текст станет startFramePrompt следующей сцены.",
          },
          videoMotionPrompt: {
            type: "string" as const,
            description:
              "Промпт для видео-модели НА АНГЛИЙСКОМ. Три формата: (1) Shot-by-shot: 'Shot 1: Medium shot. Kitten on deck... Shot 2: Tracking shot. Kitten falls...' (2) Timeline: '[0s-3s]: Wide shot... [3s-6s]: Cut to...' (3) Simple: 'Room fills with furniture. Fixed camera, timelapse.' 100-260 слов оптимально. Включай Identity Block, quality suffix '4K, stable picture', и constraints 'maintain character identity'. НЕ ПИШИ abstract words.",
          },
          audioPrompt: {
            type: "string" as const,
            description:
              "Звуковой промпт НА АНГЛИЙСКОМ. Опиши окружение и SFX, например: 'heavy rain, distant sirens, harsh breathing'. Оставь пустым, если звук не нужен.",
          },
          negativePrompt: {
            type: "string" as const,
            description:
              "Негативный промпт НА АНГЛИЙСКОМ (обычно: 'face morphing, changing clothes, text, watermark, bad anatomy').",
          },
          cameraAngle: {
            type: "string" as const,
            enum: [
              "wide shot",
              "close-up",
              "medium shot",
              "tracking shot",
              "overhead",
              "low angle",
              "dutch angle",
              "panning",
            ],
          },
          mood: {
            type: "string" as const,
            enum: [
              "dramatic",
              "peaceful",
              "humorous",
              "tense",
              "adventurous",
              "melancholic",
              "joyful",
              "mysterious",
            ],
          },
          duration: {
            type: "integer" as const,
            minimum: 5,
            maximum: 12,
            description:
              "Длительность клипа в секундах (5-12). Минимум 5 секунд!",
          },
        },
        required: [
          "sceneNumber",
          "title",
          "description",
          "startFramePrompt",
          "endFramePrompt",
          "videoMotionPrompt",
          "cameraAngle",
          "mood",
          "duration",
        ],
      },
    },
  },
  required: ["title", "style", "characters", "scenes"],
};

export async function planStory(
  idea: string,
  style: string = "Кинематограф",
  sceneCount: number = 4,
  llmKeys: LLMKeys = {}
): Promise<StoryPlan> {
  const userPrompt = `Идея: "${idea}"

Визуальный стиль (пожелание): ${style}
Количество сцен: ${sceneCount}
Целевая длительность: 25-40 секунд (по 5-8 секунд на сцену).

ОБЯЗАТЕЛЬНО:
1. startFramePrompt сцены 2 = дословная копия endFramePrompt сцены 1.
   startFramePrompt сцены 3 = дословная копия endFramePrompt сцены 2.
   И так далее. Это ЦЕПОЧКА.
2. Минимум 5 секунд на каждую сцену.
3. videoMotionPrompt — ПРОСТОЕ описание что меняется. Не пиши camera jargon.
4. Все промпты кадров включают полное описание персонажей.`;

  const raw = await callLLM({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt,
    jsonSchema: SCENE_SCHEMA,
    temperature: 0.75,
    maxTokens: 4096,
    ...llmKeys,
  });

  // Extract JSON from possible wrappers
  let jsonStr = raw.trim();

  // Strip ```json``` wrapper
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  // Strip <think>...</think> (Qwen, DeepSeek)
  const thinkMatch = jsonStr.match(/<\/think>\s*([\s\S]*)/);
  if (thinkMatch) {
    jsonStr = thinkMatch[1].trim();
  }

  // Find JSON object boundaries
  const braceStart = jsonStr.indexOf("{");
  const braceEnd = jsonStr.lastIndexOf("}");
  if (braceStart >= 0 && braceEnd > braceStart) {
    jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
  }

  const parsed = JSON.parse(jsonStr) as StoryPlan;

  if (!parsed.scenes || !Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error("Некорректный формат: пустой или отсутствующий массив scenes");
  }

  // Normalize scene numbers
  parsed.scenes.forEach((scene, i) => {
    scene.sceneNumber = i + 1;
  });

  // Enforce chain rule: scene[N].startFramePrompt = scene[N-1].endFramePrompt
  // Even if the LLM didn't follow instructions perfectly, we force it here
  for (let i = 1; i < parsed.scenes.length; i++) {
    parsed.scenes[i].startFramePrompt = parsed.scenes[i - 1].endFramePrompt;
  }

  // Enforce minimum duration
  parsed.scenes.forEach((scene) => {
    if (scene.duration < 5) scene.duration = 5;
    if (scene.duration > 12) scene.duration = 12;
  });

  return parsed;
}
