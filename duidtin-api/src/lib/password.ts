import bcrypt from "bcryptjs";

const COST = 10;

export const hashPassword = (password: string): Promise<string> => bcrypt.hash(password, COST);

export const cocokPassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);

let hashPembanding: Promise<string> | undefined;

/**
 * Dipakai saat email tidak terdaftar, supaya waktu responsnya setara dengan
 * password salah. Tanpa ini, respons yang jauh lebih cepat membocorkan bahwa
 * email tersebut tidak ada.
 */
export const bandingkanDenganHashPalsu = async (password: string): Promise<void> => {
  hashPembanding ??= hashPassword("pembanding-waktu-bukan-password-siapa-pun");
  await bcrypt.compare(password, await hashPembanding);
};
