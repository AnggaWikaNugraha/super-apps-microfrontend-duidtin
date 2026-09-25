import { AuthError, login } from "@duidtin/auth";
import { useShallow } from "zustand/react/shallow";

import { useFormLogin } from "@/stores/form-login";

import "@/services/auth";

import type { FormEvent } from "react";

/**
 * Pesan yang ditampilkan ke pengguna.
 *
 * `AuthError.message` datang dari `duidtin-api` dan SUDAH ramah dibaca
 * ("Email atau password salah.", "Akun terkunci sementara…"), jadi tidak
 * diterjemahkan ulang di sini — kalau backend memperbaiki kalimatnya, FE ikut
 * tanpa deploy. Yang perlu ditangani cuma kegagalan yang tidak punya pesan:
 * jaringan putus / server mati (`status` 0).
 */
const pesanUntuk = (galat: unknown): string => {
  if (galat instanceof AuthError) {
    if (galat.status === 0) return "Tidak bisa menghubungi server. Periksa koneksi lalu coba lagi.";

    return galat.message;
  }

  return "Terjadi kesalahan tak terduga. Coba lagi.";
};

/**
 * Properti siap-pasang untuk satu `TextField` design-system.
 *
 * Perangkaiannya (`value`, `onChange`, keadaan disabled/invalid) ditentukan DI
 * SINI, bukan di komponen — komponen cukup menyebarkannya: `<TextField {...fieldEmail}>`.
 */
export interface FieldTeks {
  autoComplete: string;
  isDisabled: boolean;
  isInvalid: boolean;
  isRequired: boolean;
  name: string;
  onChange: (nilai: string) => void;
  type: "email" | "password";
  value: string;
}

export interface OpsiUseLogin {
  /** Dipanggil setelah sesi tersimpan. Pengalihan halaman tugas HOST, bukan remote ini. */
  onSuccess?: () => void;
}

/**
 * Seluruh logika halaman login. Komponennya tinggal merangkai tampilan.
 */
export const useLogin = ({ onSuccess }: OpsiUseLogin = {}) => {
  const { email, password, pesanGalat, sedangKirim, setEmail, setPassword, setPesanGalat, setSedangKirim } =
    useFormLogin(
      useShallow((state) => ({
        email: state.email,
        password: state.password,
        pesanGalat: state.pesanGalat,
        sedangKirim: state.sedangKirim,
        setEmail: state.setEmail,
        setPassword: state.setPassword,
        setPesanGalat: state.setPesanGalat,
        setSedangKirim: state.setSedangKirim,
      })),
    );

  const bisaKirim = email.trim() !== "" && password !== "" && !sedangKirim;

  const kirim = async (peristiwa?: FormEvent) => {
    peristiwa?.preventDefault();

    if (!bisaKirim) return;

    setSedangKirim(true);
    setPesanGalat(null);

    try {
      // login() menulis sesi ke store milik host — remote ini tidak menyimpan apa pun sendiri
      await login(email.trim(), password);

      setPassword("");
      onSuccess?.();
    } catch (galat) {
      setPesanGalat(pesanUntuk(galat));
    } finally {
      setSedangKirim(false);
    }
  };

  const fieldEmail: FieldTeks = {
    autoComplete: "username",
    isDisabled: sedangKirim,
    isInvalid: pesanGalat !== null,
    isRequired: true,
    name: "email",
    onChange: setEmail,
    type: "email",
    value: email,
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

  return { bisaKirim, fieldEmail, fieldPassword, kirim, pesanGalat, sedangKirim };
};
