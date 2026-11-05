const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getStoredToken = () => {
  try {
    return localStorage.getItem("finora_token") || "";
  } catch {
    return "";
  }
};

const buildHeaders = (headers = {}, includeAuth = true) => {
  const nextHeaders = { ...headers };

  if (includeAuth) {
    const token = getStoredToken();
    if (token) {
      nextHeaders.Authorization = `Bearer ${token}`;
    }
  }

  if (!nextHeaders["Content-Type"] && !nextHeaders["content-type"]) {
    nextHeaders["Content-Type"] = "application/json";
  }

  return nextHeaders;
};

const request = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE}${path.startsWith("/") ? path : `/${path}`}`, {
      ...options,
      headers: buildHeaders(options.headers || {}, options.includeAuth !== false),
    });
  } catch {
    throw new Error("Unable to connect to Finora API server. Please check your connection.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    if (response.status === 401) {
      try {
        localStorage.removeItem("finora_token");
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("finora_session_expired", {
            detail: { message: data?.message || "Session expired. Please log in again." }
          }));
        }
      } catch {
        // Ignore storage or event errors
      }
    }
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const authApi = {
  register: (payload) => request("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  login: (payload) => request("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  me: () => request("/auth/me"),
};

export const transactionsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.type && params.type !== "all") query.set("type", params.type);
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.startDate) query.set("startDate", params.startDate);
    if (params.endDate) query.set("endDate", params.endDate);
    if (params.search && params.search.trim()) query.set("search", params.search.trim());
    const queryString = query.toString();
    return request(queryString ? `/transactions?${queryString}` : "/transactions");
  },
  create: (payload) => request("/transactions", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => request(`/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  remove: (id) => request(`/transactions/${id}`, {
    method: "DELETE",
  }),
  getById: (id) => request(`/transactions/${id}`),
};

export const budgetsApi = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.month) query.set("month", params.month);
    const queryString = query.toString();
    return request(queryString ? `/budgets?${queryString}` : "/budgets");
  },
  create: (payload) => request("/budgets", {
    method: "POST",
    body: JSON.stringify(payload),
  }),
  update: (id, payload) => request(`/budgets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }),
  remove: (id) => request(`/budgets/${id}`, {
    method: "DELETE",
  }),
  getById: (id) => request(`/budgets/${id}`),
};

export default request;
