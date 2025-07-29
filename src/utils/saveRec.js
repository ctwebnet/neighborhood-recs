import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export const saveRecommendationForUser = async (userId, rec) => {
  const savedRef = doc(db, "savedRecs", userId, "items", rec.id);

  await setDoc(savedRef, {
    savedAt: new Date(),
    originalRecRef: doc(db, "recommendations", rec.id),
    groupId: rec.groupId,
    serviceType: rec.serviceType,
    recId: rec.id,
  });
};