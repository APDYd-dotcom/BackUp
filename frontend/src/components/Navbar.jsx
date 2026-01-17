import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="h-16 bg-white dark:bg-gray-800 shadow flex items-center justify-between px-6">
      <h1 className="text-2xl font-bold text-blue-600">Password Vault</h1>

      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Dashboard
        </Link>
        <Link
          to="/add"
          className="text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          Add Account
        </Link>
      </div>
    </nav>
  );
}
