"""Menulis docs/arsitektur.svg dengan tangan — koordinatnya dihitung, bukan dikira-kira."""

W, H = 1140, 660
FONT = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

WARNA = {
    "biru":   dict(isi="#eff6ff", pita="#dbeafe", garis="#93c5fd", teks="#1e40af"),
    "hijau":  dict(isi="#f0fdf4", pita="#dcfce7", garis="#86efac", teks="#166534"),
    "oranye": dict(isi="#fff7ed", pita="#ffedd5", garis="#fdba74", teks="#9a3412"),
    "kuning": dict(isi="#fefce8", pita="#fef9c3", garis="#fde047", teks="#854d0e"),
    "ungu":   dict(isi="#faf5ff", pita="#f3e8ff", garis="#d8b4fe", teks="#6b21a8"),
}
ABU, GARIS, REDUP = "#475569", "#94a3b8", "#64748b"


def kartu(x, y, w, judul, baris, warna, tinggi_pita=30, tinggi_baris=17):
    c = WARNA[warna]
    h = tinggi_pita + len(baris) * tinggi_baris + 12
    p = [
        f'<g><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{c["isi"]}" stroke="{c["garis"]}" stroke-width="1.5"/>',
        f'<path d="M{x} {y+tinggi_pita} h{w} v-{tinggi_pita-10} a10 10 0 0 0 -10 -10 h-{w-20} a10 10 0 0 0 -10 10 z" fill="{c["pita"]}"/>',
        f'<text x="{x+w/2}" y="{y+20}" text-anchor="middle" font-family="{FONT}" font-size="13.5" font-weight="600" fill="{c["teks"]}">{judul}</text>',
    ]
    for i, b in enumerate(baris):
        p.append(
            f'<text x="{x+w/2}" y="{y+tinggi_pita+15+i*tinggi_baris}" text-anchor="middle" '
            f'font-family="{FONT}" font-size="11.5" fill="{REDUP}">{b}</text>'
        )
    p.append("</g>")
    return "\n  ".join(p), h


def panah(x1, y1, x2, y2, putus=False, lengkung=0):
    d = (f"M{x1} {y1} C{x1} {y1+lengkung} {x2} {y2-lengkung} {x2} {y2}" if lengkung
         else f"M{x1} {y1} L{x2} {y2}")
    dash = ' stroke-dasharray="5 4"' if putus else ""
    return (f'<path d="{d}" fill="none" stroke="{GARIS}" stroke-width="1.5"{dash} '
            f'marker-end="url(#ujung)"/>')


def label(x, y, teks, anchor="middle"):
    return (f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="{FONT}" '
            f'font-size="11" fill="{REDUP}">{teks}</text>')


def gambar(t):
    s = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-label="{t["alt"]}">',
        '<defs><marker id="ujung" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">'
        f'<path d="M0 0 L10 5 L0 10 z" fill="{GARIS}"/></marker></defs>',
        f'<rect width="{W}" height="{H}" fill="#ffffff"/>',
    ]

    # pengguna
    s.append(f'<rect x="510" y="18" width="120" height="30" rx="15" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>')
    s.append(f'<text x="570" y="38" text-anchor="middle" font-family="{FONT}" font-size="12.5" fill="{ABU}">{t["pengguna"]}</text>')
    s.append(panah(570, 48, 570, 74))

    # host
    host, h_host = kartu(400, 76, 340, "duidtin-ui — HOST", t["host"], "biru")
    s.append(host)
    y_host = 76 + h_host

    # kotak kelompok remote
    s.append(f'<rect x="24" y="196" width="1092" height="152" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" stroke-dasharray="6 5"/>')
    s.append(label(44, 341, t["grup"], "start"))

    kolom = [(44, "duidtin-ui-layout", t["layout"], "biru"),
             (312, "duidtin-feature-beranda", t["beranda"], "hijau"),
             (580, "duidtin-feature-rekening", t["rekening"], "hijau"),
             (848, "duidtin-feature-auth", t["auth"], "biru")]
    for x, judul, baris, warna in kolom:
        k, _ = kartu(x, 228, 248, judul, baris, warna)
        s.append(k)
        s.append(panah(570, y_host, x + 124, 224, lengkung=26))

    # design-system
    ds, h_ds = kartu(180, 420, 340, "duidtin-ui-design-system", t["ds"], "oranye")
    s.append(ds)
    s.append(panah(350, 348, 350, 416))
    s.append(label(360, 385, t["load"], "start"))

    # paket auth
    p, h_p = kartu(620, 420, 340, "@duidtin/auth", t["paket"], "kuning")
    s.append(p)
    s.append(panah(790, 348, 790, 416, putus=True))
    s.append(label(800, 385, t["impor"], "start"))

    # api
    api, _ = kartu(620, 556, 340, "duidtin-api", t["api"], "ungu")
    s.append(api)
    s.append(panah(790, 420 + h_p, 790, 552))
    s.append(label(800, 540, t["https"], "start"))

    s.append("</svg>")
    return "\n  ".join(s) + "\n"


ID = dict(
    alt="Arsitektur micro-frontend duidtin",
    pengguna="Pengguna",
    grup="dimuat saat runtime lewat remoteEntry.js",
    load="loadRemote — dari keempatnya",
    impor="import saat build — host + ketiga feature",
    https="HTTPS + Bearer",
    host=["Next 14.2 · webpack 5 · nextjs-mf 8.8.54", "MF runtime 0.24.1", "shell tipis — tidak merender UI sendiri"],
    layout=["Next 14.2 · webpack 5", "nextjs-mf 8.8.54 · MF 0.24.1", "header + footer tiap halaman"],
    beranda=["Vue 3.5 · Rsbuild", "rsbuild-plugin 0.24.1", "satu halaman, satu expose"],
    rekening=["Vue 3.5 · Rsbuild", "rsbuild-plugin 0.24.1", "DUA halaman, dua expose"],
    auth=["Next 16.2 · Rspack (next-rspack)", "enhanced 2.x · MF 2.x", "login + modal sesi berakhir"],
    ds=["Turborepo: apps/producer + packages/ui", "Rslib 0.19 · rsbuild-plugin 0.24.1 · MF 0.24.1", "React + elemen &lt;dtn-*&gt;"],
    paket=["file:../duidtin-packages/auth", "paket biasa, BUKAN remote", "tsc saja · zustand 5 (vanilla) + axios 1"],
    api=["Express 5 · Mongoose 8.24.4 (dikunci)", "Zod 4 · JWT HS256 · bcryptjs", "MongoDB Atlas"],
)

EN = dict(
    ID,
    alt="duidtin micro-frontend architecture",
    pengguna="User",
    grup="loaded at runtime via remoteEntry.js",
    load="loadRemote — from all four",
    impor="imported at build time — host + all three features",
    host=["Next 14.2 · webpack 5 · nextjs-mf 8.8.54", "MF runtime 0.24.1", "a thin shell — renders no UI of its own"],
    layout=["Next 14.2 · webpack 5", "nextjs-mf 8.8.54 · MF 0.24.1", "header + footer on every page"],
    beranda=["Vue 3.5 · Rsbuild", "rsbuild-plugin 0.24.1", "one page, one expose"],
    rekening=["Vue 3.5 · Rsbuild", "rsbuild-plugin 0.24.1", "TWO pages, two exposes"],
    auth=["Next 16.2 · Rspack (next-rspack)", "enhanced 2.x · MF 2.x", "login + session-expired modal"],
    ds=["Turborepo: apps/producer + packages/ui", "Rslib 0.19 · rsbuild-plugin 0.24.1 · MF 0.24.1", "React + &lt;dtn-*&gt; elements"],
    paket=["file:../duidtin-packages/auth", "a plain package, NOT a remote", "tsc only · zustand 5 (vanilla) + axios 1"],
    api=["Express 5 · Mongoose 8.24.4 (pinned)", "Zod 4 · JWT HS256 · bcryptjs", "MongoDB Atlas"],
)

if __name__ == "__main__":
    import pathlib, sys
    akar = pathlib.Path(sys.argv[1])
    (akar / "docs").mkdir(exist_ok=True)
    (akar / "docs/arsitektur.svg").write_text(gambar(ID))
    (akar / "docs/arsitektur.en.svg").write_text(gambar(EN))
    print("docs/arsitektur.svg + docs/arsitektur.en.svg ditulis")
