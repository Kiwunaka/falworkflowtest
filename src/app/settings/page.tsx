"use client";

import { useSettings } from "@/lib/settings";
import { useState } from "react";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
        <p className="page-subtitle">
          API-ключи и параметры. Сохраняются в браузере (localStorage), не уходят на сервер в открытом виде.
        </p>
      </div>

      {/* FAL.AI */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: "var(--fs-15)", marginBottom: 4 }}>
          fal.ai
        </h2>
        <p className="text-xs text-tertiary" style={{ marginBottom: 16 }}>
          Генерация изображений и видео. Получите ключ на{" "}
          <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            fal.ai/dashboard/keys
          </a>
        </p>

        <div className="input-group">
          <label className="input-label">FAL API KEY</label>
          <input
            type="password"
            className="input"
            placeholder="fal-..."
            value={settings.falKey}
            onChange={(e) => updateSettings({ falKey: e.target.value })}
            onBlur={handleSave}
          />
        </div>
      </section>

      {/* Fireworks AI */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: "var(--fs-15)", marginBottom: 4 }}>
          Fireworks AI — основной LLM
        </h2>
        <p className="text-xs text-tertiary" style={{ marginBottom: 16 }}>
          Используется для Story Director (планирование + vision). Получите ключ на{" "}
          <a href="https://fireworks.ai/account/api-keys" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            fireworks.ai
          </a>
        </p>

        <div className="flex flex-col gap-md">
          <div className="input-group">
            <label className="input-label">FIREWORKS API KEY</label>
            <input
              type="password"
              className="input"
              placeholder="fw_..."
              value={settings.fireworksKey}
              onChange={(e) => updateSettings({ fireworksKey: e.target.value })}
              onBlur={handleSave}
            />
          </div>

          <div className="input-group">
            <label className="input-label">МОДЕЛЬ</label>
            <input
              type="text"
              className="input"
              value={settings.fireworksModel}
              onChange={(e) => updateSettings({ fireworksModel: e.target.value })}
              onBlur={handleSave}
            />
            <p className="text-xs text-tertiary" style={{ marginTop: 4 }}>
              Base URL: <code style={{ color: "var(--text-secondary)" }}>https://api.fireworks.ai/inference/v1</code>
              <br />
              Рекомендуемые модели:
            </p>
            <ul style={{ listStyle: "none", marginTop: 4, display: "flex", flexDirection: "column", gap: 2 }}>
              <li className="text-xs text-secondary">
                <code>accounts/fireworks/routers/kimi-k2p5-turbo</code> — быстрая, с vision
              </li>
              <li className="text-xs text-secondary">
                <code>accounts/fireworks/models/kimi-k2p5</code> — полная, с vision
              </li>
              <li className="text-xs text-secondary">
                <code>accounts/fireworks/models/qwen3-30b-online</code> — Qwen 3, онлайн
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* OpenRouter */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="font-semibold" style={{ fontSize: "var(--fs-15)", marginBottom: 4 }}>
          OpenRouter — резервный LLM
        </h2>
        <p className="text-xs text-tertiary" style={{ marginBottom: 16 }}>
          Fallback если Fireworks недоступен.{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
            openrouter.ai/keys
          </a>
        </p>

        <div className="flex flex-col gap-md">
          <div className="input-group">
            <label className="input-label">OPENROUTER API KEY</label>
            <input
              type="password"
              className="input"
              placeholder="sk-or-..."
              value={settings.openrouterKey}
              onChange={(e) => updateSettings({ openrouterKey: e.target.value })}
              onBlur={handleSave}
            />
          </div>

          <div className="input-group">
            <label className="input-label">МОДЕЛЬ</label>
            <input
              type="text"
              className="input"
              value={settings.openrouterModel}
              onChange={(e) => updateSettings({ openrouterModel: e.target.value })}
              onBlur={handleSave}
            />
          </div>
        </div>
      </section>

      {/* Info */}
      <section className="card" style={{ borderColor: "var(--accent-subtle)" }}>
        <h3 className="font-semibold text-sm" style={{ marginBottom: 8 }}>Как это работает</h3>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
          <li className="text-xs text-secondary">
            1. Ключи хранятся только в localStorage вашего браузера
          </li>
          <li className="text-xs text-secondary">
            2. Передаются на сервер через HTTP-заголовки при каждом запросе
          </li>
          <li className="text-xs text-secondary">
            3. Если ключ не задан в браузере, сервер использует .env.local
          </li>
          <li className="text-xs text-secondary">
            4. FAL KEY также нужен в .env.local для серверного прокси
          </li>
        </ul>
      </section>

      {saved && (
        <div className="toast" style={{ position: "fixed", bottom: 24, right: 24 }}>
          ✓ Сохранено
        </div>
      )}
    </div>
  );
}
