import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export default function Recommendations({ groupId }) {
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "recommendations"),
      where("groupId", "==", groupId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => doc.data());
      setRecs(data);
    });

    return () => unsub();
  }, [groupId]);

  if (!recs.length) return <p className="text-gray-500">No recommendations yet.</p>;

  return (
    <div className="space-y-4">
      {recs.map((rec, idx) => (
        <div key={idx} className="bg-white p-4 shadow rounded">
          <h3 className="font-bold">{rec.name}</h3>
          <p className="text-sm text-gray-500">{rec.serviceType}</p>
          <p className="mt-1">{rec.testimonial}</p>
          {rec.contactInfo && <p className="text-sm text-gray-600">Contact: {rec.contactInfo}</p>}
          {rec.submittedBy && (
            <p className="text-xs text-gray-400 mt-1">
              Submitted by: {rec.submittedBy.name} ({rec.submittedBy.email})
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
