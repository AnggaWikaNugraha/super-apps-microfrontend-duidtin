// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { Select } from "../../components/select";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Pilihan {
  id: string;
  label: string;
}

interface Props {
  isDisabled?: boolean;
  isRequired?: boolean;
  items?: Pilihan[];
  label?: string;
  name?: string;
  placeholder?: string;
  value?: string;
}

/**
 * Pilihannya dari atribut `items` (JSON), BUKAN dari elemen anak.
 *
 * `Select.Item` harus terdaftar ke `ListBox` lewat Context milik React Aria —
 * itu yang memberinya id, peran ARIA, dan navigasi panah. Kalau tiap item jadi
 * custom element sendiri, pendaftaran itu tidak pernah terjadi: daftarnya
 * tampil tapi keyboard mati dan `aria-activedescendant` kosong.
 *
 * Bentuk JSON-nya sama dengan yang sudah dipakai chart:
 *   items='[{"id":"IDR","label":"Rupiah"},{"id":"USD","label":"Dolar AS"}]'
 *
 * Tidak terkendali, alasannya sama dengan `text-field`.
 */
buatElemenRakitan(
  "dtn-select",
  ({ isDisabled, isRequired, items = [], label, name, placeholder, value }: Props, { kirim }) => (
    <Select
      defaultSelectedKey={value}
      isDisabled={isDisabled}
      isRequired={isRequired}
      name={name}
      onSelectionChange={(kunci) => kirim("dtn-change", kunci)}
      placeholder={placeholder}
    >
      {label ? <Select.Label>{label}</Select.Label> : null}
      <Select.Trigger />
      <Select.Popover>
        {items.map((pilihan) => (
          <Select.Item key={pilihan.id} id={pilihan.id}>
            {pilihan.label}
          </Select.Item>
        ))}
      </Select.Popover>
    </Select>
  ),
  { props: peta.select.props },
);

export {};
