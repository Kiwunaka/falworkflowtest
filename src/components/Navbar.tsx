"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/generate/image", label: "Изображения" },
  { href: "/generate/video", label: "Видео" },
  { href: "/story", label: "Story Director" },
  { href: "/nodes", label: "Node Editor ⚡" },
  { href: "/models", label: "Каталог" },
  { href: "/settings", label: "⚙️" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        <span>FAL</span> Studio
      </Link>
      <ul className="navbar-links">
        {NAV_ITEMS.map((item) => (
          <li key={item.href} style={{ listStyle: "none" }}>
            <Link
              href={item.href}
              className={`navbar-link ${
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href))
                  ? "active"
                  : ""
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
