import { db } from "../firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const moduleBackgroundsRef = doc(db, "siteSettings", "moduleBackgrounds");

export async function updateModuleBackground(moduleId, imageUrl) {
  await setDoc(moduleBackgroundsRef, {
    [moduleId]: imageUrl
  }, { merge: true });
}
