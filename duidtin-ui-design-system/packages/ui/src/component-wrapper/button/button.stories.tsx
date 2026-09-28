import { useEffect, useRef, useState } from "react";

import { NAMA_ELEMEN } from ".";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = { title: "Component Wrapper/dtn-button" };

export default meta;

type Story = StoryObj;

/**
 * Sengaja ditulis sebagai HTML biasa (`<dtn-button>`), bukan `<Button/>` React —
 * inilah yang nanti dilakukan remote Vue. React di sini cuma pemegang halaman.
 */
export const Dasar: Story = {
  name: "Atribut HTML",
  render: () => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <dtn-button color="primary">Masuk</dtn-button>
      <dtn-button variant="outline">Batal</dtn-button>
      <dtn-button color="primary" is-disabled="true">
        Nonaktif
      </dtn-button>
    </div>
  ),
};

export const Peristiwa: Story = {
  name: "CustomEvent press",
  render: function Render() {
    const wadah = useRef<HTMLDivElement>(null);
    const [jumlah, setJumlah] = useState(0);

    useEffect(() => {
      const el = wadah.current?.querySelector(NAMA_ELEMEN);
      const dengar = () => setJumlah((n) => n + 1);

      el?.addEventListener("press", dengar);

      return () => el?.removeEventListener("press", dengar);
    }, []);

    return (
      <div ref={wadah} style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <dtn-button color="primary">Tekan saya</dtn-button>
        <span className="ui-badge">ditekan {jumlah}x</span>
      </div>
    );
  },
};
