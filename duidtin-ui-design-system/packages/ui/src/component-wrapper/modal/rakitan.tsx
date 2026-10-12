// DITULIS TANGAN — berkas ini TIDAK ikut `bun run gen:wrapper`.
// Yang di-generate cuma `index.ts` di sebelahnya, yang mengimpor berkas ini.

import { Modal } from "../../components/modal";
import { buatElemenRakitan } from "../utils/inti";
import { peta } from "../utils/peta";

interface Props {
  heading?: string;
  isDismissable?: boolean;
  isOpen?: boolean;
}

/**
 * Dibuka lewat atribut `is-open`, BUKAN lewat tombol pemicu di dalamnya.
 *
 * `Modal.Root` aslinya `DialogTrigger` — dia mengandaikan tombol pemicunya ikut
 * jadi anak, supaya fokus bisa dikembalikan ke tombol itu saat modal ditutup.
 * Di dunia custom element, tombolnya hampir selalu ada di luar dan milik
 * framework lain, jadi `DialogTrigger` dilewati dan `Modal.Content` dipakai
 * langsung dalam mode terkendali.
 *
 * Konsekuensi yang harus disadari: **fokus tidak otomatis kembali** ke tombol
 * pembuka. Konsumen yang peduli aksesibilitas perlu mengembalikannya sendiri
 * saat menerima event `close`.
 *
 * Isinya dari anak light DOM. React Aria merender overlay-nya lewat portal ke
 * `document.body`; slot-nya ikut ke sana, dan pembungkus memindahkan anak asli
 * ke dalam slot itu — tetap satu dokumen, jadi elemen bersarang tidak ikut
 * ter-unmount. Saat modal tertutup slot-nya hilang, React memanggil `ref(null)`,
 * dan anaknya disembunyikan lalu dikembalikan — bukan dihapus.
 */
buatElemenRakitan(
  "dtn-modal",
  ({ heading, isDismissable = true, isOpen = false }: Props, { kirim, slot }) => (
    <Modal.Content
      isDismissable={isDismissable}
      isOpen={isOpen}
      onOpenChange={(terbuka) => {
        if (!terbuka) kirim("dtn-close");
      }}
    >
      {heading ? <Modal.Heading>{heading}</Modal.Heading> : null}
      <Modal.Body>{slot}</Modal.Body>
    </Modal.Content>
  ),
  { props: peta.modal.props },
);

export {};
