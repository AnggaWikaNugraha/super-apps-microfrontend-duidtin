const paths = {
  wallet: "M3 6h16v14H3zM3 6V4h14v2m-2 6h6v5h-6z",
  transfer: "M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5",
  payroll:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m9 14v-2a4 4 0 0 0-3-4",
  document: "M5 3h10l4 4v14H5zM9 11h6m-6 4h6",
  check:
    "M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9",
  incoming: "M17 7 7 17m0-9v9h9",
  outgoing: "M7 17 17 7M8 7h9v9",
  refresh:
    "M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 14-3l1 3M4 16l1 3a8 8 0 0 0 14-3",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
};
export const Icon = ({ name }: { name: keyof typeof paths }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={paths[name]} />
  </svg>
);
