// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { TextField } from "../../components/text-field";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Props {
  description?: string;
  errorMessage?: string;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isRequired?: boolean;
  label?: string;
  name?: string;
  placeholder?: string;
  type?: string;
  value?: string;
}

/**
 * `value` dipasang sebagai `defaultValue`, jadi elemennya TIDAK TERKENDALI.
 *
 * Kalau dipasang sebagai `value`, tiap ketikan harus bolak-balik lewat atribut:
 * React Aria memanggil onChange → elemen mengirim event → konsumen memperbarui
 * atribut → `attributeChangedCallback` → render ulang seluruh pohon. Satu putaran
 * penuh per huruf, dan kalau konsumen lupa memperbarui atributnya, inputnya
 * terkunci total. Dengan `defaultValue`, input memegang keadaannya sendiri dan
 * konsumen cukup mendengarkan.
 *
 * Dua event, mengikuti kebiasaan DOM: tiap ketikan dan saat blur. Namanya diberi
 * awalan `dtn-` karena `<input>` di dalamnya SUDAH memancarkan `input` dan
 * `change` native yang ikut menggelembung keluar elemen — tanpa awalan, konsumen
 * menerima dua event dengan nama sama, satu di antaranya tanpa `detail`.
 * Pola yang sama dipakai pustaka Web Component lain (`sl-`, `ion-`).
 */
buatElemenRakitan(
  "dtn-text-field",
  ({ description, errorMessage, isDisabled, isInvalid, isRequired, label, name, placeholder, type, value }: Props, { kirim }) => (
    <TextField
      defaultValue={value}
      isDisabled={isDisabled}
      isInvalid={isInvalid}
      isRequired={isRequired}
      name={name}
      onBlur={(e) => kirim("dtn-change", (e.target as HTMLInputElement).value)}
      onChange={(nilai) => kirim("dtn-input", nilai)}
      type={type}
    >
      {label ? <TextField.Label>{label}</TextField.Label> : null}
      <TextField.Input placeholder={placeholder} />
      {description ? <TextField.Description>{description}</TextField.Description> : null}
      {errorMessage ? <TextField.Error>{errorMessage}</TextField.Error> : null}
    </TextField>
  ),
  { props: peta["text-field"].props },
);

export {};
