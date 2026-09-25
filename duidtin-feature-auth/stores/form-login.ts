import { create } from "zustand";

interface FormLoginState {
  email: string;
  password: string;
  /** Pesan siap tampil dari server (`AuthError.message`), atau pesan jaringan. */
  pesanGalat: string | null;
  sedangKirim: boolean;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
  setPesanGalat: (pesan: string | null) => void;
  setSedangKirim: (sedang: boolean) => void;
  reset: () => void;
}

const AWAL = { email: "", password: "", pesanGalat: null, sedangKirim: false };

/**
 * State form login. Di store, bukan `useState` di komponen — aturan repo feature:
 * komponen cuma menampilkan, logikanya di hook, datanya di store.
 *
 * Ini store BISNIS milik repo ini, terpisah dari store SESI (`@duidtin/auth`)
 * yang dimiliki host. Yang lintas remote cuma sesinya.
 */
export const useFormLogin = create<FormLoginState>((set) => ({
  ...AWAL,
  setEmail: (email) => set({ email, pesanGalat: null }),
  setPassword: (password) => set({ password, pesanGalat: null }),
  setPesanGalat: (pesanGalat) => set({ pesanGalat }),
  setSedangKirim: (sedangKirim) => set({ sedangKirim }),
  reset: () => set(AWAL),
}));
