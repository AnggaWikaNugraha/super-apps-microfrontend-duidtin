// Tailwind v4 lewat PostCSS — dipakai pas `rslib build` bikin dist/index.tailwind.css.
// Tanpa ini, `@apply ui:...` di file CSS komponen ikut ke-copy mentah ke dist dan
// nggak pernah jadi CSS beneran; ke-tutupan sama Storybook yang compile Tailwind
// sendiri lewat @tailwindcss/vite, jadi baru kelihatan waktu dikonsumsi lewat MF.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
