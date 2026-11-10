import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  CheckCheck,
  Check,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Radio,
  FileText,
  AlertOctagon,
  Info,
  X,
  RefreshCw,
} from "lucide-react";
import notificationService from "../services/notificationService";

const TYPE_CONFIG = {
  SESSION_OPENED: {
    label: "Session Open",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Radio,
    iconColor: "text-blue-600 bg-blue-100",
  },
  ATTENDANCE_MARKED: {
    label: "Recorded",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 bg-emerald-100",
  },
  DEFAULTER_WARNING: {
    label: "Low Attendance",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600 bg-amber-100",
  },
  SESSION_SUMMARY: {
    label: "Summary",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
    icon: FileText,
    iconColor: "text-purple-600 bg-purple-100",
  },
  HOD_ALERT: {
    label: "Turnout Alert",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertOctagon,
    iconColor: "text-rose-600 bg-rose-100",
  },
  SYSTEM: {
    label: "System",
    badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Info,
    iconColor: "text-gray-600 bg-gray-100",
  },
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const now = new Date();
  const date = new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
  const diffSec = Math.max(0, Math.floor((now - date) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL or UNREAD
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  const containerRef = useRef(null);

  // 1. Fetch unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Ignored silently for unauthenticated / background poll
    }
  }, []);

  // 2. Fetch full notification list
  const loadNotifications = useCallback(async (filterMode = filter) => {
    setLoading(true);
    try {
      const res = await notificationService.getNotifications({
        limit: 30,
        unreadOnly: filterMode === "UNREAD",
      });
      setNotifications(res?.notifications || []);
      setUnreadCount(res?.unreadCount ?? 0);
    } catch {
      // Keep existing list on transient failure
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // Periodic polling for unread badge count every 20 seconds
  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 20000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  // When drawer opens, load full list
  useEffect(() => {
    if (isOpen) {
      loadNotifications(filter);
    }
  }, [isOpen, filter, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Action handlers
  const handleMarkAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    if (actionInProgress || unreadCount === 0) return;
    setActionInProgress(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // ignore
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDelete = async (id, isRead, e) => {
    e?.stopPropagation();
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (!isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // ignore
    }
  };

  const displayedNotifications =
    filter === "UNREAD" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold text-white bg-rose-600 rounded-full border-2 border-white animate-in zoom-in-50">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Drawer / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in-50 slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold bg-rose-50 text-rose-600 rounded-full border border-rose-200">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => loadNotifications()}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs & Mark All Read */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFilter("ALL")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filter === "ALL"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("UNREAD")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    filter === "UNREAD"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={actionInProgress}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notification List Container */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 opacity-60" />
                </div>
                <p className="text-sm font-semibold text-gray-700">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filter === "UNREAD" ? "You have read all your notifications." : "Session and attendance alerts will appear here."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const conf = TYPE_CONFIG[notif.type] || TYPE_CONFIG.SYSTEM;
                const IconComponent = conf.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    className={`p-3.5 flex gap-3 transition-colors cursor-pointer group ${
                      notif.isRead ? "bg-white hover:bg-gray-50/70" : "bg-blue-50/40 hover:bg-blue-50/70"
                    }`}
                  >
                    {/* Leading Type Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                        conf.iconColor
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded-md border ${
                            conf.badgeClass
                          }`}
                        >
                          {conf.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-gray-400 whitespace-nowrap">
                            {formatTimeAgo(notif.createdAt)}
                          </span>
                          {!notif.isRead && (
                            <span
                              className="w-2 h-2 rounded-full bg-blue-600 shrink-0"
                              title="Unread"
                            />
                          )}
                        </div>
                      </div>

                      <p className="text-xs font-bold text-gray-900 leading-snug truncate">
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-gray-100/60 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Mark as read"
                          >
                            <Check className="w-3 h-3" />
                            Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDelete(notif.id, notif.isRead, e)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

