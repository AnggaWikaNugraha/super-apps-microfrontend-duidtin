const FOOTER_LINKS = [
  { href: "/bantuan", label: "Bantuan" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
];

const Footer = () => (
  <footer className="lyt-footer">
    <div className="lyt-footer__inner">
      <span>
        &copy; {new Date().getFullYear()} Duitin Business. Semua hak dilindungi.
      </span>

      <nav className="lyt-footer__links" aria-label="Informasi dan bantuan">
        {FOOTER_LINKS.map((link: { href: string; label: string }) => (
          <a className="lyt-footer__link" href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
    </div>
  </footer>
);

export default Footer;
