import Link from "next/link";

const TOOLS = [
  {
    href: "/generate/image",
    icon: "🖼️",
    title: "Изображения",
    description:
      "Генерация из текста — Flux, Nano Banana Pro, Recraft и сотни других моделей на выбор.",
  },
  {
    href: "/generate/video",
    icon: "🎬",
    title: "Видео",
    description:
      "Изображение → Видео или Текст → Видео. Kling, Seedance, Veo и другие.",
  },
  {
    href: "/story",
    icon: "✦",
    title: "Story Director",
    description:
      "Напиши идею — AI разложит её на сцены, сгенерирует кадры и соберёт видео для каждой.",
    featured: true,
  },
  {
    href: "/models",
    icon: "⊞",
    title: "Каталог моделей",
    description:
      "Все доступные модели fal.ai — поиск, фильтры по категориям, просмотр параметров.",
  },
];

const PIPELINE_STEPS = [
  { num: "01", title: "Идея", text: "Опишите что хотите увидеть — на любом языке, в свободной форме" },
  { num: "02", title: "Сценарий", text: "AI-режиссёр разложит идею на 3-8 сцен с промптами и настроением" },
  { num: "03", title: "Кадры", text: "Для каждой сцены генерируются начальный и конечный кадры" },
  { num: "04", title: "Видео", text: "Видео-модель создаёт плавный переход между кадрами (3-8с каждая сцена)" },
];

export default function HomePage() {
  return (
    <div className="page-container">
      {/* Hero */}
      <section className="hero">
        <h1 className="hero-title">
          AI-студия <span className="gradient-text">генерации медиа</span>
        </h1>
        <p className="hero-description">
          Единый интерфейс для сотен моделей fal.ai.
          Создавайте изображения, видео, или целый видеосторибоард из текстовой идеи.
        </p>
        <div className="flex items-center justify-center gap-sm">
          <Link href="/story" className="btn btn-primary btn-lg">
            Story Director
          </Link>
          <Link href="/models" className="btn btn-secondary btn-lg">
            Каталог моделей
          </Link>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="mt-xl">
        <div className="grid grid-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="card card-clickable"
            >
              <span className="card-icon">{tool.icon}</span>
              <h3 className="card-title">
                {tool.title}
                {tool.featured && (
                  <span className="tag tag-orange" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                    Главное
                  </span>
                )}
              </h3>
              <p className="card-description">{tool.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Pipeline */}
      <section className="mt-xl">
        <h2 className="font-semibold mb-lg" style={{ fontSize: "var(--fs-18)" }}>
          Как работает Story Director
        </h2>
        <div className="grid grid-4">
          {PIPELINE_STEPS.map((s) => (
            <div key={s.num} className="card">
              <div
                className="font-bold"
                style={{
                  fontSize: "var(--fs-24)",
                  color: "var(--accent)",
                  opacity: 0.5,
                  marginBottom: 8,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.num}
              </div>
              <h4 className="font-semibold" style={{ marginBottom: 4 }}>
                {s.title}
              </h4>
              <p className="card-description">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
