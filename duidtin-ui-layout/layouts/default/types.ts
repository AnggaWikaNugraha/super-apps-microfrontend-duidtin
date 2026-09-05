export interface NavItem {
  href: string;
  label: string;
  /**
   * Route-nya belum ada. Dirender sebagai teks biasa, bukan link — supaya
   * menu bisa nampilin peta fitur lengkap tanpa ada tautan yang 404.
   */
  disabled?: boolean;
}
