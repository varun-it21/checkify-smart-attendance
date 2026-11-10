import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

const DESKTOP_QUERY = "(min-width: 1024px)";

const Layout = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);
  // Desktop: expanded rail. Mobile/tablet: closed off-canvas drawer.
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onChange = (e) => {
      setIsDesktop(e.matches);
      setIsSidebarOpen(e.matches);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeOnMobile = useCallback(() => {
    if (!window.matchMedia(DESKTOP_QUERY).matches) setIsSidebarOpen(false);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        isDesktop={isDesktop}
        onToggle={toggleSidebar}
        onNavigate={closeOnMobile}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="page-content flex-1 min-w-0 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
