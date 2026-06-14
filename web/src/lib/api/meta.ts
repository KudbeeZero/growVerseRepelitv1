import { apiFetch } from "./client";

/** Public deployment metadata. `dev_time_scale` is non-null ONLY when the
 *  DEV/TEST-ONLY GROW_DEV_TIME_SCALE env gate is set on the backend (real-time
 *  cadence in production ⇒ null). The client surfaces it as an obvious banner. */
export interface Meta {
  dev_time_scale: number | null;
}

export const meta = {
  get: () => apiFetch<Meta>("/meta", { auth: false }),
};
