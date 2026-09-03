/** Nama remote design-system, sama persis dengan `name` di rslib.config.ts-nya. */
export const DESIGN_SYSTEM_REMOTE = "duidtin_ui_design_system";

/**
 * Path remoteEntry design-system, digabung dengan hasil getBaseFederationUrl().
 * Path-nya sendiri tetap sama di semua environment — yang beda cuma base URL-nya.
 */
export const DESIGN_SYSTEM_ENTRY_PATH = "/design-system/static/remoteEntry.js";

/** Dev lokal: tiap remote jalan di port sendiri, jadi base-nya beda origin, bukan cuma beda path. */
export const LOCAL_DESIGN_SYSTEM_ORIGIN = "http://localhost:3001";
