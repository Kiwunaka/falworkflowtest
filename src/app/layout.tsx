import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { SettingsProvider } from "@/lib/settings";

export const metadata: Metadata = {
  title: "FAL Studio — AI Генератор Медиа",
  description:
    "Генерация изображений, видео и AI-сторибоардов через fal.ai. Все модели в одном месте.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>
        <SettingsProvider>
          <Navbar />
          <main>{children}</main>
        </SettingsProvider>
      </body>
    </html>
  );
}
