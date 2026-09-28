import { AuthError, login, logout } from "@duidtin/auth";
import { useAuth } from "@duidtin/auth/react";
import { useShallow } from "zustand/react/shallow";

import { useLoginUlang as useStoreLoginUlang } from "@/stores/login-ulang";

import "@/services/auth";

import type { FormEvent } from "react";

import type { FieldTeks } from "./use-login";

const pesanUntuk = (galat: unknown): string => {
  if (galat instanceof AuthError) {
    if (galat.status === 0) return "Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.";

    return galat.message;
  }

  return "Terjadi kesalahan tak terduga. Coba lagi.";
};

/**
 * Logika modal "sesi berakhir".
 *
 * Bedanya dengan `useLogin`: email tidak diminta, diambil dari `penggunaTerakhir`
 * di store sesi. Dan setelah berhasil **tidak ada pengalihan halaman** — pengguna
 * tetap di halaman yang sama, dan request yang tadi tertahan di paket auth otomatis
 * dilanjutkan. Itu inti pola ini: pekerjaan tidak hilang.
 */
export const useLoginUlang = () => {
  const { penggunaTerakhir } = useAuth();
  const { password, pesanGalat, sedangKirim, setPassword, setPesanGalat, setSedangKirim, reset } = useStoreLoginUlang(
    useShallow((state) => ({
      password: state.password,
      pesanGalat: state.pesanGalat,
      sedangKirim: state.sedangKirim,
      setPassword: state.setPassword,
      setPesanGalat: state.setPesanGalat,
      setSedangKirim: state.setSedangKirim,
      reset: state.reset,
    })),
  );

  const bisaKirim = password !== "" && !sedangKirim && penggunaTerakhir !== null;

  const kirim = async (peristiwa?: FormEvent) => {
    peristiwa?.preventDefault();

    if (!bisaKirim || !penggunaTerakhir) return;

    setSedangKirim(true);
    setPesanGalat(null);

    try {
      await login(penggunaTerakhir.email, password);

      // store berubah ke "authenticated" → modal ditutup host, request tertahan lanjut
      reset();
    } catch (galat) {
      setPesanGalat(pesanUntuk(galat));
    } finally {
      setSedangKirim(false);
    }
  };

  /** Keluar sepenuhnya: sesi dilupakan, request yang tertahan ditolak, host ke /login. */
  const keluar = async () => {
    reset();
    await logout();
  };

  const fieldPassword: FieldTeks = {
    autoComplete: "current-password",
    isDisabled: sedangKirim,
    isInvalid: pesanGalat !== null,
    isRequired: true,
    name: "password",
    onChange: setPassword,
    type: "password",
    value: password,
  };

  return { bisaKirim, fieldPassword, keluar, kirim, penggunaTerakhir, pesanGalat, sedangKirim };
};
