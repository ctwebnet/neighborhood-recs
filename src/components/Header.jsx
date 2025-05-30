import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Link to="/" className="text-3xl font-bold text-black">
          neighboroonie
        </Link>
      </div>
    </header>
  );
}
