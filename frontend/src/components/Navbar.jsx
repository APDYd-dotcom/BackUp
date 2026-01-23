import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token"); // remove JWT
    navigate("/login"); // redirect to login page
  };

  const isLoggedIn = !!localStorage.getItem("token");

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md p-4 flex justify-between items-center">
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        BacUp
      </div>

      <div className="flex gap-4 items-center">
        {isLoggedIn ? (
          <>
            <Link
              to="/"
              className="text-gray-800 dark:text-gray-100 hover:underline"
            >
              Dashboard
            </Link>
            <Link
              to="/add"
              className="text-gray-800 dark:text-gray-100 hover:underline"
            >
              Add Account
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-gray-800 dark:text-gray-100 hover:underline"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-gray-800 dark:text-gray-100 hover:underline"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
