// src/components/Request.jsx
import React from 'react';

const Request = ({
  request,
  directRecs,
  matchedRecs,
  newReplies,
  setNewReplies,
  handleReplySubmit,
  serviceTypes
}) => {
  return (
    
    <div className="bg-white p-4 rounded shadow mb-6">
      <p className="font-medium">{request.text}</p>
      <p className="text-sm text-gray-500 mt-1">
        Submitted by {request.submittedBy?.name || 'unknown'}
      </p>
      <p className="text-sm text-gray-500 mb-2">
        Category: {request.serviceType}
      </p>

      {/* Direct Replies */}
      {directRecs.length > 0 && (
        <>
          <h4 className="mt-4 font-semibold">Replies</h4>
          {directRecs.map((rec) => (
            <div
              key={rec.id}
              className="border border-gray-200 rounded p-2 bg-gray-50 mt-2"
            >
              <p className="font-semibold">{rec.name}</p>
              <p className="text-sm text-gray-500">{rec.serviceType}</p>
              <p>{rec.testimonial}</p>
              <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
              <p className="text-xs text-gray-400 mt-1">
                – {rec.submittedBy?.name}
              </p>
            </div>
          ))}
        </>
      )}

      {/* Matched Recommendations */}
      {matchedRecs.length > 0 && (
        <>
          <h4 className="mt-4 font-semibold text-gray-700">
            Other recommendations that might help
          </h4>
          {matchedRecs.map((rec) => (
            <div
              key={rec.id}
              className="border border-dashed border-gray-300 rounded p-2 bg-gray-50 mt-2"
            >
              <p className="font-semibold">{rec.name}</p>
              <p className="text-sm text-gray-500">{rec.serviceType}</p>
              <p>{rec.testimonial}</p>
              <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
              <p className="text-xs text-gray-400 mt-1">
                – {rec.submittedBy?.name}
              </p>
            </div>
          ))}
        </>
      )}

      {/* Reply Form */}
      <div className="mt-4">
        <h4 className="font-medium mb-1">Add a Recommendation</h4>
        <input
          className="w-full border p-2 mb-2"
          placeholder="Who are you recommending?"
          value={newReplies[request.id]?.name || ''}
          onChange={(e) =>
            setNewReplies((prev) => ({
              ...prev,
              [request.id]: {
                ...prev[request.id],
                name: e.target.value
              }
            }))
          }
        />
        <select
          className="w-full border p-2 mb-2"
          value={newReplies[request.id]?.serviceType || ''}
          onChange={(e) =>
            setNewReplies((prev) => ({
              ...prev,
              [request.id]: {
                ...prev[request.id],
                serviceType: e.target.value
              }
            }))
          }
        >
          <option value="">Select a service type</option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <textarea
          className="w-full border p-2 mb-2"
          placeholder="What did they do for you, and how was the experience?"
          value={newReplies[request.id]?.testimonial || ''}
          onChange={(e) =>
            setNewReplies((prev) => ({
              ...prev,
              [request.id]: {
                ...prev[request.id],
                testimonial: e.target.value
              }
            }))
          }
        />
        <input
          className="w-full border p-2 mb-2"
          placeholder="Phone, email, website, or other way to reach them"
          value={newReplies[request.id]?.contactInfo || ''}
          onChange={(e) =>
            setNewReplies((prev) => ({
              ...prev,
              [request.id]: {
                ...prev[request.id],
                contactInfo: e.target.value
              }
            }))
          }
        />
        <button
          onClick={() => handleReplySubmit(request.id)}
          className="btn-primary"
        >
          Submit Recommendation
        </button>
      </div>
    </div>
  );
};

export default Request;