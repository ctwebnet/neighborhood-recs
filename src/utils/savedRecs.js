import { db } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  collection,
} from "firebase/firestore";

// Save a recommendation to user's nested collection
export const saveRecommendation = async (userId, rec) => {
  try {
    const savedRef = doc(db, "savedRecs", userId, "items", rec.id);
    await setDoc(savedRef, {
      recId: rec.id,
      originalRecRef: `/recommendations/${rec.id}`,
      groupId: rec.groupId,
      serviceType: rec.serviceType,
      savedAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error("Error saving recommendation:", error);
    return false;
  }
};

// Remove a saved recommendation
export const unsaveRecommendation = async (userId, recId) => {
  try {
    const savedRef = doc(db, "savedRecs", userId, "items", recId);
    await deleteDoc(savedRef);
    return true;
  } catch (error) {
    console.error("Error unsaving recommendation:", error);
    return false;
  }
};

// Get all saved rec IDs for a user
export const getSavedRecIds = async (userId) => {
  try {
    const savedItemsRef = collection(db, "savedRecs", userId, "items");
    const snapshot = await getDocs(savedItemsRef);
    return snapshot.docs.map((doc) => doc.data().recId);
  } catch (error) {
    console.error("Error fetching saved recs:", error);
    return [];
  }
};
// Get full saved recommendation objects for a user
export const getSavedRecsForUser = async (userId) => {
  try {
    const savedItemsRef = collection(db, "savedRecs", userId, "items");
    const snapshot = await getDocs(savedItemsRef);

    const recPromises = snapshot.docs.map(async (docSnap) => {
      const recId = docSnap.data().recId;
      const recRef = doc(db, "recommendations", recId);
      const recSnap = await getDoc(recRef);
      return recSnap.exists() ? { id: recSnap.id, ...recSnap.data() } : null;
    });

    const recs = (await Promise.all(recPromises)).filter(Boolean);
    return recs;
  } catch (error) {
    console.error("Error fetching full saved recs:", error);
    return [];
  }
};