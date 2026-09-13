import Footer from "./footer";
import Header from "./header";

import type { NavItem } from "./types";
import type { ReactNode } from "react";

interface DefaultLayoutProps {
  activePath?: string;
  children?: ReactNode;
  navItems?: NavItem[];
  onLogout?: () => void;
  userName?: string;
}

/**
 * Layout utama yang di-expose ke host (`./default`). Host bungkus konten tiap
 * halaman pakai komponen ini: <Default>{page}</Default>.
 */
const Default = ({
  activePath,
  children,
  navItems,
  onLogout,
  userName,
}: DefaultLayoutProps) => (
  <div className="lyt-layout">
    <a className="lyt-layout__skip" href="#duitin-main">
      Langsung ke konten
    </a>
    <Header
      activePath={activePath}
      navItems={navItems}
      onLogout={onLogout}
      userName={userName}
    />

    <main id="duitin-main" tabIndex={-1} className="lyt-layout__main">
      {children}
    </main>

    <Footer />
  </div>
);

export default Default;
