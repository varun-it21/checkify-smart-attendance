import api from "../api/api";

export const notificationService = {
  getUnreadCount: async () => {
    const response = await api.get("/api/notifications/unread-count");
    return response.data?.unreadCount ?? 0;
  },

  getNotifications: async ({ limit = 20, offset = 0, unreadOnly = false } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.append("limit", limit);
    if (offset) params.append("offset", offset);
    if (unreadOnly) params.append("unreadOnly", "true");

    const response = await api.get(`/api/notifications?${params.toString()}`);
    return response.data;
  },

  markAsRead: async (notificationId) => {
    const response = await api.put(`/api/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put("/api/notifications/mark-all-read");
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
};

export default notificationService;

