import { Link, useLocation } from "react-router-dom";
import { FaHome, FaPlus, FaCog } from "react-icons/fa";

const menuItems = [
  { name: "Dashboard", path: "/", icon: <FaHome /> },
  { name: "Add Account", path: "/add", icon: <FaPlus /> },
  { name: "Settings", path: "/settings", icon: <FaCog /> },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 h-screen p-6 flex flex-col gap-6">
      {menuItems.map((item) => (
        <Link
          key={item.name}
          to={item.path}
          className={`flex items-center gap-3 p-3 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 transition ${
            location.pathname === item.path
              ? "bg-blue-200 dark:bg-gray-700 font-semibold"
              : ""
          }`}
        >
          {item.icon} {item.name}
        </Link>
      ))}
    </aside>
  );
}
