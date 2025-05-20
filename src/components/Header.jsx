import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white shadow p-4 mb-6">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-blue-600 tracking-tight">
          Neighbor<span className="text-yellow-500">oonie</span>
        </Link>
      </div>
    </header>
  );
}
