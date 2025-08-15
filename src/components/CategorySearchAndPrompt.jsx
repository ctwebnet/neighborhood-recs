import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import stringSimilarity from "string-similarity";

export default function CategorySearchAndPrompt({
  serviceTypes = [],
  recommendations = [],
  onPrefillRequest,
  groupMemberCount = 0, // <— pass this in
}) {
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [requestText, setRequestText] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Hide category picker until there's a bit of request text
  const MIN_FOR_CATEGORY = 8; // tweak if you want
  const showCategoryUI = requestText.trim().length >= MIN_FOR_CATEGORY;

  useEffect(() => {
    if (requestText.trim() && serviceTypes.length > 0) {
      const bestMatch = stringSimilarity.findBestMatch(requestText, serviceTypes).bestMatch;
      if (bestMatch.rating > 0.3) {
        setSelectedCategory(bestMatch.target);
      }
    }
  }, [requestText, serviceTypes]);

  const effectiveCategory =
    selectedCategory === "__custom" ? customCategory : selectedCategory;

  const matchingRecs = useMemo(() => {
    return recommendations.filter((rec) => rec.serviceType === effectiveCategory);
  }, [effectiveCategory, recommendations]);

  const lastRecDate = useMemo(() => {
    if (matchingRecs.length === 0) return null;
    const latest = matchingRecs.reduce((a, b) =>
      a.createdAt?.toDate() > b.createdAt?.toDate() ? a : b
    );
    return latest.createdAt?.toDate();
  }, [matchingRecs]);

  const canSubmit = requestText.trim() && effectiveCategory.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onPrefillRequest(effectiveCategory.trim(), requestText.trim());
  };

  return (
    <div className="bg-blue-50 border border-blue-300 rounded p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-sm text-gray-700 font-semibold mb-1">
            Neighboroonie grows here when you plant your request.
          </h2>
          <p className="text-sm text-gray-700">
            <strong>Search</strong> existing recommendations and <strong>ask</strong> for new ones.
          </p>
        </div>
        <img
          src="/android-chrome-512x512.png"
          alt="Neighboroonie logo"
          className="w-10 h-10 sm:w-12 sm:h-12 ml-4"
        />
      </div>

      {/* Request text */}
      <div className="mb-3">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What are you looking for help with?
        </label>
        <textarea
          className="w-full border px-2 py-1.5 mb-2 text-sm"
          rows={2}
          placeholder="e.g. I need an electrician to install new light fixtures"
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
        />
      </div>

      {/* Category input + suggestions (revealed after they type enough) */}
{showCategoryUI && (
  <>
    <div className="mb-2">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Select a category
      </label>
      <input
        className="w-full border p-2"
        placeholder="Start typing: electrician, plumber, tutor..."
        value={selectedCategory}
        onChange={(e) => {
          setSelectedCategory(e.target.value);
          setCustomCategory("");
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />
    </div>

    {selectedCategory && showSuggestions && (
      <ul className="border border-gray-300 rounded bg-white max-h-32 overflow-y-auto mt-1 text-sm">
        {serviceTypes
          .filter((type) =>
            type.toLowerCase().includes(selectedCategory.toLowerCase())
          )
          .slice(0, 8)
          .map((match) => (
            <li
              key={match}
              className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer text-sm"
              onClick={() => setSelectedCategory(match)}
            >
              {match}
            </li>
          ))}
        {!serviceTypes.some(
          (type) => type.toLowerCase() === selectedCategory.toLowerCase()
        ) && (
          <li
            className="px-4 py-2 text-gray-500 italic cursor-pointer"
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

    {/* Matches + last rec info */}
    {effectiveCategory && (
      <div>
        {matchingRecs.length > 0 ? (
          <>
            <p className="text-sm text-gray-600 mb-2">
              We found {matchingRecs.length} recommendation
              {matchingRecs.length > 1 && "s"} in this category.
            </p>
            <ul className="list-disc pl-4 space-y-1 text-sm text-gray-700">
              {matchingRecs.slice(0, 3).map((rec) => (
                <li key={rec.id}>
                  <Link
                    to={`/recommendations/${rec.id}`}
                    className="font-semibold text-blue-600 underline"
                  >
                    {rec.name}
                  </Link>
                  : {rec.testimonial}
                  <span className="text-[10px] text-gray-500 ml-1">
                    –{" "}
                    <Link
                      to={`/users/${rec.submittedByUid}`}
                      className="text-blue-600 underline"
                    >
                      {rec.submittedBy?.name || "unknown"}
                    </Link>
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
      </div>
    )}
  </>
)}
      {/* Single-step submit section */}
      {canSubmit && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-2">
      🍏 This request will be shared with {groupMemberCount} neighbors and will help
      build our neighborhood knowledge base.
    </p>
          <button
            className="btn-secondary text-sm py-1 px-3"
            onClick={handleSubmit}
          >
            Request New Recommendations
          </button>
        </div>
      )}
    </div>
  );
}