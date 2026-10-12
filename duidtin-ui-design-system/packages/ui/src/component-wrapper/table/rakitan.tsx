// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { Table } from "../../components/table";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Kolom {
  id: string;
  label: string;
  /** Kolom pembeda baris — tepat satu kolom harus memilikinya. Default: kolom pertama. */
  isRowHeader?: boolean;
}

interface Props {
  columns?: Kolom[];
  rows?: Record<string, string | number>[];
  size?: string;
}

/**
 * Kolom dan baris dari atribut JSON, dan **isi sel sebatas teks**.
 *
 * Ini batas yang paling terasa di antara keenam elemen rakitan. Versi React-nya
 * boleh menaruh apa saja di dalam sel — badge, tombol, ikon. Di sini tidak bisa:
 * satu elemen cuma punya satu slot anak, sementara tabel butuh satu slot per sel.
 *
 * Untuk tabel yang selnya butuh komponen, konsumen non-React lebih baik menulis
 * `<table>` biasa dengan kelas CSS design-system — persis yang dilakukan beranda
 * di `fber-transactions`. Elemen ini untuk tabel data yang isinya memang teks.
 *
 * `isRowHeader` wajib ada di tepat satu kolom (React Aria memakainya untuk
 * menamai baris bagi pembaca layar); kalau tidak disebut, kolom pertama dipakai.
 */
buatElemenRakitan(
  "dtn-table",
  ({ columns = [], rows = [], size }: Props) => (
    <Table size={size as never} aria-label="Tabel data">
      <Table.Header>
        {columns.map((kolom, i) => (
          <Table.Column key={kolom.id} id={kolom.id} isRowHeader={kolom.isRowHeader ?? i === 0}>
            {kolom.label}
          </Table.Column>
        ))}
      </Table.Header>
      <Table.Body>
        {rows.map((baris, i) => (
          <Table.Row key={String(baris.id ?? i)}>
            {columns.map((kolom) => (
              <Table.Cell key={kolom.id}>{baris[kolom.id] ?? ""}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
  { props: peta.table.props },
);

export {};
