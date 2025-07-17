import { toast } from "react-hot-toast";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function StandaloneRecForm({
  groupId,
  user,
  defaultServiceType = "",
  serviceTypeOptions = [],
  allowCustomServiceType = false,
  onDone,
}) {
const [form, setForm] = useState({
  name: "",
  serviceType: defaultServiceType || "",
  customServiceType: "",
  testimonial: "",
  contactInfo: "",
  showSuggestions: false,
});

  const [serviceTypes, setServiceTypes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServiceTypes = async () => {
      const snapshot = await getDocs(collection(db, "serviceTypes"));
      const types = snapshot.docs.map((doc) => doc.id);
      setServiceTypes(types);
    };
    fetchServiceTypes();
  }, []);


  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const finalServiceType =
      form.serviceType === "__custom"
        ? form.customServiceType.trim()
        : form.serviceType.trim();

    if (
      !form.name.trim() ||
      !finalServiceType ||
      !form.testimonial.trim() ||
      !form.contactInfo.trim()
    ) {
      alert("Please fill out all fields, including a service type.");
      return;
    }

    if (form.serviceType === "__custom" && finalServiceType) {
      await setDoc(doc(db, "serviceTypes", finalServiceType), {});
    }

    await addDoc(collection(db, "recommendations"), {
      name: form.name.trim(),
      serviceType: finalServiceType,
      testimonial: form.testimonial.trim(),
      contactInfo: form.contactInfo.trim(),
      groupId,
      createdAt: serverTimestamp(),
      submittedBy: {
        name: user.displayName,
        email: user.email,
      },
      submittedByUid: user.uid,
    });

    toast.success("Thanks! Your recommendation was submitted.");

    setForm({
      name: "",
      serviceType: "",
      customServiceType: "",
      testimonial: "",
      contactInfo: "",
    });

    setTimeout(() => {
      navigate("/my-list");
    }, 1500);
  };

  return (
    <div>
      <input
        className="w-full border p-2 mb-2"
        placeholder="Who are you recommending?"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
     <input
  className="w-full border p-2 mb-1"
  placeholder="Service type (e.g., electrician, piano tuner)"
  value={form.serviceType}
  onChange={(e) => handleChange("serviceType", e.target.value)}
  onFocus={() => handleChange("showSuggestions", true)}
  onBlur={() => setTimeout(() => handleChange("showSuggestions", false), 200)}
/>
{form.serviceType && form.showSuggestions !== false && (
  <ul className="border border-gray-300 rounded bg-white max-h-48 overflow-y-auto text-sm">
    {serviceTypes
      .filter((type) =>
        type.toLowerCase().includes(form.serviceType.toLowerCase())
      )
      .slice(0, 5)
      .map((match) => (
        <li
          key={match}
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
          onMouseDown={() => {
            handleChange("serviceType", match);
            handleChange("showSuggestions", false);
          }}
        >
          {match}
        </li>
      ))}
    {!serviceTypes.some(
      (type) => type.toLowerCase() === form.serviceType.toLowerCase()
    ) && (
      <li className="px-3 py-2 text-gray-400 italic">
        Will be added as new category
      </li>
    )}
  </ul>
)}
      {form.serviceType === "__custom" && (
        <input
          className="w-full border p-2 mb-2"
          placeholder="e.g., Furniture repair, piano tuner"
          value={form.customServiceType}
          onChange={(e) => handleChange("customServiceType", e.target.value)}
        />
      )}
      <textarea
        className="w-full border p-2 mb-2"
        placeholder="What did they do for you, and how was the experience?"
        value={form.testimonial}
        onChange={(e) => handleChange("testimonial", e.target.value)}
      />
      <input
        className="w-full border p-2 mb-2"
        placeholder="Phone, email, website, or other way to reach them"
        value={form.contactInfo}
        onChange={(e) => handleChange("contactInfo", e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Submit Recommendation
      </button>
    </div>
  );
}
