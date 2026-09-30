/**
 * Tailwind v4 masuk lewat PostCSS, bukan CLI.
 *
 * Versi Next-nya memanggil `@tailwindcss/cli` di `scripts/build-styles.ts`
 * karena CSS-nya harus jadi string dulu. Di sini CSS boleh di-import biasa,
 * jadi cukup plugin PostCSS yang otomatis dibaca Rsbuild.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
