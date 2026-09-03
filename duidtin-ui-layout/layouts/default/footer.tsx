const FOOTER_LINKS = [
  { href: "/bantuan", label: "Bantuan" },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan" },
];

const Footer = () => (
  <footer className="lyt-footer">
    <div className="lyt-footer__inner">
      <span>&copy; {new Date().getFullYear()} duidtin. Semua hak dilindungi.</span>

      <div className="lyt-footer__links">
        {FOOTER_LINKS.map((link: { href: string; label: string }) => (
          <a className="lyt-footer__link" href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
      </div>
    </div>
  </footer>
);

export default Footer;
