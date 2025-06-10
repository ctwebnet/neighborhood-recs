import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 text-center">
        <Link to="/" className="text-3xl font-bold text-black">
          neighboroonie <span className="text-xs font-normal text-gray-500">beta v0.1</span>
        </Link>
        <p className="text-gray-600 text-sm mt-1">
          A simple way to share and find trusted local recommendations.
        </p>
      </div>
    </header>
  );
}