import React, { useEffect, useState } from "react";
import {
  saveRecommendation,
  unsaveRecommendation,
  getSavedRecIds,
} from "../utils/savedRecs"; // adjust if the path is different

const SaveButton = ({ userId, rec }) => {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSaved = async () => {
      if (!userId || !rec?.id) return;
      const savedIds = await getSavedRecIds(userId);
      setSaved(savedIds.includes(rec.id));
      setLoading(false);
    };
    checkSaved();
  }, [userId, rec?.id]);

  const toggleSave = async () => {
    if (saved) {
      await unsaveRecommendation(userId, rec.id);
      setSaved(false);
    } else {
      await saveRecommendation(userId, rec);
      setSaved(true);
    }
  };

  if (loading) return null;

  return (
    <button
      onClick={toggleSave}
      className={`ml-2 text-sm rounded px-2 py-1 ${
        saved
          ? "bg-gray-300 text-gray-500"
          : "bg-gray-200 text-gray-600 hover:bg-gray-300"
      }`}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
};

export default SaveButton;