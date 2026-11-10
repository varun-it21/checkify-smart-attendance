import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { Menu } from "lucide-react";
import logo1 from "../assets/logo1.png";
import NotificationCenter from "./NotificationCenter";

const Navbar = ({ toggleSidebar }) => {
  const [openProfile, setOpenProfile] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  // Close profile dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
    };
    const handleKey = (event) => event.key === "Escape" && setOpenProfile(false);

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <header className="w-full shrink-0 bg-white shadow-md h-14 px-3 sm:px-4 flex justify-between items-center relative z-20">
      <div className="flex items-center gap-2 min-w-0">
        {/* Hamburger: only needed below lg where the sidebar is a drawer */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <img
          className="w-[90px] h-auto p-0.5 cursor-pointer"
          src={logo1}
          alt="Checkify"
          onClick={() => navigate("/dashboard")}
        />
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        <NotificationCenter />

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setOpenProfile((v) => !v)}
            className="rounded-full text-gray-700 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={openProfile}
          >
            <FaUserCircle className="text-3xl" />
          </button>

          {openProfile && (
            <div
              role="menu"
              className="absolute right-0 mt-3 w-48 bg-white shadow-xl rounded-xl p-2 z-50 border border-gray-100"
            >
              <button
                role="menuitem"
                className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md text-sm font-medium text-gray-700"
                onClick={() => {
                  setOpenProfile(false);
                  navigate("/profile");
                }}
              >
                View Profile
              </button>

              <button
                role="menuitem"
                className="w-full text-left px-4 py-2 hover:bg-red-50 rounded-md text-sm font-medium text-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
