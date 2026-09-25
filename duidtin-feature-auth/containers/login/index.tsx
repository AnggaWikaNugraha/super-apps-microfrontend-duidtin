import { Alert, Button, TextField, TextFieldInput, TextFieldLabel } from "@/components/remote/design-system";
import { useLogin } from "@/hooks/use-login";

export interface LoginContainerProps {
  /**
   * Dipanggil setelah login berhasil dan sesi sudah tersimpan.
   *
   * Remote ini SENGAJA tidak melakukan pengalihan sendiri: route `/login` dan
   * `/` milik host, dan remote tidak boleh tahu peta route host — pola yang
   * sama dengan `onLogout` di `duidtin-ui-layout`.
   */
  onSuccess?: () => void;
}

/**
 * Halaman login — di-expose sebagai "./login" dan dirender host di route `/login`.
 *
 * Komponen ini hanya merangkai tampilan; semua aksinya ada di `useLogin`, dan
 * state form-nya di `stores/form-login.ts`.
 */
const LoginContainer = ({ onSuccess }: LoginContainerProps) => {
  const { bisaKirim, fieldEmail, fieldPassword, kirim, pesanGalat, sedangKirim } = useLogin({ onSuccess });

  return (
    <main className="fath-login">
      <div className="fath-login__panel">
        <div className="fath-login__brand">
          <span className="fath-login__logo">duitin.</span>
          <span className="fath-login__tagline">Business Banking</span>
        </div>

        {/* Pesan galat cukup SATU tempat. Kedua field ikut ditandai merah lewat
            `isInvalid`, tapi kalimatnya tidak diulang di bawah masing-masing field. */}
        {pesanGalat ? <Alert variant="danger">{pesanGalat}</Alert> : null}

        <form className="fath-login__form" noValidate onSubmit={kirim}>
          <TextField {...fieldEmail}>
            <TextFieldLabel>Email</TextFieldLabel>
            <TextFieldInput placeholder="nama@perusahaan.co.id" />
          </TextField>

          <TextField {...fieldPassword}>
            <TextFieldLabel>Password</TextFieldLabel>
            <TextFieldInput placeholder="••••••••" />
          </TextField>

          <div className="fath-login__actions">
            <Button color="primary" isDisabled={!bisaKirim} type="submit">
              {sedangKirim ? "Memproses…" : "Masuk"}
            </Button>
          </div>
        </form>

        <p className="fath-login__hint">
          Akun dibuat oleh admin perusahaan. Tidak ada pendaftaran mandiri di aplikasi ini.
        </p>
      </div>
    </main>
  );
};

export default LoginContainer;
