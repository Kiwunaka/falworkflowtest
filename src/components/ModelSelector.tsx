"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { FalModel, CATEGORY_ICONS } from "@/lib/models";
import { useSettings } from "@/lib/settings";

interface ModelSelectorProps {
  category?: string;
  value?: string;
  onChange: (model: FalModel) => void;
  placeholder?: string;
}

export function ModelSelector({
  category,
  value,
  onChange,
  placeholder = "Выберите модель...",
}: ModelSelectorProps) {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<FalModel[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<FalModel | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (search) params.set("q", search);
      params.set("status", "active");
      params.set("limit", "30");

      // Pass FAL key from browser settings
      const headers: Record<string, string> = {};
      if (settings.falKey) {
        headers["x-fal-key"] = settings.falKey;
      }

      const res = await fetch(`/api/models?${params.toString()}`, { headers });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Ошибка загрузки");
        setModels([]);
        return;
      }

      setModels(data.models || []);
    } catch (err) {
      console.error(err);
      setError("Ошибка сети");
    } finally {
      setLoading(false);
    }
  }, [category, search, settings.falKey]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(fetchModels, 200);
    return () => clearTimeout(timer);
  }, [open, fetchModels]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Restore last selection from localStorage
  useEffect(() => {
    if (value && !selected) {
      const stored = localStorage.getItem(`model_${category}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSelected(parsed);
        } catch { /* ignore */ }
      }
    }
  }, [value, category, selected]);

  const handleSelect = (model: FalModel) => {
    setSelected(model);
    onChange(model);
    setOpen(false);
    if (category) {
      localStorage.setItem(`model_${category}`, JSON.stringify(model));
    }
  };

  const icon = selected
    ? CATEGORY_ICONS[selected.metadata.category] || "📦"
    : "📦";

  return (
    <div className="model-selector" ref={dropdownRef}>
      <button
        type="button"
        className="model-selector-trigger"
        onClick={() => setOpen(!open)}
      >
        <span>{icon}</span>
        <span style={{ flex: 1 }}>
          {selected ? selected.metadata.display_name : placeholder}
        </span>
        <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
          {selected ? selected.endpoint_id : ""}
        </span>
        <span style={{ fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="model-selector-dropdown">
          <input
            type="text"
            className="model-selector-search"
            placeholder="Поиск модели..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: 24 }}>
              <div className="spinner" />
            </div>
          ) : error ? (
            <div style={{ padding: 16, textAlign: "center", fontSize: 13 }}>
              <p style={{ color: "var(--red)", marginBottom: 8 }}>{error}</p>
              <a href="/settings" style={{ color: "var(--accent)", fontSize: 12 }}>
                Открыть настройки →
              </a>
            </div>
          ) : models.length === 0 ? (
            <div style={{ padding: 16, color: "var(--text-tertiary)", textAlign: "center", fontSize: 14 }}>
              Модели не найдены
            </div>
          ) : (
            models.map((model) => (
              <div
                key={model.endpoint_id}
                className="model-selector-option"
                onClick={() => handleSelect(model)}
              >
                <div style={{ flex: 1 }}>
                  <div className="model-selector-option-name">
                    {model.metadata.display_name}
                  </div>
                  <div className="model-selector-option-id">
                    {model.endpoint_id}
                  </div>
                </div>
                {model.metadata.highlighted && (
                  <span className="tag tag-orange" style={{ fontSize: 10 }}>⭐</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
