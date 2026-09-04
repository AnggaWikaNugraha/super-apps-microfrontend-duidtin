/** Cara `routes` dicocokkan dengan pathname yang lagi dibuka. */
export type RouteMatchType = "prefix" | "exact";

export interface FeatureMetadata {
  /**
   * Nama container MF, harus SAMA PERSIS dengan `name` di config remote-nya
   * (underscore, bukan strip).
   */
  name: string;

  /**
   * Path remoteEntry relatif terhadap base URL. Sengaja disimpan per-feature,
   * BUKAN satu formula bersama: design-system dibangun pakai Rslib
   * (`/design-system/static/...`) sedangkan layout pakai Next
   * (`/layout/_next/static/chunks/...`) — bentuknya beda.
   */
  entryPath: string;

  /**
   * Origin yang dipakai HANYA saat dev lokal, karena tiap remote jalan di port
   * sendiri. Di luar localhost nilai ini diabaikan: semua remote satu domain,
   * dibedain lewat prefix di `entryPath`.
   */
  devOrigin: string;

  /**
   * Route yang bikin feature ini perlu dimuat (FASE 2). `globalFeatures` pakai
   * array kosong karena dimuat unconditional di FASE 1, nggak nunggu route match.
   */
  routes: string[];

  /** Default "prefix" kalau nggak diisi. */
  matchType?: RouteMatchType;
}
