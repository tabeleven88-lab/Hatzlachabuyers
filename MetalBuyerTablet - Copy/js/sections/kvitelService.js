// /js/sections/kvitel/kvitelService.js

import { addDocument } from "../service/dbService.js";

export async function submitKvitel(data) {
  return addDocument("kvitelService", data);
}
