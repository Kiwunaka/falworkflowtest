"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FalModel, ModelField, extractFieldsFromSchema } from "@/lib/models";
import { useSettings } from "@/lib/settings";

interface DynamicModelFormProps {
  model: FalModel | null;
  /** Extra params to always pass (like prompt, image_url from parent) — these fields are hidden from the form */
  hiddenFields?: string[];
  /** Called when user changes any parameter */
  onChange: (params: Record<string, unknown>) => void;
}

// Fields that parent components handle themselves
const ALWAYS_HIDDEN = [
  "prompt", 
  "image", "image_url", "image_urls", 
  "video", "video_url", "video_urls", 
  "audio", "audio_url", "audio_urls",
  "first_frame_url", "last_frame_url",
  "start_image_url", "end_image_url",
  "end_user_id", "sync_mode"
];

// Friendly Russian labels for common field names
const FIELD_LABELS: Record<string, string> = {
  num_images: "Количество",
  image_size: "Размер",
  aspect_ratio: "Соотношение сторон",
  output_format: "Формат",
  safety_tolerance: "Фильтр безопасности",
  resolution: "Разрешение",
  guidance_scale: "Guidance Scale",
  num_inference_steps: "Шаги",
  seed: "Seed",
  negative_prompt: "Негативный промпт",
  duration: "Длительность (сек)",
  generate_audio: "Генерировать аудио",
  width: "Ширина",
  height: "Высота",
  style: "Стиль",
  scheduler: "Планировщик",
  strength: "Сила",
  enable_safety_checker: "Проверка безопасности",
  sync_mode: "Синхронный режим",
  limit_generations: "Ограничить генерации",
  loras: "LoRA",
  motion_bucket_id: "Motion Bucket ID",
  cond_aug: "Conditioning Augmentation",
  fps: "FPS",
  end_image_url: "End frame URL",
  start_image_url: "Start frame URL",
  first_frame_url: "First frame URL",
  last_frame_url: "Last frame URL",
};

export function DynamicModelForm({
  model,
  hiddenFields = [],
  onChange,
}: DynamicModelFormProps) {
  const { settings } = useSettings();
  const [fields, setFields] = useState<ModelField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const prevModelRef = useRef<string | null>(null);

  const allHidden = [...ALWAYS_HIDDEN, ...hiddenFields];

  const fetchSchema = useCallback(async (endpointId: string) => {
    setLoading(true);
    try {
      const encodedId = encodeURIComponent(endpointId);
      const headers: Record<string, string> = {};
      if (settings.falKey) headers["x-fal-key"] = settings.falKey;

      const res = await fetch(`/api/models/${encodedId}/schema`, { headers });
      if (!res.ok) {
        setFields([]);
        return;
      }
      const data = await res.json();
      if (data.openapi) {
        const extracted = extractFieldsFromSchema(data.openapi);
        setFields(extracted);

        // Set defaults for new model
        const defaults: Record<string, unknown> = {};
        extracted.forEach((f) => {
          if (f.default !== undefined && !allHidden.includes(f.name)) {
            defaults[f.name] = f.default;
          }
        });
        setValues(defaults);
        onChange(defaults);
      }
    } catch (err) {
      console.error("Schema fetch error:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.falKey]);

  useEffect(() => {
    if (!model) {
      setFields([]);
      setValues({});
      return;
    }
    if (model.endpoint_id !== prevModelRef.current) {
      prevModelRef.current = model.endpoint_id;
      fetchSchema(model.endpoint_id);
    }
  }, [model, fetchSchema]);

  const updateValue = (name: string, value: unknown) => {
    const next = { ...values, [name]: value };
    setValues(next);
    onChange(next);
  };

  // Filter out hidden fields and sort: required first, then alphabetical
  const visibleFields = fields
    .filter((f) => !allHidden.includes(f.name))
    .sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });

  // Show first N fields, rest behind "ещё" toggle
  const INITIAL_SHOW = 6;
  const displayedFields = expanded
    ? visibleFields
    : visibleFields.slice(0, INITIAL_SHOW);
  const hasMore = visibleFields.length > INITIAL_SHOW;

  if (!model) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-sm" style={{ padding: "12px 0" }}>
        <div className="spinner" />
        <span className="text-xs text-tertiary">Загрузка параметров...</span>
      </div>
    );
  }

  if (visibleFields.length === 0) {
    return (
      <div style={{ marginTop: 12, padding: 12, border: "1px dashed var(--border-primary)", borderRadius: "var(--r2)" }}>
        <p className="text-xs text-tertiary text-center">
          У этой модели нет настраиваемых параметров или не удалось загрузить схему.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <p className="text-xs text-tertiary" style={{ marginBottom: 8 }}>
        Параметры модели ({visibleFields.length})
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {displayedFields.map((field) => (
          <FieldInput
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(v) => updateValue(field.name, v)}
          />
        ))}
      </div>
      {hasMore && (
        <button
          className="btn btn-ghost"
          style={{ marginTop: 8, fontSize: "var(--fs-12)" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded
            ? "Скрыть"
            : `Ещё ${visibleFields.length - INITIAL_SHOW} параметров...`}
        </button>
      )}
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: ModelField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = FIELD_LABELS[field.name] || field.name;
  const strValue = value !== undefined && value !== null ? String(value) : "";

  // Boolean
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-xs" style={{ cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          style={{ accentColor: "var(--accent)" }}
        />
        <span className="text-xs">{label}</span>
        {field.required && <span style={{ color: "var(--red)", fontSize: 10 }}>*</span>}
      </label>
    );
  }

  // Enum / select
  if (field.enum && field.enum.length > 0) {
    return (
      <div className="input-group">
        <label className="input-label">
          {label}
          {field.required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
        </label>
        <select
          className="select"
          value={strValue}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">—</option>
          {field.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Number / integer
  if (field.type === "number" || field.type === "integer") {
    return (
      <div className="input-group">
        <label className="input-label">
          {label}
          {field.minimum !== undefined && field.maximum !== undefined && (
            <span style={{ fontWeight: 400, marginLeft: 4 }}>
              ({field.minimum}-{field.maximum})
            </span>
          )}
          {field.required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
        </label>
        <input
          type="number"
          className="input"
          value={strValue}
          min={field.minimum}
          max={field.maximum}
          step={field.type === "integer" ? 1 : 0.1}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") { onChange(undefined); return; }
            onChange(field.type === "integer" ? parseInt(v) : parseFloat(v));
          }}
          placeholder={field.default !== undefined ? `По умолч: ${field.default}` : ""}
        />
      </div>
    );
  }

  // String (default)
  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {field.required && <span style={{ color: "var(--red)", marginLeft: 2 }}>*</span>}
      </label>
      {field.name.includes("prompt") || (field.description && field.description.length > 80) ? (
        <textarea
          className="textarea"
          value={strValue}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={field.description?.slice(0, 60) || ""}
          style={{ minHeight: 60, fontSize: "var(--fs-12)" }}
        />
      ) : (
        <input
          type="text"
          className="input"
          value={strValue}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={
            field.default !== undefined
              ? String(field.default)
              : field.description?.slice(0, 40) || ""
          }
        />
      )}
    </div>
  );
}
