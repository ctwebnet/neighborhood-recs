// src/pages/FeedbackViewer.jsx

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export default function FeedbackViewer() {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "feedback"), orderBy("submittedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(entries);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6">Feedback Inbox</h1>
      <div className="space-y-4">
        {feedbacks.length === 0 && <p>No feedback submitted yet.</p>}
        {feedbacks.map((entry) => (
          <div key={entry.id} className="bg-white p-4 rounded shadow">
            <p className="text-gray-800 mb-2">{entry.text}</p>
            {entry.user && (
              <p className="text-sm text-gray-500">
                Submitted by: {entry.user.name || entry.user.email}
              </p>
            )}
            {entry.submittedAt?.toDate && (
              <p className="text-xs text-gray-400">
                {entry.submittedAt.toDate().toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
