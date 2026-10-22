import AccountList from "@/containers/list/index.vue";
import { createMount } from "./create-mount";

/**
 * Dirender host di route `/rekening`. Tanpa props.
 *
 * Nama berkasnya sengaja tetap `daftar.ts`: mengikuti nama expose `./daftar`,
 * yang merupakan kontrak dengan host (`duidtin_feature_rekening/daftar`).
 */
export const mount = createMount(AccountList);

export default mount;
