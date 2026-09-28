import { create } from "zustand";

interface LoginUlangState {
  password: string;
  pesanGalat: string | null;
  sedangKirim: boolean;
  setPassword: (password: string) => void;
  setPesanGalat: (pesan: string | null) => void;
  setSedangKirim: (sedang: boolean) => void;
  reset: () => void;
}

const AWAL = { password: "", pesanGalat: null, sedangKirim: false };

/**
 * State modal login ulang. Terpisah dari `form-login` karena formnya beda:
 * di sini email sudah diketahui (dari sesi terakhir), yang diminta cuma password.
 */
export const useLoginUlang = create<LoginUlangState>((set) => ({
  ...AWAL,
  setPassword: (password) => set({ password, pesanGalat: null }),
  setPesanGalat: (pesanGalat) => set({ pesanGalat }),
  setSedangKirim: (sedangKirim) => set({ sedangKirim }),
  reset: () => set(AWAL),
}));
