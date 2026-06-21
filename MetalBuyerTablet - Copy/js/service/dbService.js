import { db } from "../firebase.js";
import { addDoc, collection } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function addDocument(collectionName, data) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Date.now()
    });

    return { success: true, id: docRef.id };

  } catch (err) {
    console.error("DB Error:", err);
    return { success: false, error: err };
  }
}