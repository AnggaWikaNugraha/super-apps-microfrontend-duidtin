import { loadRemote } from "@module-federation/runtime";
import { useEffect, useRef, useState } from "react";

/** Kontrak remote non-React: dikasih elemen, memulangkan fungsi pembongkar. */
type Pemasang = (el: HTMLElement) => () => void;

interface RemoteMountProps {
  /** `"<nama-container>/<expose>"`, mis. `"duidtin_feature_beranda/base"`. */
  modul: string;
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
 *   const lepas = mount(el);   // waktu efek jalan
 *   lepas();                   // waktu efek dibersihkan
 *
 * Host tidak pernah tahu isinya Vue. Remote Svelte atau Angular nanti memakai
 * komponen ini apa adanya, tanpa satu baris pun berubah di sini.
 */
const RemoteMount = ({ modul }: RemoteMountProps) => {
  const wadah = useRef<HTMLDivElement>(null);
  const [gagal, setGagal] = useState<Error | null>(null);

  useEffect(() => {
    let lepas: (() => void) | undefined;
    let dibatalkan = false;

    void (async () => {
      try {
        const mod = await loadRemote<{ default?: Pemasang; mount?: Pemasang }>(modul);
        const mount = mod?.mount ?? mod?.default;

        if (typeof mount !== "function") throw new Error(`Modul "${modul}" tidak mengekspor mount()`);

        // Efek bisa sudah dibersihkan sebelum modulnya sampai — jangan pasang
        // ke elemen yang sudah lepas dari DOM (dan ini terjadi tiap kali di dev:
        // StrictMode menjalankan efek dua kali).
        if (dibatalkan || !wadah.current) return;

        lepas = mount(wadah.current);
      } catch (kesalahan) {
        setGagal(kesalahan instanceof Error ? kesalahan : new Error(String(kesalahan)));
      }
    })();

    return () => {
      dibatalkan = true;
      lepas?.();
    };
  }, [modul]);

  if (gagal) {
    return (
      <div role="alert" style={{ color: "#b42318", fontSize: 13, padding: 24 }}>
        Gagal memuat <code>{modul}</code>. {gagal.message}
      </div>
    );
  }

  return <div ref={wadah} />;
};

export default RemoteMount;
