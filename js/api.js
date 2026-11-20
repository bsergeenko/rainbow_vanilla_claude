import { API_BASE } from "./config.js";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const NETWORK_ERROR = "Der Server ist momentan nicht erreichbar. Bitte versuche es später erneut.";

function fallbackMessage(status) {
  if (status === 401) return "Bitte melde dich an.";
  if (status === 403) return "Für diese Aktion fehlt die Berechtigung.";
  if (status === 404) return "Die angeforderten Daten wurden nicht gefunden.";
  if (status >= 500) return "Auf dem Server ist ein Fehler aufgetreten. Bitte versuche es später erneut.";
  return "Die Anfrage konnte nicht verarbeitet werden.";
}

// Zentrale Funktion für alle API-Anfragen. Session-Cookies werden immer mitgesendet.
export async function request(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: { Accept: "application/json" }
  };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError(NETWORK_ERROR, 0, null);
  }

  let data = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const message = data && typeof data.message === "string" ? data.message : fallbackMessage(response.status);
    throw new ApiError(message, response.status, data);
  }
  return data;
}

const enc = encodeURIComponent;

export const api = {
  // Produkte & Kataloge
  getProducts: () => request("/products"),
  getProduct: (id) => request(`/products/${enc(id)}`),
  updateProduct: (id, data) => request(`/products/${enc(id)}`, { method: "PUT", body: data }),
  getCustomColors: () => request("/custom-colors"),
  getDesigns: () => request("/designs"),

  // Authentifizierung & Konto
  register: (data) => request("/register", { method: "POST", body: data }),
  login: (data) => request("/login", { method: "POST", body: data }),
  logout: () => request("/logout", { method: "POST" }),
  getMe: () => request("/me"),
  updateMe: (data) => request("/me", { method: "PUT", body: data }),
  changePassword: (data) => request("/me/password", { method: "PUT", body: data }),
  deleteMe: () => request("/me", { method: "DELETE" }),

  // Administration
  getUsers: () => request("/users"),
  getAdmins: () => request("/admins"),
  createAdmin: (data) => request("/admins", { method: "POST", body: data }),
  updateAdmin: (id, data) => request(`/admins/${enc(id)}`, { method: "PUT", body: data }),
  deleteAdmin: (id) => request(`/admins/${enc(id)}`, { method: "DELETE" }),

  // Wunschliste
  getWishlist: () => request("/wishlist"),
  addToWishlist: (data) => request("/wishlist", { method: "POST", body: data }),
  removeFromWishlist: (itemId) => request(`/wishlist/${enc(itemId)}`, { method: "DELETE" }),

  // Warenkorb
  getCart: () => request("/cart"),
  addToCart: (data) => request("/cart", { method: "POST", body: data }),
  updateCartItem: (itemId, quantity) => request(`/cart/${enc(itemId)}`, { method: "PUT", body: { quantity } }),
  removeCartItem: (itemId) => request(`/cart/${enc(itemId)}`, { method: "DELETE" }),

  // Bestellungen
  getShippingOptions: () => request("/shipping-options"),
  createOrder: (data) => request("/orders", { method: "POST", body: data }),
  getOrders: () => request("/orders"),
  cancelOrder: (id) => request(`/orders/${enc(id)}/cancel`, { method: "PUT" }),
  updateOrderStatus: (id, status) => request(`/orders/${enc(id)}/status`, { method: "PUT", body: { status } }),

  // Kontakt
  sendContact: (data) => request("/contact", { method: "POST", body: data })
};
