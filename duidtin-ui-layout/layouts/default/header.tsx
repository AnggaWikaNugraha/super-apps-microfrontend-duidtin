import { Badge, Button } from "@/components/remote/design-system";

import type { NavItem } from "./types";

interface HeaderProps {
  activePath?: string;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/laporan", label: "Laporan" },
];

const Header = ({ activePath, navItems = DEFAULT_NAV_ITEMS, onLogout, userName }: HeaderProps) => (
  <header className="lyt-header">
    <div className="lyt-header__inner">
      <a className="lyt-header__brand" href="/">
        <span className="lyt-header__brand-mark">d</span>
        duidtin
      </a>

      <nav className="lyt-header__nav">
        {navItems.map((item: NavItem) => (
          <a
            className={`lyt-header__nav-link${item.href === activePath ? " lyt-header__nav-link--active" : ""}`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </a>
        ))}
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
