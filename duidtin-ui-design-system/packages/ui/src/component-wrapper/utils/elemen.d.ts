// BERKAS HASIL GENERATE — jangan diedit tangan (bun run gen:wrapper).
//
// Custom element tidak punya tipe otomatis di JSX. Konsumen Vue punya
// padanannya sendiri lewat `GlobalComponents`.

import type { DetailedHTMLProps, HTMLAttributes } from "react";

type Atribut = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "dtn-alert": Atribut & { "variant"?: string };
      "dtn-alert-icon": Atribut;
      "dtn-alert-content": Atribut;
      "dtn-alert-title": Atribut;
      "dtn-alert-description": Atribut;
      "dtn-badge": Atribut & { "color"?: string; "variant"?: string };
      "dtn-bar-chart": Atribut & { "category-key"?: string; "data"?: string; "height"?: string; "series"?: string; "show-legend"?: string };
      "dtn-button": Atribut & { "color"?: string; "is-disabled"?: string; "size"?: string; "type"?: string; "variant"?: string };
      "dtn-card": Atribut & { "size"?: string; "variant"?: string };
      "dtn-card-header": Atribut;
      "dtn-card-body": Atribut;
      "dtn-card-footer": Atribut;
      "dtn-data-state": Atribut & { "empty-message"?: string; "error-description"?: string; "error-title"?: string; "is-empty"?: string; "is-error"?: string; "is-loading"?: string };
      "dtn-date-range-picker": Atribut & { "from"?: string; "from-label"?: string; "name"?: string; "to"?: string; "to-label"?: string };
      "dtn-empty-state": Atribut & { "size"?: string; "variant"?: string };
      "dtn-empty-state-icon": Atribut;
      "dtn-empty-state-title": Atribut;
      "dtn-empty-state-description": Atribut;
      "dtn-empty-state-action": Atribut;
      "dtn-line-chart": Atribut & { "category-key"?: string; "data"?: string; "height"?: string; "series"?: string; "show-legend"?: string };
      "dtn-modal": Atribut & { "heading"?: string; "is-dismissable"?: string; "is-open"?: string };
      "dtn-pie-chart": Atribut & { "data"?: string; "height"?: string; "show-legend"?: string };
      "dtn-select": Atribut & { "is-disabled"?: string; "is-required"?: string; "items"?: string; "label"?: string; "name"?: string; "placeholder"?: string; "value"?: string };
      "dtn-skeleton": Atribut & { "variant"?: string };
      "dtn-skeleton-lines": Atribut & { "lines"?: string };
      "dtn-spinner": Atribut & { "color"?: string; "size"?: string };
      "dtn-table": Atribut & { "columns"?: string; "rows"?: string; "size"?: string };
      "dtn-tabs": Atribut & { "items"?: string; "value"?: string };
      "dtn-text-field": Atribut & { "description"?: string; "error-message"?: string; "is-disabled"?: string; "is-invalid"?: string; "is-required"?: string; "label"?: string; "name"?: string; "placeholder"?: string; "type"?: string; "value"?: string };
    }
  }
}

export {};
