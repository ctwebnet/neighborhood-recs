import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";

// Check if currentUserId is following targetUserId
export const isFollowing = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId) return false;
  const followRef = doc(db, "follows", `${currentUserId}_${targetUserId}`);
  const followDoc = await getDoc(followRef);
  return followDoc.exists();
};

// Create a follow relationship and update user's following list
export const followUser = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;

  const followRef = doc(db, "follows", `${currentUserId}_${targetUserId}`);
  const userRef = doc(db, "users", currentUserId);

  await Promise.all([
    setDoc(followRef, {
      followerId: currentUserId,
      followingId: targetUserId,
      createdAt: new Date(),
    }),
    updateDoc(userRef, {
      following: arrayUnion(targetUserId),
    }),
  ]);
};

// Remove follow relationship and update user's following list
export const unfollowUser = async (currentUserId, targetUserId) => {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;

  const followRef = doc(db, "follows", `${currentUserId}_${targetUserId}`);
  const userRef = doc(db, "users", currentUserId);

  await Promise.all([
    deleteDoc(followRef),
    updateDoc(userRef, {
      following: arrayRemove(targetUserId),
    }),
  ]);
};