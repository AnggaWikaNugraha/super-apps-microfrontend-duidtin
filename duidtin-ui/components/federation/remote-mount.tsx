import { loadRemote } from "@module-federation/runtime";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";

/** Kontrak remote non-React: dikasih elemen + props, memulangkan fungsi pembongkar. */
type MountFn = (el: HTMLElement, props?: Record<string, unknown>) => () => void;

/**
 * Peristiwa navigasi dari remote. Harus sama persis dengan `utils/navigate.ts`
 * di tiap repo remote — disinkronkan dengan tangan, sama seperti "path berkas =
 * path URL = nama expose".
 *
 * Satu kategori dengan `SESSION_KEY`, `DESIGN_SYSTEM_REMOTE`, `dtn-change`, dan
 * `dtn-close`: kontrak lintas repo — mengganti namanya berarti mengubah host dan
 * semua remote sekaligus.
 */
export const NAVIGATE_EVENT = "duidtin:navigate";

interface NavigateDetail {
  /** Path tujuan DI HOST. Remote tahu tujuannya, host tahu caranya. */
  to: string;
  /** `true` → `router.replace`, tidak menambah entri history. */
  replace?: boolean;
}

interface RemoteMountProps {
  /** `"<nama-container>/<expose>"`, mis. `"duidtin_feature_beranda/base"`. */
  remote: string;
  /**
   * Diteruskan apa adanya ke `mount(el, props)`.
   *
   * Ini satu-satunya jalan data dari host ke remote non-React, dan yang paling
   * sering dikirim adalah bagian dari URL — `{ id }` untuk `/rekening/[id]`.
   * Host yang memiliki route, jadi host juga yang membaca parameternya; remote
   * tidak pernah menyentuh `location` sendiri.
   *
   * HANYA DATA, bukan fungsi. Lihat catatan di bawah.
   */
  props?: Record<string, unknown>;
}

/**
 * Jembatan ke remote yang BUKAN React.
 *
 * `components/remote/index.tsx` memuat remote React: modulnya mengekspor komponen,
 * jadi `next/dynamic` bisa langsung merendernya. Itu tidak berlaku untuk
 * `duidtin_feature_beranda` yang sekarang Vue — React tidak bisa merender
 * komponen Vue, dan sebaliknya.
 *
 * Yang bisa diseberangkan cuma DOM. Jadi kontraknya dibalik: remote mengekspor
 * sebuah FUNGSI, host menyediakan satu `<div>` kosong, dan remote yang mengurus
 * isinya dengan framework apa pun yang dia pakai.
 *
 *   const unmount = mount(el);   // waktu efek jalan
 *   unmount();                   // waktu efek dibersihkan
 *
 * Host tidak pernah tahu isinya Vue. Remote Svelte atau Angular nanti memakai
 * komponen ini apa adanya, tanpa satu baris pun berubah di sini.
 */
const RemoteMount = ({ remote, props }: RemoteMountProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // Dibandingkan sebagai STRING, bukan sebagai objek: `{ id: "1" }` yang dibuat
  // ulang tiap render harus dianggap sama. Itu sebabnya props dibatasi data saja —
  // fungsi tidak bisa diserialkan, dan memang tidak bisa diseberangkan ke Vue.
  const propsKey = JSON.stringify(props ?? null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let unmount: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        const mod = await loadRemote<{ default?: MountFn; mount?: MountFn }>(remote);
        const mount = mod?.mount ?? mod?.default;

        if (typeof mount !== "function") throw new Error(`Modul "${remote}" tidak mengekspor mount()`);

        // Efek bisa sudah dibersihkan sebelum modulnya sampai — jangan pasang
        // ke elemen yang sudah lepas dari DOM (dan ini terjadi tiap kali di dev:
        // StrictMode menjalankan efek dua kali).
        if (cancelled || !containerRef.current) return;

        unmount = mount(containerRef.current, props);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
      unmount?.();
    };
    // `props` sengaja TIDAK masuk daftar dependensi: objek literal berganti
    // identitas tiap render, dan ikut memasukkannya berarti app remote dibongkar
    // lalu dipasang ulang pada setiap render host. Perubahan nilainya ditangkap
    // lewat `propsKey` di bawah, yang membandingkan ISI-nya, bukan acuannya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remote, propsKey]);

  /**
   * Arah balik: remote minta pindah halaman, host yang melakukannya.
   *
   * Props membawa data MASUK, dan cuma data — fungsi tidak selamat lewat jalur
   * itu. Jadi `router.push` tidak pernah dikirim ke dalam; remote melempar
   * `CustomEvent` berisi tujuan, dan di sinilah tujuan itu diterjemahkan jadi
   * navigasi Next. Hasilnya pindah halaman tanpa reload, dari remote yang bahkan
   * bukan React.
   *
   * `preventDefault()` bukan formalitas: itu tanda "sudah saya tangani" yang
   * dibaca remote. Tanpa itu remote menganggap tidak ada host yang mendengar dan
   * jatuh ke `location.assign` — reload penuh, tapi tetap sampai.
   *
   * Pendengarnya di `<div>` ini, bukan di `window`: kalau nanti satu halaman
   * memuat dua remote, masing-masing cuma mengurus peristiwa dari pohonnya
   * sendiri. Konsekuensinya peristiwa dari dalam portal (overlay `<dtn-modal>`
   * dirender ke `document.body`) tidak lewat sini — dan itu memang bukan tempat
   * tautan navigasi.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNavigate = (event: Event) => {
      const { replace, to } = (event as CustomEvent<NavigateDetail>).detail ?? {};
      if (typeof to !== "string" || !to) return;

      event.preventDefault();
      void (replace ? router.replace(to) : router.push(to));
    };

    el.addEventListener(NAVIGATE_EVENT, handleNavigate);
    return () => el.removeEventListener(NAVIGATE_EVENT, handleNavigate);
  }, [router]);

  if (error) {
    return (
      <div role="alert" style={{ color: "#b42318", fontSize: 13, padding: 24 }}>
        Gagal memuat <code>{remote}</code>. {error.message}
      </div>
    );
  }

  return <div ref={containerRef} />;
};

export default RemoteMount;
