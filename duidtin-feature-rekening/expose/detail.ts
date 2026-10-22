import Detail from "@/containers/detail/index.vue";
import { createMount } from "./create-mount";

/**
 * Dirender host di route `/rekening/[id]`, dengan `{ id }` sebagai props.
 *
 *   mount(el, { id: "6abc…" })
 *
 * Tanpa `id`, komponennya tidak punya yang bisa diminta ke API — host wajib
 * mengirimkannya. Itu bagian dari kontrak, bukan opsional.
 */
export const mount = createMount(Detail);

export default mount;
