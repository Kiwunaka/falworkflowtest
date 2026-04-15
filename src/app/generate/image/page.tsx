"use client";

import { useState, useMemo, useCallback } from "react";
import { fal, createFalWithKey } from "@/lib/fal";
import { ModelSelector } from "@/components/ModelSelector";
import { DynamicModelForm } from "@/components/DynamicModelForm";
import { FalModel } from "@/lib/models";
import { useSettings } from "@/lib/settings";

interface GeneratedImage {
  url: string;
  width?: number;
  height?: number;
}

export default function ImageGeneratorPage() {
  const { settings } = useSettings();
  const activeFal = useMemo(
    () => (settings.falKey ? createFalWithKey(settings.falKey) : fal),
    [settings.falKey]
  );

  const [model, setModel] = useState<FalModel | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");

  // Dynamic model params from schema
  const [modelParams, setModelParams] = useState<Record<string, unknown>>({});

  const handleParamsChange = useCallback(
    (params: Record<string, unknown>) => setModelParams(params),
    []
  );

  const handleGenerate = async () => {
    if (!model || !prompt.trim()) return;
    setLoading(true);
    setError("");

    try {
      // Merge prompt + dynamic params, filter out undefined
      const input: Record<string, unknown> = { prompt: prompt.trim() };
      for (const [k, v] of Object.entries(modelParams)) {
        if (v !== undefined && v !== "" && v !== null) {
          input[k] = v;
        }
      }

      const result = await activeFal.subscribe(model.endpoint_id, {
        input,
        logs: true,
      });

      const data = result.data as Record<string, unknown>;
      const imgs = (data.images as GeneratedImage[]) || [];
      if (data.image) imgs.push(data.image as GeneratedImage);
      setImages(imgs);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка генерации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Генерация изображений</h1>
        <p className="page-subtitle">
          Выберите модель — все доступные параметры подгрузятся автоматически
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {/* Controls */}
        <div className="flex flex-col gap-md">
          <div className="input-group">
            <label className="input-label">Модель</label>
            <ModelSelector
              category="text-to-image"
              value={model?.endpoint_id}
              onChange={setModel}
              placeholder="Nano Banana 2, Flux Pro..."
            />
          </div>

          <div className="input-group">
            <label className="input-label">Промпт</label>
            <textarea
              className="textarea textarea-large"
              placeholder="Опишите изображение..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <span className="text-xs text-tertiary">{prompt.length} символов</span>
          </div>

          {/* Dynamic params from model schema */}
          <DynamicModelForm
            model={model}
            hiddenFields={["prompt"]}
            onChange={handleParamsChange}
          />

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleGenerate}
            disabled={!model || !prompt.trim() || loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Генерация...
              </>
            ) : (
              "Генерировать"
            )}
          </button>

          {error && (
            <div className="toast toast-error" style={{ position: "static" }}>
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {images.length > 0 ? (
            <div
              className="grid"
              style={{
                gridTemplateColumns:
                  images.length > 1 ? "1fr 1fr" : "1fr",
                gap: 12,
              }}
            >
              {images.map((img, i) => (
                <div key={i} className="media-card">
                  <img
                    src={img.url}
                    alt={`Результат ${i + 1}`}
                    style={{ aspectRatio: "auto" }}
                  />
                  <div className="media-card-actions">
                    <a
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ fontSize: 12 }}
                    >
                      Скачать
                    </a>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12 }}
                      onClick={() => navigator.clipboard.writeText(img.url)}
                    >
                      Копировать URL
                    </button>
                  </div>
                </div>
              ))}
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
              <div className="empty-state-icon">🖼️</div>
              <p className="empty-state-text">Здесь появится результат</p>
              <p className="text-sm text-tertiary mt-md">
                Выберите модель — параметры подгрузятся автоматически
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
