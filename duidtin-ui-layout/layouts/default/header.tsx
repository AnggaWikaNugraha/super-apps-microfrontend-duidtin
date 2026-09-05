import { Badge, Button } from "@/components/remote/design-system";

import type { NavItem } from "./types";

interface HeaderProps {
  activePath?: string;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

/**
 * Menu bawaan — dipakai kalau host nggak ngirim `navItems`.
 *
 * `disabled: true` buat fitur yang remote-nya belum dibikin: tetap kelihatan
 * di menu (biar peta fiturnya jelas) tapi nggak bisa diklik, jadi nggak ada
 * tautan yang 404. Hapus flag-nya begitu remote-nya jalan.
 *
 * Nanti daftar ini idealnya datang dari host berdasarkan peran user (maker
 * cuma lihat menu bikin, checker lihat menu persetujuan), lewat prop
 * `navItems` yang sudah tersedia.
 */
const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/payroll", label: "Payroll", disabled: true },
  { href: "/transfer", label: "Transfer", disabled: true },
  { href: "/mutasi", label: "Mutasi", disabled: true },
  { href: "/persetujuan", label: "Persetujuan", disabled: true },
];

const Header = ({ activePath, navItems = DEFAULT_NAV_ITEMS, onLogout, userName }: HeaderProps) => (
  <header className="lyt-header">
    <div className="lyt-header__inner">
      <a className="lyt-header__brand" href="/">
        <span className="lyt-header__brand-mark">d</span>
        duidtin
      </a>

      <nav className="lyt-header__nav">
        {navItems.map((item: NavItem) =>
          item.disabled ? (
            <span
              aria-disabled="true"
              className="lyt-header__nav-link lyt-header__nav-link--disabled"
              key={item.href}
              title="Segera hadir"
            >
              {item.label}
            </span>
          ) : (
            <a
              className={`lyt-header__nav-link${item.href === activePath ? " lyt-header__nav-link--active" : ""}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </a>
          ),
        )}
      </nav>

      <div className="lyt-header__actions">
        {/* Badge & Button di bawah ini dari duidtin-ui-design-system, bukan dari repo ini —
            bukti pola "remote manggil remote lain" beneran jalan */}
        {userName ? (
          <Badge color="primary" variant="soft">
            {userName}
          </Badge>
        ) : null}
        <Button color="default" onPress={onLogout} size="sm" variant="outline">
          Keluar
        </Button>
      </div>
    </div>
  </header>
);

export default Header;
