import { useState } from "react";

const serviceTypes = [
  "Plumber",
  "Electrician",
  "House Cleaner",
  "Landscaping",
  "Carpenter",
  "Childcare",
  "Other"
];

export default function App() {
  const [recommendations, setRecommendations] = useState([]);
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    testimonial: "",
    contactInfo: ""
  });

  const handleSubmit = () => {
    if (form.name && form.serviceType && form.testimonial) {
      setRecommendations([...recommendations, form]);
      setForm({ name: "", serviceType: "", testimonial: "", contactInfo: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Neighborhood Recommendations</h1>
        <div className="bg-white p-4 rounded-lg shadow mb-8">
          <h2 className="text-xl font-semibold mb-4">Submit a Recommendation</h2>
          <input
            className="w-full border p-2 mb-3"
            placeholder="Business or Person's Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="w-full border p-2 mb-3"
            value={form.serviceType}
            onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
          >
            <option value="">Select Service Type</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <textarea
            className="w-full border p-2 mb-3"
            placeholder="Why do you recommend them?"
            value={form.testimonial}
            onChange={(e) => setForm({ ...form, testimonial: e.target.value })}
          />
          <input
            className="w-full border p-2 mb-3"
            placeholder="Optional: Contact Info (Phone, Email)"
            value={form.contactInfo}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Submit
          </button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Community Recommendations</h2>
          {recommendations.length === 0 && <p>No recommendations yet!</p>}
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow mb-4">
              <h3 className="text-lg font-bold">{rec.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{rec.serviceType}</p>
              <p className="mb-2">{rec.testimonial}</p>
              {rec.contactInfo && (
                <p className="text-sm text-gray-600">Contact: {rec.contactInfo}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
