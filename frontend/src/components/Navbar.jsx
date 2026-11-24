import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-gray-900/80 border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex min-h-14 items-center justify-between gap-3 py-2 sm:h-16 sm:gap-6 sm:py-0">
          
          <Link 
            to={user ? (user.role === 'admin' || user.role === 'superadmin' ? "/admin" : "/dashboard") : "/"} 
            className="flex shrink-0 items-center gap-2 hover:opacity-80 transition-opacity sm:gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 tracking-tight">
              Vault
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-6">
            {token && user ? (
              <>
                <Link
                  to={(user.role === 'admin' || user.role === 'superadmin') ? "/admin" : "/dashboard"}
                  className="hidden text-sm font-medium text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors sm:inline"
                >
                  Dashboard
                </Link>
                <Link
                  to="/settings"
                  className="hidden text-sm font-medium text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors sm:inline"
                >
                  Security
                </Link>
                
                <div className="hidden sm:block w-px h-5 bg-gray-300 dark:bg-gray-700"></div>
                
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className="hidden min-w-0 flex-col items-end sm:flex">
                    <span className="max-w-40 truncate text-sm font-semibold text-gray-900 dark:text-white leading-tight">
                      {user.name}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <div className="w-8 h-8 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800 shadow-sm sm:w-9 sm:h-9">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="shrink-0 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 sm:ml-2"
                  aria-label="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="whitespace-nowrap text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 px-3 py-2 rounded-full transition-all shadow-md hover:shadow-lg sm:px-5 sm:text-sm"
                >
                  Create Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
