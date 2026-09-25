/**
 * Tujuan setelah login, dibaca dari `?dari=`.
 *
 * HANYA path internal yang diterima ("/beranda", bukan "//jahat.example" atau
 * "https://…"). Tanpa penjaga ini, tautan `/login?dari=https://jahat.example`
 * membuat host memantulkan pengguna ke situs orang lain setelah login —
 * open redirect.
 */
export const tujuanSetelahLogin = (dari: string | string[] | undefined): string => {
  const nilai = Array.isArray(dari) ? dari[0] : dari;

  if (!nilai) return "/";
  if (!nilai.startsWith("/") || nilai.startsWith("//")) return "/";

  return nilai;
};
