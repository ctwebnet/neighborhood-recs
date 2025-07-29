// components/SavedList.jsx
import React from "react";
import { toast } from "react-hot-toast";

const SavedList = ({ savedRecs, showGroup = true }) => {
  if (!savedRecs.length) {
    return (
      <p className="text-gray-600 text-sm mt-4">
        You haven’t saved any recommendations yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {savedRecs.map((rec) => (
        <div key={rec.id} className="border border-gray-200 rounded p-4 bg-white shadow-sm">
          <p className="font-semibold text-lg">{rec.name}</p>
          <p className="text-sm text-gray-500 mt-1">{rec.contactInfo}</p>
          <p className="mt-2 text-sm">{rec.testimonial}</p>
          {showGroup && (
            <p className="text-xs text-gray-400 mt-2">Group: {rec.groupId}</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              className="bg-green-600 text-white px-3 py-1 text-sm rounded"
              onClick={() => {
                const url = `${window.location.origin}/recommendations/${rec.id}`;
                navigator.clipboard.writeText(url);
                toast.success("Link copied!");
              }}
            >
              Share
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SavedList;