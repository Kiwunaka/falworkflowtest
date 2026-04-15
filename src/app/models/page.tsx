"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FalModel, CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/models";
import { useSettings } from "@/lib/settings";

const CATEGORIES = [
  "",
  "text-to-image",
  "image-to-image",
  "image-to-video",
  "text-to-video",
  "video-to-video",
  "text-to-audio",
  "text-to-speech",
  "training",
];

export default function ModelsPage() {
  const { settings } = useSettings();
  const [models, setModels] = useState<FalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const loaderRef = useRef<HTMLDivElement>(null);

  const fetchModels = useCallback(
    async (reset = false) => {
      const isMore = !reset && cursor;
      if (isMore) setLoadingMore(true);
      else setLoading(true);

      try {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (search) params.set("q", search);
        params.set("status", "active");
        params.set("limit", "50");
        if (isMore && cursor) params.set("cursor", cursor);

        const headers: Record<string, string> = {};
        if (settings.falKey) headers["x-fal-key"] = settings.falKey;

        const res = await fetch(`/api/models?${params.toString()}`, { headers });
        const data = await res.json();

        if (!res.ok) {
          setFetchError(data.error || "Ошибка загрузки");
          setModels([]);
          return;
        }
        setFetchError("");
        if (reset || !isMore) {
          setModels(data.models || []);
        } else {
          setModels((prev) => [...prev, ...(data.models || [])]);
        }
        setCursor(data.next_cursor || null);
        setHasMore(data.has_more || false);
      } catch (err) {
        console.error("Ошибка загрузки моделей:", err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, search, cursor, settings.falKey]
  );

  useEffect(() => {
    setCursor(null);
    const timer = setTimeout(() => fetchModels(true), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  // Infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchModels(false);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, loadingMore]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Каталог моделей</h1>
        <p className="page-subtitle">
          Все доступные модели fal.ai в реальном времени
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-md mb-lg" style={{ flexWrap: "wrap" }}>
        <input
          type="text"
          className="input"
          placeholder="🔍 Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <div className="flex gap-xs flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat || "all"}
              className={`btn ${category === cat ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setCategory(cat)}
              style={{ fontSize: "var(--fs-11)" }}
            >
              {cat ? `${CATEGORY_ICONS[cat] || ""} ${CATEGORY_LABELS[cat] || cat}` : "Все"}
            </button>
          ))}
        </div>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="grid grid-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      ) : fetchError ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ opacity: 1 }}>⚠️</div>
          <p className="empty-state-text" style={{ color: "var(--red)" }}>{fetchError}</p>
          <a href="/settings" className="btn btn-primary" style={{ marginTop: 12 }}>Открыть настройки</a>
        </div>
      ) : models.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-text">Модели не найдены</p>
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            {models.map((model) => (
              <ModelCard key={model.endpoint_id} model={model} />
            ))}
          </div>
          {hasMore && (
            <div ref={loaderRef} className="loading-overlay" style={{ padding: "24px 0" }}>
              {loadingMore && <div className="spinner" />}
            </div>
          )}
          <p className="text-center text-sm text-tertiary mt-lg">
            Загружено: {models.length} моделей
          </p>
        </>
      )}
    </div>
  );
}

function ModelCard({ model }: { model: FalModel }) {
  const meta = model.metadata;
  const categoryLabel = CATEGORY_LABELS[meta.category] || meta.category;
  const categoryIcon = CATEGORY_ICONS[meta.category] || "📦";

  return (
    <div className="card">
      {meta.thumbnail_url && (
        <div
          style={{
            width: "100%",
            height: 140,
            borderRadius: "var(--r2)",
            overflow: "hidden",
            marginBottom: 12,
            background: "var(--bg-tertiary)",
          }}
        >
          <img
            src={meta.thumbnail_url}
            alt={meta.display_name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-center gap-sm mb-md">
        <span className="tag">
          {categoryIcon} {categoryLabel}
        </span>
        {meta.highlighted && <span className="tag tag-amber">⭐</span>}
      </div>
      <h3 className="font-semibold" style={{ fontSize: "var(--fs-14)", marginBottom: 4 }}>
        {meta.display_name}
      </h3>
      <p className="text-xs text-tertiary truncate" style={{ marginBottom: 8 }}>
        {model.endpoint_id}
      </p>
      <p className="card-description" style={{ 
        display: "-webkit-box", 
        WebkitLineClamp: 2, 
        WebkitBoxOrient: "vertical" as const, 
        overflow: "hidden" 
      }}>
        {meta.description}
      </p>
      {meta.tags && meta.tags.length > 0 && (
        <div className="flex gap-xs flex-wrap mt-md">
          {meta.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag" style={{ fontSize: "10px" }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
