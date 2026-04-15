"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { fal, createFalWithKey } from "@/lib/fal";
import { ModelSelector } from "@/components/ModelSelector";
import { DynamicModelForm } from "@/components/DynamicModelForm";
import { FalModel } from "@/lib/models";
import { useSettings } from "@/lib/settings";

type Mode = "image-to-video" | "text-to-video";

export default function VideoGeneratorPage() {
  const { settings } = useSettings();
  const activeFal = useMemo(
    () => (settings.falKey ? createFalWithKey(settings.falKey) : fal),
    [settings.falKey]
  );

  const [mode, setMode] = useState<Mode>("image-to-video");
  const [model, setModel] = useState<FalModel | null>(null);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [queueStatus, setQueueStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic params from schema
  const [modelParams, setModelParams] = useState<Record<string, unknown>>({});
  const handleParamsChange = useCallback(
    (params: Record<string, unknown>) => setModelParams(params),
    []
  );

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await activeFal.storage.upload(file);
      setImageUrl(url);
    } catch (err) {
      setError("Ошибка загрузки файла");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(file);
    }
  };

  const handleGenerate = async () => {
    if (!model || !prompt.trim()) return;
    if (mode === "image-to-video" && !imageUrl) return;

    setLoading(true);
    setError("");
    setVideoUrl("");
    setQueueStatus("В очереди...");

    try {
      // Build input: prompt + image + all dynamic params
      const input: Record<string, unknown> = { prompt: prompt.trim() };

      if (mode === "image-to-video") {
        input.image_url = imageUrl;
      }

      // Merge dynamic params (may include duration, aspect_ratio, etc.)
      for (const [k, v] of Object.entries(modelParams)) {
        if (v !== undefined && v !== "" && v !== null) {
          input[k] = v;
        }
      }

      const result = await activeFal.subscribe(model.endpoint_id, {
        input,
        logs: true,
        onQueueUpdate: (update: { status: string; queue_position?: number }) => {
          if (update.status === "IN_QUEUE") {
            setQueueStatus(
              `В очереди (позиция: ${update.queue_position ?? "?"})`
            );
          } else if (update.status === "IN_PROGRESS") {
            setQueueStatus("Генерация...");
          }
        },
      });

      const data = result.data as Record<string, unknown>;
      const video = data.video as { url: string } | undefined;
      if (video?.url) {
        setVideoUrl(video.url);
      } else {
        setError("Видео не получено в ответе");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка генерации видео");
    } finally {
      setLoading(false);
      setQueueStatus("");
    }
  };

  // Fields to hide from dynamic form (we handle them ourselves)
  const hiddenFields = [
    "prompt",
    "image_url",
    "start_image_url",
    "first_frame_url",
    "end_image_url",
    "last_frame_url",
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Генерация видео</h1>
        <p className="page-subtitle">
          Создайте видео из текста или изображения — параметры подгрузятся из схемы модели
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-sm mb-lg">
        <button
          className={`btn ${
            mode === "image-to-video" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setMode("image-to-video")}
        >
          Изображение → Видео
        </button>
        <button
          className={`btn ${
            mode === "text-to-video" ? "btn-primary" : "btn-secondary"
          }`}
          onClick={() => setMode("text-to-video")}
        >
          Текст → Видео
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        {/* Controls */}
        <div className="flex flex-col gap-md">
          <div className="input-group">
            <label className="input-label">Модель</label>
            <ModelSelector
              category={mode}
              value={model?.endpoint_id}
              onChange={setModel}
              placeholder={`Выберите модель ${
                mode === "image-to-video" ? "img→vid" : "txt→vid"
              }...`}
            />
          </div>

          {mode === "image-to-video" && (
            <div className="input-group">
              <label className="input-label">Исходное изображение</label>
              {imageUrl ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={imageUrl}
                    alt="Исходное"
                    style={{
                      width: "100%",
                      borderRadius: "var(--r2)",
                      maxHeight: 200,
                      objectFit: "cover",
                    }}
                  />
                  <button
                    className="btn btn-ghost"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(0,0,0,0.6)",
                    }}
                    onClick={() => setImageUrl("")}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed var(--border-primary)",
                    borderRadius: "var(--r3)",
                    padding: 32,
                    textAlign: "center",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                  }}
                >
                  {uploading ? (
                    <div className="spinner" />
                  ) : (
                    <>
                      <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>
                        🖼️
                      </div>
                      <p className="text-xs">
                        Перетащите или нажмите для загрузки
                      </p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                    }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Промпт</label>
            <textarea
              className="textarea"
              placeholder="Опишите что должно происходить в видео..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>

          {/* Dynamic params */}
          <DynamicModelForm
            model={model}
            hiddenFields={hiddenFields}
            onChange={handleParamsChange}
          />

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleGenerate}
            disabled={
              !model ||
              !prompt.trim() ||
              loading ||
              (mode === "image-to-video" && !imageUrl)
            }
          >
            {loading ? (
              <>
                <span className="spinner" /> {queueStatus || "Генерация..."}
              </>
            ) : (
              "Генерировать видео"
            )}
          </button>

          {error && (
            <div
              className="toast toast-error"
              style={{ position: "static" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Result */}
        <div>
          {videoUrl ? (
            <div className="media-card">
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                style={{ aspectRatio: "16/9" }}
              />
              <div className="media-card-actions">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: 12 }}
                >
                  Скачать
                </a>
              </div>
            </div>
          ) : (
            <div
              className="empty-state"
              style={{
                background: "var(--bg-card)",
                borderRadius: "var(--r3)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <div className="empty-state-icon">🎬</div>
              <p className="empty-state-text">Здесь появится видео</p>
              <p className="text-sm text-tertiary mt-md">
                {mode === "image-to-video"
                  ? "Загрузите изображение и выберите модель"
                  : "Выберите модель и опишите видео"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
