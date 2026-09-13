import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/remote/design-system";

import type { NavItem } from "./types";

interface HeaderProps {
  activePath?: string;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/payroll", label: "Payroll", disabled: true },
  { href: "/transfer", label: "Transfer", disabled: true },
  { href: "/mutasi", label: "Mutasi", disabled: true },
  { href: "/persetujuan", label: "Persetujuan", disabled: true },
];

const NAV_ICONS: Record<string, string> = {
  "/": "m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z",
  "/payroll":
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "/transfer": "M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5",
  "/mutasi":
    "M8 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3M8 2h8v4H8zM8 11h8m-8 5h5",
  "/persetujuan":
    "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
};

const Brand = () => (
  <a className="lyt-brand" href="/" aria-label="Duitin — Beranda">
    <span className="lyt-brand__name">
      duitin<span>.</span>
    </span>
    <span className="lyt-brand__caption">BUSINESS BANKING</span>
  </a>
);

const Header = ({
  activePath = "/",
  navItems = DEFAULT_NAV_ITEMS,
  onLogout,
  userName,
}: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const currentPath = activePath.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const activeItem = navItems
    .filter(
      (item) =>
        !item.disabled &&
        (item.href === currentPath ||
          (item.href !== "/" && currentPath.startsWith(`${item.href}/`))),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  const initials = userName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("id-ID");

  useEffect(() => {
    setMenuOpen(false);
  }, [activePath]);

  return (
    <>
      <header className="lyt-header">
        <div className="lyt-header__mobile-brand">
          <Brand />
        </div>
        <div className="lyt-header__context">
          <span>Ruang kerja</span>
          <span aria-hidden="true">/</span>
          <strong>{activeItem?.label ?? "Business Banking"}</strong>
        </div>
        <div className="lyt-header__actions">
          {userName ? (
            <div
              className="lyt-header__profile"
              role="group"
              aria-label={`Akun ${userName}`}
            >
              <span className="lyt-header__avatar" aria-hidden="true">
                {initials}
              </span>
              <div className="lyt-header__identity">
                <span className="lyt-header__greeting">Selamat datang</span>
                <span className="lyt-header__username" title={userName}>
                  {userName}
                </span>
              </div>
            </div>
          ) : null}
          {onLogout ? (
            <Button
              className="lyt-header__logout"
              color="default"
              onPress={onLogout}
              size="sm"
              variant="outline"
            >
              Keluar
            </Button>
          ) : null}
          <button
            ref={menuButton}
            className="lyt-header__menu"
            type="button"
            aria-label={menuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen(!menuOpen)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setMenuOpen(false);
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path
                d={
                  menuOpen ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </header>
      <aside
        id={menuId}
        className={`lyt-sidebar${menuOpen ? " lyt-sidebar--open" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className="lyt-sidebar__brand">
          <Brand />
        </div>
        <div className="lyt-sidebar__workspace">
          <span className="lyt-sidebar__workspace-icon" aria-hidden="true">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 9 9-6 9 6H3zm2 3v6m5-6v6m4-6v6m5-6v6M3 21h18" />
            </svg>
          </span>
          <div>
            <strong>Keuangan bisnis</strong>
            <span>Ruang kerja utama</span>
          </div>
        </div>
        <nav className="lyt-sidebar__nav" aria-label="Navigasi utama">
          <p className="lyt-sidebar__label">MENU UTAMA</p>
          <ul className="lyt-sidebar__list">
            {navItems.map((item) => {
              const content = (
                <>
                  <svg
                    className="lyt-sidebar__icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d={
                        NAV_ICONS[item.href] ??
                        "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
                      }
                    />
                  </svg>
                  <span className="lyt-sidebar__link-label">{item.label}</span>
                  {item.disabled ? (
                    <span className="lyt-sidebar__soon">Segera</span>
                  ) : null}
                </>
              );
              return (
                <li key={item.href}>
                  {item.disabled ? (
                    <span
                      aria-disabled="true"
                      className="lyt-sidebar__link lyt-sidebar__link--disabled"
                      title="Segera hadir"
                    >
                      {content}
                    </span>
                  ) : (
                    <a
                      className="lyt-sidebar__link"
                      href={item.href}
                      aria-current={activeItem === item ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                    >
                      {content}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="lyt-sidebar__footer">
          <span className="lyt-sidebar__footer-mark" aria-hidden="true">
            d.
          </span>
          <div>
            <strong>Duitin Business</strong>
            <span>Keuangan dalam kendali.</span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Header;
