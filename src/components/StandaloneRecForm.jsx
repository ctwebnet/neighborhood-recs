import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function StandaloneRecForm({ groupId, user, serviceTypeOptions }) {
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    customServiceType: "",
    testimonial: "",
    contactInfo: "",
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const finalServiceType =
      form.serviceType === "__custom" ? form.customServiceType.trim() : form.serviceType.trim();

    if (
      !form.name.trim() ||
      !finalServiceType ||
      !form.testimonial.trim() ||
      !form.contactInfo.trim()
    ) {
      alert("Please fill out all fields, including a service type.");
      return;
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
    });

    setForm({ name: "", serviceType: "", customServiceType: "", testimonial: "", contactInfo: "" });
  };

  return (
    <div>
      <input
        className="w-full border p-2 mb-2"
        placeholder="Name"
        value={form.name}
        onChange={(e) => handleChange("name", e.target.value)}
      />
      <select
        className="w-full border p-2 mb-2"
        value={form.serviceType}
        onChange={(e) => handleChange("serviceType", e.target.value)}
      >
        <option value="">Select a service type</option>
        {serviceTypeOptions.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
        <option value="__custom">Other (enter manually)</option>
      </select>
      {form.serviceType === "__custom" && (
        <input
          className="w-full border p-2 mb-2"
          placeholder="Custom service type"
          value={form.customServiceType}
          onChange={(e) => handleChange("customServiceType", e.target.value)}
        />
      )}
      <textarea
        className="w-full border p-2 mb-2"
        placeholder="Why do you recommend them?"
        value={form.testimonial}
        onChange={(e) => handleChange("testimonial", e.target.value)}
      />
      <input
        className="w-full border p-2 mb-2"
        placeholder="Contact Info"
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
