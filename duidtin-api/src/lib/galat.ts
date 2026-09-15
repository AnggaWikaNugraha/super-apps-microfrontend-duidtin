import type { DetailValidasi, KodeError } from "./respons.js";

/**
 * Error yang sengaja dilempar ke client. Handler error terpusat mengubahnya jadi
 * `ApiResponse<DataGagal>`; error lain dianggap bug dan dijawab 500.
 */
export class GalatApi extends Error {
  readonly status: number;
  readonly kode: KodeError;
  readonly detail?: DetailValidasi[];

  constructor(status: number, kode: KodeError, message: string, detail?: DetailValidasi[]) {
    super(message);
    this.name = "GalatApi";
    this.status = status;
    this.kode = kode;
    this.detail = detail;
  }
}
