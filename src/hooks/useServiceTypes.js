// src/hooks/useServiceTypes.js
import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function useServiceTypes() {
  const [types, setTypes] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "serviceTypes"), (snapshot) => {
      setTypes(snapshot.docs.map((doc) => doc.data().label));
    });
    return () => unsubscribe();
  }, []);

  return types;
}
