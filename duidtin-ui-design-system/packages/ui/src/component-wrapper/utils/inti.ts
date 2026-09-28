import { createElement, createRef, type ComponentType } from "react";
import { createRoot, type Root } from "react-dom/client";

/**
 * Pabrik Web Component untuk komponen React design-system.
 *
 * MASALAH YANG DIPECAHKAN: `createRoot().render()` menimpa isi elemen, padahal
 * hampir semua komponen kita menerima konten — label tombol, isi kartu, judul alert.
 * Pustaka siap pakai (`@r2wc/react-to-web-component`) tidak menyentuh `childNodes`
 * sama sekali, jadi konten itu hilang.
 *
 * CARANYA: React tidak pernah diberi seluruh elemen. Ia diberi satu `<span>` wadah
 * yang ditambahkan di akhir, sementara anak ASLI tetap di tempatnya. Setelah render,
 * anak asli dipindahkan ke dalam slot di hasil render. Anak tidak pernah masuk
 * DocumentFragment, jadi elemen bersarang (`<dtn-alert-title>`) tidak ikut lepas dari
 * dokumen dan React root-nya tidak sempat ter-unmount.
 *
 * SENGAJA TANPA SHADOW DOM: CSS design-system berbasis kelas global (`ui-alert`),
 * dan shadow boundary akan memutusnya. Dengan light DOM, `./globals` yang sudah ada
 * tetap berlaku tanpa perubahan apa pun.
 */
export type TipeProp = "string" | "number" | "boolean" | "json";

export interface OpsiElemen {
  /** Atribut yang dipantau + cara menafsirkan nilainya. */
  props?: Record<string, TipeProp>;
  /** Prop React → nama DOM event. `onPress: "press"` → `CustomEvent("press")`. */
  events?: Record<string, string>;
}

const keKebab = (nama: string) => nama.replace(/[A-Z]/g, (huruf) => `-${huruf.toLowerCase()}`);

const tafsir = (nilai: string | null, tipe: TipeProp): unknown => {
  if (nilai === null) return undefined;

  switch (tipe) {
    case "boolean":
      // atribut kosong = true (`<dtn-button is-disabled>`), "false" = false
      return nilai !== "false";
    case "number":
      return Number(nilai);
    case "json":
      try {
        return JSON.parse(nilai);
      } catch {
        return undefined;
      }
    default:
      return nilai;
  }
};

export const buatElemen = (nama: string, Komponen: ComponentType<never>, opsi: OpsiElemen = {}): void => {
  if (typeof window === "undefined" || customElements.get(nama)) return;

  const daftarProp = Object.entries(opsi.props ?? {});

  class ElemenDuidtin extends HTMLElement {
    static observedAttributes = daftarProp.map(([propName]) => keKebab(propName));

    #wadah?: HTMLSpanElement;
    #anak?: HTMLSpanElement;
    #root?: Root;
    #slot = createRef<HTMLSpanElement>();

    connectedCallback() {
      if (!this.#root) {
        // anak asli dibungkus SATU span permanen, jadi posisinya bisa dipindah
        // tanpa pernah lepas dari dokumen — elemen bersarang tidak ikut unmount
        this.#anak = document.createElement("span");
        this.#anak.style.display = "contents";
        this.#anak.dataset.dtnAnak = "";
        this.#anak.append(...this.childNodes);
        this.append(this.#anak);

        this.#wadah = document.createElement("span");
        this.#wadah.style.display = "contents";
        this.#wadah.dataset.dtnWadah = "";
        this.append(this.#wadah);
        this.#root = createRoot(this.#wadah);
      }

      this.#render();
    }

    attributeChangedCallback() {
      if (this.#root) this.#render();
    }

    disconnectedCallback() {
      // elemen yang cuma DIPINDAH akan tersambung lagi di tugas yang sama —
      // unmount ditunda supaya perpindahan tidak menghancurkan React root-nya
      setTimeout(() => {
        if (this.isConnected) return;

        // kembalikan pembungkus anak ke elemen ini, supaya bisa di-slot ulang nanti
        if (this.#anak) this.prepend(this.#anak);

        this.#root?.unmount();
        this.#root = undefined;
        this.#wadah?.remove();
        this.#wadah = undefined;
      }, 0);
    }

    #props(): Record<string, unknown> {
      const props: Record<string, unknown> = {};

      for (const [propName, tipe] of daftarProp) {
        const nilai = tafsir(this.getAttribute(keKebab(propName)), tipe);

        if (nilai !== undefined) props[propName] = nilai;
      }

      for (const [propName, namaEvent] of Object.entries(opsi.events ?? {})) {
        props[propName] = (detail: unknown) => {
          this.dispatchEvent(new CustomEvent(namaEvent, { bubbles: true, detail }));
        };
      }

      return props;
    }

    #render() {
      const slot = createElement("span", { ref: this.#slot, style: { display: "contents" } });

      this.#root?.render(createElement(Komponen as ComponentType<Record<string, unknown>>, this.#props(), slot));

      // React merender asinkron; tempatkan pembungkus anak setelah slot-nya ada
      queueMicrotask(() => this.#tempatkanAnak());
    }

    /**
     * Komponen bisa TIDAK merender slot-nya — mis. `DataState` saat memuat atau gagal
     * menampilkan fallback, bukan children. Dalam keadaan itu anak asli disembunyikan,
     * bukan dihapus, supaya muncul lagi begitu komponennya merender slot.
     */
    #tempatkanAnak() {
      if (!this.#anak) return;

      if (this.#slot.current) {
        this.#anak.style.display = "contents";

        if (this.#anak.parentNode !== this.#slot.current) this.#slot.current.append(this.#anak);

        return;
      }

      this.#anak.style.display = "none";

      if (this.#anak.parentNode !== this) this.append(this.#anak);
    }
  }

  customElements.define(nama, ElemenDuidtin);
};
