// src/components/ThankButton.jsx
import React, { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ThankButton({ recId, user }) {
  const [hasThanked, setHasThanked] = useState(false);
  const [thanksCount, setThanksCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchThanks = async () => {
      if (!recId || !user) return;

      try {
        const recRef = doc(db, "recommendations", recId);
        const recSnap = await getDoc(recRef);

        if (!recSnap.exists()) return;

        const recData = recSnap.data();
        const thanks = recData.thanks || {};

        setHasThanked(thanks[user.uid] === true);
        setThanksCount(Object.keys(thanks).length);
      } catch (err) {
        console.error("Error fetching thanks data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchThanks();
  }, [recId, user]);

  const handleThank = async () => {
    if (hasThanked || !recId || !user) return;

    try {
      const recRef = doc(db, "recommendations", recId);
      const recSnap = await getDoc(recRef);

      if (!recSnap.exists()) return;

      const recData = recSnap.data();
      const updatedThanks = { ...(recData.thanks || {}), [user.uid]: true };

      await setDoc(recRef, { ...recData, thanks: updatedThanks });

      setHasThanked(true);
      setThanksCount(Object.keys(updatedThanks).length);
    } catch (err) {
      console.error("Error sending thanks:", err);
    }
  };

  if (loading) return null;

  return (
    <div className="mt-2">
      <button
        onClick={handleThank}
        className={`px-3 py-1 rounded text-sm ${
          hasThanked
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
        disabled={hasThanked}
      >
        {hasThanked ? "Thanks sent!" : "Say Thanks"}
      </button>
      {thanksCount > 0 && (
        <span className="ml-2 text-sm text-gray-600">{thanksCount} thanked this</span>
      )}
    </div>
  );
}