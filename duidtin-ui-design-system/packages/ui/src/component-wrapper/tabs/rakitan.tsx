// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { Tabs } from "../../components/tabs";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Tab {
  id: string;
  label: string;
}

interface Props {
  items?: Tab[];
  value?: string;
}

/**
 * SATU panel saja yang dirender — panel yang sedang aktif — dan isinya dari
 * anak light DOM.
 *
 * Alternatifnya merender semua panel sekaligus, tapi itu berarti isi tiap tab
 * harus ikut masuk atribut JSON, dan isinya jadi sebatas teks. Dengan satu
 * panel, isinya boleh markup apa pun dari framework konsumen — dan konsumen
 * yang menukar isinya saat menerima event `change`.
 *
 * Karena itu elemen ini **terkendali**: `value` wajib diisi, kalau tidak panel
 * tidak tahu id-nya dan `aria-controls` putus. Beda dari `text-field` dan
 * `select` yang justru tidak terkendali — di sini atribut itu memang harus
 * jadi sumber kebenaran.
 */
buatElemenRakitan(
  "dtn-tabs",
  ({ items = [], value }: Props, { kirim, slot }) => (
    <Tabs selectedKey={value} onSelectionChange={(kunci) => kirim("dtn-change", kunci)}>
      <Tabs.List>
        {items.map((tab) => (
          <Tabs.Tab key={tab.id} id={tab.id}>
            {tab.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {value ? <Tabs.Panel id={value}>{slot}</Tabs.Panel> : null}
    </Tabs>
  ),
  { props: peta.tabs.props },
);

export {};
