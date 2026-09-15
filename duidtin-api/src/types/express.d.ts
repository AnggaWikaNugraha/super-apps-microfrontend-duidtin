import type { KlaimAccess } from "../lib/token.js";

declare global {
  namespace Express {
    interface Request {
      /** Diisi middleware `butuhLogin`. */
      auth?: KlaimAccess;
    }
  }
}

export {};
