"use client";

import { useState, useMemo } from "react";
import { fal, createFalWithKey } from "@/lib/fal";
import { ModelSelector } from "@/components/ModelSelector";
import { DynamicModelForm } from "@/components/DynamicModelForm";
import { FalModel } from "@/lib/models";
import { StoryPlan, StoryScene } from "@/lib/story-planner";
import { useSettings, buildApiHeaders } from "@/lib/settings";

// Quality suffix appended to all video prompts for better output
const VIDEO_QUALITY_SUFFIX = "4K, high detail, cinematic lighting, stable picture, smooth motion";
const VIDEO_CONSTRAINTS = "Maintain character identity and outfit. No face morphing or flickering. Consistent lighting.";

type Step = 1 | 2 | 3 | 4;

interface SceneMedia {
  startFrame?: string;
  endFrame?: string;
  videoUrl?: string;
  startLoading?: boolean;
  endLoading?: boolean;
  videoLoading?: boolean;
  error?: string;
  // Vision analysis results
  startFrameDescription?: string;
}

const STYLES = [
  { value: "Pixar-style 3D animation, soft diffused lighting, warm palette", label: "Pixar / 3D Анимация" },
  { value: "Realistic cinematic photography, shallow depth of field, natural lighting", label: "Реалистичное кино" },
  { value: "Studio Ghibli anime style, watercolor textures, soft pastel tones", label: "Аниме (Ghibli)" },
  { value: "Watercolor illustration, loose brushstrokes, soft edges, muted tones", label: "Акварель" },
  { value: "Dark cinematic noir, high contrast, chiaroscuro lighting, desaturated", label: "Нуар" },
  { value: "Vibrant cartoon animation, bold outlines, saturated colors, exaggerated proportions", label: "Мультфильм" },
];

const STEPS_INFO = [
  { num: 1, label: "Идея" },
  { num: 2, label: "Сценарий" },
  { num: 3, label: "Кадры" },
  { num: 4, label: "Видео" },
];

/**
 * Determine video model input params based on endpoint name.
 * Different fal.ai models use different parameter names.
 */
function buildVideoInput(
  model: FalModel,
  scene: StoryScene,
  startFrame: string,
  endFrame?: string
): Record<string, unknown> {
  const endpoint = model.endpoint_id.toLowerCase();
  const durationStr = String(scene.duration);

  // Build the enriched prompt: motion + quality + constraints
  const motionPrompt = scene.videoMotionPrompt;
  let enrichedPrompt = `${motionPrompt} ${VIDEO_QUALITY_SUFFIX}. ${VIDEO_CONSTRAINTS}`;

  // If there's an audio prompt, embed it to ensure the model catches the audio cue
  if (scene.audioPrompt) {
    enrichedPrompt += ` Audio cues: ${scene.audioPrompt}`;
  }

  const input: Record<string, unknown> = {
    prompt: enrichedPrompt,
    duration: durationStr,
  };

  // Add negative prompt explicitly if provided
  if (scene.negativePrompt) {
    input.negative_prompt = scene.negativePrompt;
  }

  // Helper flags for audio models: generate audio by default if supported
  const expectsAudio = true;

  // ═══ Seedance 2.0 / image-to-video (Dedicated Start→End Transition) ═══
  if (endpoint.includes("seedance") && endpoint.includes("image-to-video")) {
    input.image_url = startFrame;
    if (endFrame) input.end_image_url = endFrame;
    input.generate_audio = expectsAudio;
    return input;
  }

  // ═══ Seedance 2.0 / reference-to-video (Reference-based) ═══
  if (endpoint.includes("seedance")) {
    const urls = [startFrame];
    if (endFrame) urls.push(endFrame);
    input.image_urls = urls;
    input.generate_audio = expectsAudio;
    // Wrap with @Image tags for reference model
    if (!enrichedPrompt.includes("@Image1")) {
      input.prompt = `Transition from @Image1 to @Image2: ${enrichedPrompt}`;
    }
    return input;
  }

  // ═══ Kling 3.0: start_image_url + end_image_url ═══
  if (endpoint.includes("kling")) {
    input.start_image_url = startFrame;
    if (endFrame) input.end_image_url = endFrame;
    // Kling typically uses the prompt for audio context, but we can pass a flag if required by their specific schema. Usually it's automatic.
    return input;
  }

  // ═══ Veo 3.1 / first-last-frame-to-video ═══
  if (endpoint.includes("veo") && endpoint.includes("first-last")) {
    input.first_frame_url = startFrame;
    if (endFrame) input.last_frame_url = endFrame;
    return input;
  }

  // ═══ Veo 3.1 standard / Luma / Sora / Wan ═══
  if (endpoint.includes("veo") || endpoint.includes("luma") || 
      endpoint.includes("sora") || endpoint.includes("wan") || 
      endpoint.includes("gen-3")) {
    input.image_url = startFrame;
    return input;
  }

  // ═══ Generic fallback ═══
  input.image_url = startFrame;
  return input;
}

export default function StoryDirectorPage() {
  const { settings } = useSettings();
  const apiHeaders = useMemo(() => buildApiHeaders(settings), [settings]);
  const falClient = useMemo(() => createFalWithKey(settings.falKey), [settings.falKey]);

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [idea, setIdea] = useState("");
  const [style, setStyle] = useState(STYLES[0].value);
  const [sceneCount, setSceneCount] = useState(4);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState("");

  // Step 2
  const [plan, setPlan] = useState<StoryPlan | null>(null);

  // Step 3
  const [imageModel, setImageModel] = useState<FalModel | null>(null);
  const [imageModelParams, setImageModelParams] = useState<Record<string, unknown>>({});
  const [sceneMedia, setSceneMedia] = useState<Record<number, SceneMedia>>({});
  const [imagesGenerating, setImagesGenerating] = useState(false);
  const [analyzeAfterGenerate, setAnalyzeAfterGenerate] = useState(true);

  // Step 4
  const [videoModel, setVideoModel] = useState<FalModel | null>(null);
  const [videoModelParams, setVideoModelParams] = useState<Record<string, unknown>>({});
  const [videosGenerating, setVideosGenerating] = useState(false);

  // Extras
  const [characterRefUrl, setCharacterRefUrl] = useState("");
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [timelineMode, setTimelineMode] = useState(false);
  const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);

  // Use the right fal client
  const activeFal = settings.falKey ? falClient : fal;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRef(true);
    try {
      const url = await activeFal.storage.upload(file);
      setCharacterRefUrl(url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploadingRef(false);
    }
  };

  // ---- Step 1: Plan Story ----
  const handlePlan = async () => {
    if (!idea.trim()) return;
    setPlanLoading(true);
    setPlanError("");

    try {
      const res = await fetch("/api/story/plan", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({ idea, style, sceneCount }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Ошибка планирования");
      }

      const data = await res.json();
      setPlan(data);
      setStep(2);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setPlanLoading(false);
    }
  };

  // ---- Step 2: Edit scene prompts ----
  const updateScene = (index: number, updates: Partial<StoryScene>) => {
    if (!plan) return;
    const newScenes = [...plan.scenes];
    newScenes[index] = { ...newScenes[index], ...updates };
    setPlan({ ...plan, scenes: newScenes });
  };

  const deleteScene = (index: number) => {
    if (!plan) return;
    const newScenes = plan.scenes.filter((_, i) => i !== index);
    newScenes.forEach((s, i) => (s.sceneNumber = i + 1));
    setPlan({ ...plan, scenes: newScenes });
  };

  // ---- Vision analysis ----
  const analyzeFrame = async (sceneIndex: number, imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          imageUrl,
          prompt: "Describe this image in detail: the subject(s), their appearance, pose, clothing, the environment, lighting, and composition. Be concise but precise. This description will be used to maintain visual consistency in subsequent frames.",
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.description || null;
    } catch {
      return null;
    }
  };

  // ---- Step 3: Generate images (CHAINED) ----
  // Chain rule: scene[i].startFrame = scene[i-1].endFrame
  // So we only generate: Scene 1 startFrame, then ALL endFrames sequentially.
  // Each endFrame becomes the next scene's startFrame automatically.
  const generateAllImages = async () => {
    if (!plan || !imageModel) return;
    setImagesGenerating(true);

    const newMedia: Record<number, SceneMedia> = {};
    plan.scenes.forEach((_, i) => {
      newMedia[i] = { startLoading: i === 0, endLoading: true };
    });
    setSceneMedia(newMedia);

    // Step A: Generate ONLY Scene 1's start frame
    const scene0 = plan.scenes[0];
    let lastEndFrameUrl = "";

    try {
      const input: Record<string, unknown> = {
        image_size: "landscape_16_9",
        ...imageModelParams,
        prompt: `${plan.style}. ${scene0.startFramePrompt}`,
      };
      
      if (characterRefUrl) {
        input.image_url = characterRefUrl;
        input.reference_image_url = characterRefUrl;
      }

      console.log("FAL IMAGE (Scene 1 start):", imageModel.endpoint_id, input);
      const result = await activeFal.subscribe(imageModel.endpoint_id, { input });
      const data = result.data as Record<string, unknown>;
      const images = data.images as { url: string }[];
      const image = data.image as { url: string } | undefined;
      const url = images?.[0]?.url || image?.url || "";

      // Vision analysis
      let startFrameDescription: string | undefined;
      if (analyzeAfterGenerate && url) {
        const desc = await analyzeFrame(0, url);
        if (desc) startFrameDescription = desc;
      }

      setSceneMedia((prev) => ({
        ...prev,
        [0]: { ...prev[0], startFrame: url, startLoading: false, startFrameDescription },
      }));
    } catch (err) {
      console.error("Scene 1 start frame error:", err);
      setSceneMedia((prev) => ({
        ...prev,
        [0]: { ...prev[0], startLoading: false },
      }));
    }

    // Step B: Generate ALL end frames SEQUENTIALLY (chain order)
    // Use vision feedback to enrich end frame prompts for consistency
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      try {
        // FEEDBACK LOOP: If we have a start frame description from vision analysis,
        // enrich the end frame prompt with it for better visual consistency
        let endPrompt = `${plan.style}. ${scene.endFramePrompt}`;
        const currentMedia = sceneMedia[i] || {};
        if (currentMedia.startFrameDescription) {
          endPrompt += `. Maintain visual consistency with: ${currentMedia.startFrameDescription}`;
        }

        const input: Record<string, unknown> = {
          image_size: "landscape_16_9",
          ...imageModelParams,
          prompt: endPrompt,
        };

        if (characterRefUrl) {
          input.image_url = characterRefUrl;
          input.reference_image_url = characterRefUrl;
        }

        console.log(`FAL IMAGE (Scene ${i + 1} end):`, imageModel.endpoint_id, input);
        const result = await activeFal.subscribe(imageModel.endpoint_id, { input });
        const data = result.data as Record<string, unknown>;
        const images = data.images as { url: string }[];
        const image = data.image as { url: string } | undefined;
        const url = images?.[0]?.url || image?.url || "";

        lastEndFrameUrl = url;

        // Update end frame for this scene
        setSceneMedia((prev) => ({
          ...prev,
          [i]: { ...prev[i], endFrame: url, endLoading: false },
        }));

        // CHAIN: this end frame becomes the NEXT scene's start frame
        if (i < plan.scenes.length - 1) {
          setSceneMedia((prev) => ({
            ...prev,
            [i + 1]: { ...prev[i + 1], startFrame: url, startLoading: false },
          }));
        }
      } catch (err) {
        console.error(`Scene ${i + 1} end frame error:`, err);
        setSceneMedia((prev) => ({
          ...prev,
          [i]: { ...prev[i], endLoading: false },
        }));
      }
    }

    setImagesGenerating(false);
  };

  const regenerateFrame = async (sceneIndex: number, frame: "start" | "end") => {
    if (!plan || !imageModel) return;
    const scene = plan.scenes[sceneIndex];

    // For chained scenes (start of scene > 0), regenerating "start" means
    // regenerating the PREVIOUS scene's "end" frame
    if (frame === "start" && sceneIndex > 0) {
      // Redirect: regenerate previous scene's end frame instead
      await regenerateFrame(sceneIndex - 1, "end");
      return;
    }

    const promptField = frame === "start" ? "startFramePrompt" : "endFramePrompt";
    const loadKey = frame === "start" ? "startLoading" : "endLoading";
    const frameKey = frame === "start" ? "startFrame" : "endFrame";

    setSceneMedia((prev) => ({
      ...prev,
      [sceneIndex]: { ...prev[sceneIndex], [loadKey]: true },
    }));

    try {
      const input: Record<string, unknown> = {
        image_size: "landscape_16_9",
        ...imageModelParams,
        prompt: `${plan.style}. ${scene[promptField]}`,
      };

      if (characterRefUrl) {
        input.image_url = characterRefUrl;
        input.reference_image_url = characterRefUrl;
      }

      console.log("FAL REGEN INPUT:", imageModel.endpoint_id, input);
      const result = await activeFal.subscribe(imageModel.endpoint_id, { input });
      const data = result.data as Record<string, unknown>;
      const images = data.images as { url: string }[];
      const image = data.image as { url: string } | undefined;
      const url = images?.[0]?.url || image?.url || "";

      const updates: Partial<SceneMedia> = { [frameKey]: url, [loadKey]: false };
      if (frame === "start" && analyzeAfterGenerate && url) {
        const desc = await analyzeFrame(sceneIndex, url);
        if (desc) updates.startFrameDescription = desc;
      }

      setSceneMedia((prev) => ({
        ...prev,
        [sceneIndex]: { ...prev[sceneIndex], ...updates },
      }));

      // CHAIN PROPAGATION: if we regenerated an end frame,
      // update the NEXT scene's start frame too
      if (frame === "end" && sceneIndex < plan.scenes.length - 1) {
        setSceneMedia((prev) => ({
          ...prev,
          [sceneIndex + 1]: { ...prev[sceneIndex + 1], startFrame: url },
        }));
      }
    } catch (err) {
      console.error(err);
      setSceneMedia((prev) => ({
        ...prev,
        [sceneIndex]: { ...prev[sceneIndex], [loadKey]: false },
      }));
    }
  };

  const allImagesReady = plan
    ? plan.scenes.every((_, i) => sceneMedia[i]?.startFrame && sceneMedia[i]?.endFrame)
    : false;

  // ---- Step 4: Generate videos (SEQUENTIAL for consistency) ----
  // Sequential generation preserves temporal coherence better than parallel.
  // Includes 1-retry logic for transient API failures.
  const generateAllVideos = async () => {
    if (!plan || !videoModel) return;
    setVideosGenerating(true);

    plan.scenes.forEach((_, i) => {
      setSceneMedia((prev) => ({
        ...prev,
        [i]: { ...prev[i], videoLoading: true, error: undefined },
      }));
    });

    // Generate videos SEQUENTIALLY for better consistency
    for (let i = 0; i < plan.scenes.length; i++) {
      const scene = plan.scenes[i];
      const media = sceneMedia[i];
      if (!media?.startFrame) continue;

      let lastError = "";
      // Retry loop: up to 2 attempts (1 retry)
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const baseInput = buildVideoInput(
            videoModel,
            scene,
            media.startFrame,
            media.endFrame
          );

          const input = { ...baseInput, ...videoModelParams };
          console.log(`FAL VIDEO INPUT (Scene ${i + 1}, attempt ${attempt + 1}):`, videoModel.endpoint_id, input);

          const result = await activeFal.subscribe(videoModel.endpoint_id, {
            input,
            logs: true,
          });

          const data = result.data as Record<string, unknown>;
          const video = data.video as { url: string } | undefined;
          const videoUrl = video?.url || "";

          if (!videoUrl) throw new Error("Видео не получено");

          setSceneMedia((prev) => ({
            ...prev,
            [i]: { ...prev[i], videoUrl, videoLoading: false, error: undefined },
          }));
          lastError = ""; // Success, clear error
          break; // Exit retry loop on success
        } catch (err: any) {
          lastError = err.message || "Ошибка генерации";
          if (err.body && err.body.detail) {
            console.error(`FAL Error Detail (Scene ${i + 1}):`, err.body.detail);
            lastError = `Параметры не приняты: ${JSON.stringify(err.body.detail)}`;
            break; // ValidationError — no point retrying
          }
          console.error(`Scene ${i + 1} video error (attempt ${attempt + 1}):`, err);
          // Wait 2 seconds before retry
          if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (lastError) {
        setSceneMedia((prev) => ({
          ...prev,
          [i]: { ...prev[i], videoLoading: false, error: lastError },
        }));
      }
    }

    setVideosGenerating(false);
  };

  // ---- Computed ----
  const totalDuration = plan
    ? plan.scenes.reduce((sum, s) => sum + s.duration, 0)
    : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Story Director</h1>
        <p className="page-subtitle">
          От текстовой идеи до видеосторибоарда в 4 шага
        </p>
      </div>

      {/* Step Indicator */}
      <div className="step-indicator">
        {STEPS_INFO.map((s, i) => (
          <div key={s.num} style={{ display: "contents" }}>
            <div className={`step ${step === s.num ? "active" : ""} ${step > s.num ? "completed" : ""}`}>
              <div className="step-number">{step > s.num ? "✓" : s.num}</div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < STEPS_INFO.length - 1 && (
              <div className={`step-connector ${step > s.num ? "completed" : ""}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Idea Input */}
      {step === 1 && (
        <div className="card" style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 className="font-semibold" style={{ fontSize: "var(--fs-16)", marginBottom: 16 }}>
            Введите идею
          </h2>

          <div className="flex flex-col gap-md">
            <div className="input-group">
              <label className="input-label">Идея</label>
              <textarea
                className="textarea textarea-large"
                placeholder="Котёнок во время путешествия с родителями упал с круизного лайнера и переживает приключения в океане..."
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Стиль</label>
                <select className="select" value={style} onChange={(e) => setStyle(e.target.value)}>
                  {STYLES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Сцены</label>
                <select className="select" value={sceneCount} onChange={(e) => setSceneCount(Number(e.target.value))}>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>{n} сцен</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handlePlan}
              disabled={!idea.trim() || planLoading}
            >
              {planLoading ? <><span className="spinner" /> Планирование...</> : "Создать сторибоард"}
            </button>

            {planError && (
              <div className="toast toast-error" style={{ position: "static" }}>{planError}</div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Scene Editor */}
      {step === 2 && plan && (
        <div>
          <div className="flex items-center justify-between mb-lg">
            <div>
              <h2 className="font-semibold" style={{ fontSize: "var(--fs-16)" }}>{plan.title}</h2>
              <p className="text-xs text-tertiary" style={{ marginTop: 4 }}>
                {plan.scenes.length} сцен · ~{totalDuration}с · {plan.style.split(",")[0]}
              </p>
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Назад</button>
              <button className="btn btn-primary" onClick={() => setStep(3)}>Генерация кадров →</button>
            </div>
          </div>

          {plan.characters.length > 0 && (
            <div className="card" style={{ marginBottom: 12, background: "var(--accent-subtle)" }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                <p className="text-xs font-medium" style={{ color: "var(--accent)" }}>ПЕРСОНАЖИ</p>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {characterRefUrl && <img src={characterRefUrl} alt="ref" style={{ width: 24, height: 24, borderRadius: 12, objectFit: "cover" }} />}
                  <label className="btn btn-ghost" style={{ padding: "0 8px", fontSize: "11px", cursor: "pointer" }}>
                    {isUploadingRef ? "Загрузка..." : "Загрузить лицо (Reference)"}
                    <input type="file" accept="image/*" hidden onChange={handleFileUpload} disabled={isUploadingRef} />
                  </label>
                </div>
              </div>
              {plan.characters.map((char, i) => (
                <p key={i} className="text-xs text-secondary" style={{ marginBottom: 4 }}>
                  {char}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-md">
            {plan.scenes.map((scene, i) => (
              <div key={i} className="scene-card">
                <div className="scene-card-header">
                  <div className="flex items-center gap-sm">
                    <div className="scene-card-number">{scene.sceneNumber}</div>
                    <input
                      type="text"
                      className="input"
                      value={scene.title}
                      onChange={(e) => updateScene(i, { title: e.target.value })}
                      style={{ fontWeight: 600, background: "transparent", border: "none", borderBottom: "1px solid var(--border-primary)", borderRadius: 0, padding: "2px 0" }}
                    />
                  </div>
                  <div className="scene-card-badges">
                    <span className="tag">{scene.cameraAngle}</span>
                    <span className="tag tag-orange">{scene.mood}</span>
                    <div className="flex items-center gap-xs tag tag-green">
                      <input
                        type="number"
                        min="2"
                        max="15"
                        value={scene.duration}
                        onChange={(e) => updateScene(i, { duration: Number(e.target.value) })}
                        style={{ width: 30, background: "transparent", border: "none", color: "inherit", fontSize: "inherit", textAlign: "center", padding: 0 }}
                      />
                      <span>с</span>
                    </div>
                    <button className="btn btn-ghost" onClick={() => deleteScene(i)} style={{ color: "var(--red)", padding: "2px 4px" }}>✕</button>
                  </div>
                </div>

                <p className="text-xs text-secondary" style={{ marginBottom: 10 }}>{scene.description}</p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="input-group">
                    <label className="input-label">START FRAME</label>
                    <textarea
                      className="textarea"
                      value={scene.startFramePrompt}
                      onChange={(e) => updateScene(i, { startFramePrompt: e.target.value })}
                      style={{ minHeight: 70, fontSize: "var(--fs-11)" }}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">END FRAME</label>
                    <textarea
                      className="textarea"
                      value={scene.endFramePrompt}
                      onChange={(e) => updateScene(i, { endFramePrompt: e.target.value })}
                      style={{ minHeight: 70, fontSize: "var(--fs-11)" }}
                    />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: 8 }}>
                  <label className="input-label">MOTION PROMPT</label>
                  <textarea
                    className="textarea"
                    value={scene.videoMotionPrompt}
                    onChange={(e) => updateScene(i, { videoMotionPrompt: e.target.value })}
                    style={{ minHeight: 50, fontSize: "var(--fs-11)" }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center" style={{ marginTop: 24 }}>
            <button className="btn btn-primary btn-lg" onClick={() => setStep(3)}>
              Утвердить → кадры
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Keyframe Generation */}
      {step === 3 && plan && (
        <div>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-semibold" style={{ fontSize: "var(--fs-16)" }}>Генерация кадров</h2>
            <div className="flex gap-sm">
              <button className="btn btn-ghost" onClick={() => setStep(2)}>← Назад</button>
              {allImagesReady && <button className="btn btn-primary" onClick={() => setStep(4)}>Видео →</button>}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-md" style={{ flexWrap: "wrap", marginBottom: 12 }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label className="input-label" style={{ marginBottom: 6 }}>МОДЕЛЬ</label>
                <ModelSelector
                  category="text-to-image"
                  value={imageModel?.endpoint_id}
                  onChange={setImageModel}
                  placeholder="Nano Banana 2, Flux Pro..."
                />
              </div>
              <label className="flex items-center gap-xs text-xs text-secondary" style={{ cursor: "pointer", marginTop: 24 }}>
                <input
                  type="checkbox"
                  checked={analyzeAfterGenerate}
                  onChange={(e) => setAnalyzeAfterGenerate(e.target.checked)}
                />
                Vision-анализ кадров
              </label>
              <button
                className="btn btn-primary"
                style={{ marginTop: 24 }}
                disabled={!imageModel || imagesGenerating}
                onClick={generateAllImages}
              >
                {imagesGenerating ? <><span className="spinner" /> Генерация...</> : `Генерировать (${plan.scenes.length * 2} кадров)`}
              </button>
            </div>

            {/* Dynamic settings for Image Model */}
            <DynamicModelForm
              model={imageModel}
              hiddenFields={["prompt", "image_size"]}
              onChange={setImageModelParams}
            />
          </div>

          <div className="flex flex-col gap-md">
            {plan.scenes.map((scene, i) => (
              <div key={i} className="scene-card">
                <div className="scene-card-header">
                  <div className="flex items-center gap-sm">
                    <div className="scene-card-number">{scene.sceneNumber}</div>
                    <span className="font-medium text-sm">{scene.title}</span>
                  </div>
                  <span className="tag tag-green">{scene.duration}с</span>
                </div>

                {sceneMedia[i]?.startFrameDescription && (
                  <p className="text-xs text-tertiary" style={{ marginBottom: 8, fontStyle: "italic", padding: "6px 8px", background: "var(--accent-muted)", borderRadius: 4 }}>
                    Vision: {sceneMedia[i].startFrameDescription!.slice(0, 200)}...
                  </p>
                )}

                <div className="scene-frames">
                  {/* Start Frame */}
                  <div className="scene-frame">
                    <span className="scene-frame-label" style={{ color: "var(--green)" }}>Start</span>
                    {sceneMedia[i]?.startLoading ? (
                      <div className="scene-frame-placeholder"><div className="spinner" /><span>Генерация...</span></div>
                    ) : sceneMedia[i]?.startFrame ? (
                      <>
                        <img src={sceneMedia[i].startFrame} alt={`S${i + 1} start`} />
                        <button className="btn btn-ghost" style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.5)", fontSize: 10 }} onClick={() => regenerateFrame(i, "start")}>↻</button>
                      </>
                    ) : (
                      <div className="scene-frame-placeholder"><span>—</span></div>
                    )}
                  </div>
                  {/* End Frame */}
                  <div className="scene-frame">
                    <span className="scene-frame-label" style={{ color: "var(--red)" }}>End</span>
                    {sceneMedia[i]?.endLoading ? (
                      <div className="scene-frame-placeholder"><div className="spinner" /><span>Генерация...</span></div>
                    ) : sceneMedia[i]?.endFrame ? (
                      <>
                        <img src={sceneMedia[i].endFrame} alt={`S${i + 1} end`} />
                        <button className="btn btn-ghost" style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.5)", fontSize: 10 }} onClick={() => regenerateFrame(i, "end")}>↻</button>
                      </>
                    ) : (
                      <div className="scene-frame-placeholder"><span>—</span></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {allImagesReady && (
            <div className="flex justify-center" style={{ marginTop: 24 }}>
              <button className="btn btn-primary btn-lg" onClick={() => setStep(4)}>Все кадры готовы → видео</button>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Video Production */}
      {step === 4 && plan && (
        <div>
          <div className="flex items-center justify-between mb-lg">
            <h2 className="font-semibold" style={{ fontSize: "var(--fs-16)" }}>Генерация видео</h2>
            <button className="btn btn-ghost" onClick={() => setStep(3)}>← Кадры</button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-md" style={{ marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="input-label" style={{ marginBottom: 6 }}>ВИДЕО МОДЕЛЬ</label>
                <ModelSelector
                  category="image-to-video"
                  value={videoModel?.endpoint_id}
                  onChange={setVideoModel}
                  placeholder="Seedance 2.0, Kling 3.0, Veo 3.1..."
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 24 }}
                disabled={!videoModel || videosGenerating}
                onClick={generateAllVideos}
              >
                {videosGenerating ? <><span className="spinner" /> Генерация...</> : `Генерировать (${plan.scenes.length} видео)`}
              </button>
            </div>

            {/* Dynamic settings for Video Model */}
            <DynamicModelForm
              model={videoModel}
              hiddenFields={["duration"]}
              onChange={setVideoModelParams}
            />

            {videoModel && (
              <p className="text-xs text-tertiary" style={{ marginTop: 12 }}>
                {videoModel.endpoint_id.includes("seedance") && "Seedance: start + end frame → видеопереход. Audio выключен."}
                {videoModel.endpoint_id.includes("kling") && "Kling: start frame → видео. End frame не используется этой моделью."}
                {videoModel.endpoint_id.includes("veo") && "Veo: " + (videoModel.endpoint_id.includes("first-last") ? "first + last frame → видеопереход." : "start frame → видео.")}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-md">
            {plan.scenes.map((scene, i) => (
              <div key={i} className="scene-card">
                <div className="scene-card-header">
                  <div className="flex items-center gap-sm">
                    <div className="scene-card-number">{scene.sceneNumber}</div>
                    <span className="font-medium text-sm">{scene.title}</span>
                  </div>
                  <div className="flex gap-xs items-center">
                    <span className="tag">{scene.cameraAngle}</span>
                    <span className="tag tag-green">{scene.duration}с</span>
                    {sceneMedia[i]?.videoUrl && <span className="tag tag-green">Готово</span>}
                  </div>
                </div>

                {sceneMedia[i]?.error ? (
                  <div className="toast toast-error" style={{ position: "static", marginTop: 8 }}>
                    Сцена {i + 1}: {sceneMedia[i].error}
                  </div>
                ) : sceneMedia[i]?.videoLoading ? (
                  <div className="loading-overlay" style={{ padding: 24 }}>
                    <div className="spinner spinner-lg" />
                    <p className="text-xs text-secondary">Генерация видео для сцены {i + 1}...</p>
                  </div>
                ) : sceneMedia[i]?.videoUrl ? (
                  <div style={{ marginTop: 10, borderRadius: "var(--r2)", overflow: "hidden" }}>
                    <video src={sceneMedia[i].videoUrl} controls style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
                    <div className="flex gap-sm" style={{ marginTop: 6 }}>
                      <a href={sceneMedia[i].videoUrl} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ fontSize: 11 }}>Скачать</a>
                    </div>
                  </div>
                ) : (
                  <div className="scene-frames">
                    {sceneMedia[i]?.startFrame && (
                      <div className="scene-frame">
                        <img src={sceneMedia[i].startFrame} alt="Start" />
                        <span className="scene-frame-label" style={{ color: "var(--green)" }}>Start</span>
                      </div>
                    )}
                    {sceneMedia[i]?.endFrame && (
                      <div className="scene-frame">
                        <img src={sceneMedia[i].endFrame} alt="End" />
                        <span className="scene-frame-label" style={{ color: "var(--red)" }}>End</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Timeline */}
          {plan.scenes.some((_, i) => sceneMedia[i]?.videoUrl) && (
            <div style={{ marginTop: 32 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h3 className="font-semibold">Таймлайн фильм</h3>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                     setTimelineMode(!timelineMode);
                     setCurrentTimelineIndex(0);
                  }}
                >
                  {timelineMode ? "Закрыть плеер" : "Смотреть фильм 🍿"}
                </button>
              </div>

              {timelineMode && plan.scenes.length > 0 && sceneMedia[currentTimelineIndex]?.videoUrl ? (
                <div className="card" style={{ background: "#000", padding: 0, overflow: "hidden", marginBottom: 24 }}>
                  <video 
                    src={sceneMedia[currentTimelineIndex].videoUrl} 
                    controls 
                    autoPlay 
                    style={{ width: "100%", aspectRatio: "16/9", display: "block" }} 
                    onEnded={() => {
                      if (currentTimelineIndex < plan.scenes.length - 1 && sceneMedia[currentTimelineIndex + 1]?.videoUrl) {
                        setCurrentTimelineIndex(currentTimelineIndex + 1);
                      }
                    }}
                  />
                  <div style={{ padding: 12, background: "#111", color: "#fff" }}>
                    <p className="text-sm font-medium">Сцена {currentTimelineIndex + 1}: {plan.scenes[currentTimelineIndex].title}</p>
                  </div>
                </div>
              ) : timelineMode ? (
                <div className="card" style={{ marginBottom: 24 }}>Видео для сцены {currentTimelineIndex + 1} еще не готово.</div>
              ) : null}

              <div className="timeline">
                {plan.scenes.map((scene, i) =>
                  sceneMedia[i]?.videoUrl ? (
                    <div key={i} className="timeline-item">
                      <video src={sceneMedia[i].videoUrl} controls muted />
                      <div className="timeline-item-info">
                        <p className="font-medium text-xs">{scene.title}</p>
                        <p className="text-xs text-tertiary">Сцена {scene.sceneNumber} · {scene.duration}с</p>
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
