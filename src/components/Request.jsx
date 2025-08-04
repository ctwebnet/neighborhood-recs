// src/components/Request.jsx
import React from 'react';
import { Link } from "react-router-dom";
import ThankButton from "./ThankButton";
import SaveButton from "./SaveButton"; // ✅ new import

const Request = ({
  request,
  directRecs,
  matchedRecs,
  newReplies,
  setNewReplies,
  handleReplySubmit,
  serviceTypes,
  user,
}) => {
  return (
    <div className="bg-white p-4 rounded shadow mb-6">
      <p className="font-medium">
        <Link
          to={`/request/${request.id}`}
          className="text-blue-600 underline hover:text-blue-800"
        >
          {request.text}
        </Link>
      </p>
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
            <div key={rec.id} className="border border-gray-200 rounded p-2 bg-gray-50 mt-2">
              <Link
                to={`/recommendations/${rec.id}`}
                className="font-semibold text-blue-700 underline block mb-1"
              >
                {rec.name}
              </Link>
              <p className="text-sm text-gray-500">{rec.serviceType}</p>
              <p>{rec.testimonial}</p>
              <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                –{" "}
                {rec.submittedByUid ? (
                  <Link
                    to={`/users/${rec.submittedByUid}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {rec.submittedBy?.name || "unknown"}
                  </Link>
                ) : (
                  rec.submittedBy?.name || "unknown"
                )}
              </p>
              <div className="mt-2 flex gap-2">
                <ThankButton recId={rec.id} user={user} />
                <SaveButton rec={rec} userId={user?.uid} />
              </div>
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
            <div key={rec.id} className="border border-dashed border-gray-300 rounded p-2 bg-gray-50 mt-2">
              <Link
                to={`/recommendations/${rec.id}`}
                className="font-semibold text-blue-700 underline block mb-1"
              >
                {rec.name}
              </Link>
              <p className="text-sm text-gray-500">{rec.serviceType}</p>
              <p>{rec.testimonial}</p>
              <p className="text-sm text-gray-500 italic">{rec.contactInfo}</p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                –{" "}
                {rec.submittedByUid ? (
                  <Link
                    to={`/users/${rec.submittedByUid}`}
                    className="text-blue-600 underline hover:text-blue-800"
                  >
                    {rec.submittedBy?.name || "unknown"}
                  </Link>
                ) : (
                  rec.submittedBy?.name || "unknown"
                )}
              </p>
              <div className="mt-2 flex gap-2">
                <ThankButton recId={rec.id} user={user} />
                <SaveButton rec={rec} user={user} />
              </div>
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
        <p className="mb-2 text-gray-700 text-sm">
          Category: <span className="font-medium">{request.serviceType}</span>
        </p>
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