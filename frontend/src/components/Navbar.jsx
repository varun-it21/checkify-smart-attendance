import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import logo1 from "../assets/logo1.png";
import NotificationCenter from "./NotificationCenter";

const Navbar = () => {
  const [openProfile, setOpenProfile] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setOpenProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <style>{`
        .logo {
          width: 90px;
          height: auto;
          padding: 2px;
          margin-left:20px;
        }

        .relative{
          margin-right:20px;
        }
      `}</style>

      <div className="w-full bg-white shadow-md h-14 px-4 flex justify-between items-center">
        {/* Logo */}
        <img className="logo cursor-pointer" src={logo1} alt="logo" onClick={() => navigate("/dashboard")} />

        {/* Right Icons */}
        <div className="flex items-center gap-4 sm:gap-6 mr-4 sm:mr-10">
          {/* Notification Centre */}
          <NotificationCenter />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <FaUserCircle
              className="text-3xl text-gray-700 cursor-pointer hover:text-gray-900 transition-colors"
              onClick={() => setOpenProfile(!openProfile)}
            />

            {openProfile && (
              <div className="absolute right-0 mt-3 w-48 bg-white shadow-xl rounded-xl p-2 z-50 border border-gray-100 animate-in fade-in-50 zoom-in-95">
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-md text-sm font-medium text-gray-700"
                  onClick={() => {
                    setOpenProfile(false);
                    navigate("/profile");
                  }}
                >
                  View Profile
                </button>

                <button
                  className="w-full text-left px-4 py-2 hover:bg-red-50 rounded-md text-sm font-medium text-red-600"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
