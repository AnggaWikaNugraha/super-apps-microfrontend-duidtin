import {
  Alert,
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeading,
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from "@/components/remote/design-system";
import { useLoginUlang } from "@/hooks/use-login-ulang";

/**
 * Modal "sesi berakhir" — di-expose sebagai "./sesi-berakhir".
 *
 * Host merendernya DI ATAS halaman yang sedang dibuka (tanpa pindah route) begitu
 * status sesi jadi "kedaluwarsa". Halaman di belakangnya tetap utuh, dan request
 * yang tertahan di `@duidtin/auth` otomatis lanjut setelah password benar.
 *
 * `isDismissable={false}`: tidak boleh ditutup dengan Esc atau klik luar — satu-satunya
 * jalan keluar adalah masuk lagi atau keluar.
 */
const SesiBerakhirContainer = () => {
  const { bisaKirim, fieldPassword, keluar, kirim, penggunaTerakhir, pesanGalat, sedangKirim } = useLoginUlang();

  return (
    <ModalContent isDismissable={false} isOpen>
      <ModalHeading>Sesi berakhir</ModalHeading>

      <ModalBody>
        <form className="fath-lagi" id="form-login-ulang" noValidate onSubmit={kirim}>
          <p className="fath-lagi__keterangan">
            Sesi kamu sudah berakhir. Masukkan password untuk melanjutkan — halaman yang sedang kamu buka tidak akan
            hilang.
          </p>

          <div className="fath-lagi__pengguna">
            <span className="fath-lagi__nama">{penggunaTerakhir?.nama}</span>
            <span className="fath-lagi__email">{penggunaTerakhir?.email}</span>
          </div>

          {pesanGalat ? <Alert variant="danger">{pesanGalat}</Alert> : null}

          <TextField {...fieldPassword}>
            <TextFieldLabel>Password</TextFieldLabel>
            <TextFieldInput placeholder="••••••••" />
          </TextField>
        </form>
      </ModalBody>

      <ModalFooter>
        <Button isDisabled={sedangKirim} onPress={keluar} variant="outline">
          Keluar
        </Button>
        <Button color="primary" isDisabled={!bisaKirim} onPress={kirim} type="submit">
          {sedangKirim ? "Memproses…" : "Masuk"}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
};

export default SesiBerakhirContainer;
