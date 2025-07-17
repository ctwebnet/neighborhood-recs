import { useState, useMemo } from "react";
import { Link } from "react-router-dom";

export default function CategorySearchAndPrompt({
  serviceTypes = [],
  recommendations = [],
  onPrefillRequest,
}) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [showInlineForm, setShowInlineForm] = useState(false);
const [requestText, setRequestText] = useState("");
const [showSuggestions, setShowSuggestions] = useState(false);
  const effectiveCategory =
    selectedCategory === "__custom" ? customCategory : selectedCategory;

  const matchingRecs = useMemo(() => {
    return recommendations.filter(
      (rec) => rec.serviceType === effectiveCategory
    );
  }, [effectiveCategory, recommendations]);

  const lastRecDate = useMemo(() => {
    if (matchingRecs.length === 0) return null;
    const latest = matchingRecs.reduce((a, b) =>
      a.createdAt?.toDate() > b.createdAt?.toDate() ? a : b
    );
    return latest.createdAt?.toDate();
  }, [matchingRecs]);

  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <h2 className="text-xl font-semibold mb-2">Search and ask for Recommendations by Category</h2>
      <input
  className="w-full border p-2 mb-1"
  placeholder="Start typing a category..."
  value={selectedCategory}
  onChange={(e) => {
    setSelectedCategory(e.target.value);
    setCustomCategory(""); // Reset custom if typing
  }}
  onFocus={() => setShowSuggestions(true)}
  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
/>

{selectedCategory && showSuggestions && (
  <ul className="border border-gray-300 rounded bg-white max-h-40 overflow-y-auto mt-1 text-sm">
    {serviceTypes
      .filter((type) =>
        type.toLowerCase().includes(selectedCategory.toLowerCase())
      )
      .slice(0, 8)
      .map((match) => (
        <li
          key={match}
          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
          onClick={() => setSelectedCategory(match)}
        >
          {match}
        </li>
      ))}
    {!serviceTypes.some(
      (type) => type.toLowerCase() === selectedCategory.toLowerCase()
    ) && (
      <li
        className="px-4 py-2 text-gray-500 italic"
        onClick={() => setSelectedCategory(selectedCategory)}
      >
        Use “{selectedCategory}” as a new category
      </li>
    )}
  </ul>
)}

      {selectedCategory === "__custom" && (
        <input
          className="w-full border p-2 mb-2"
          placeholder="New category name"
          value={customCategory}
          onChange={(e) => setCustomCategory(e.target.value)}
        />
      )}

      {effectiveCategory && (
        <div>
          {matchingRecs.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 mb-2">
                We found {matchingRecs.length} recommendation
                {matchingRecs.length > 1 && "s"} in this category.
              </p>
              <ul className="list-disc pl-4 text-sm text-gray-700">
                {matchingRecs.slice(0, 3).map((rec) => (
                  <li key={rec.id}>
                    <span className="font-semibold">{rec.name}</span>: {rec.testimonial}
                    <span className="text-xs text-gray-500 ml-2">
                      – <Link to={`/users/${rec.submittedByUid}`} className="text-blue-600 underline">{rec.submittedBy?.name || "unknown"}</Link>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-500 italic mb-2">
              No recommendations found yet.
            </p>
          )}

          {lastRecDate && (
            <p className="text-sm text-gray-500 mt-2">
              Most recent recommendation was from {lastRecDate.toLocaleDateString()}.
            </p>
          )}

          {!showInlineForm ? (
  <button
    className="mt-3 btn-secondary"
    onClick={() => setShowInlineForm(true)}
  >
    Ask the group for new recommendations
  </button>
) : (
  <div className="mt-3">
    <textarea
      className="w-full border p-2 mb-2"
      placeholder={`What are you looking for help with in ${effectiveCategory}?`}
      value={requestText}
      onChange={(e) => setRequestText(e.target.value)}
    />
    <button
      className="btn-primary"
      onClick={() => {
        if (requestText.trim()) {
          onPrefillRequest(effectiveCategory, requestText);
        }
      }}
    >
      Submit Request
    </button>
  </div>
)}
        </div>
      )}
    </div>
  );
}
