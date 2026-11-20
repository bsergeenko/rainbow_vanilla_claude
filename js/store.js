import { api } from "./api.js";

// Globaler Anwendungszustand (angemeldeter Benutzer, Warenkorb-Anzahl, Wunschliste)
const listeners = new Set();

export const state = {
  user: null,
  cartCount: 0,
  wishlist: [],
  wishlistLoaded: false,
  productsCache: null
};

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(type) {
  listeners.forEach((listener) => {
    try {
      listener(type, state);
    } catch (error) {
      console.error(error);
    }
  });
}

export function isAdmin(user = state.user) {
  return Boolean(user && (user.role === "admin" || user.role === "main_admin"));
}

export function isMainAdmin(user = state.user) {
  return Boolean(user && user.role === "main_admin");
}

// Prüft den Login-Status über GET /me
export async function refreshUser() {
  try {
    state.user = await api.getMe();
  } catch (error) {
    if (error.status === 401 || error.status === 404) {
      state.user = null;
    } else {
      throw error;
    }
  }
  emit("user");
  return state.user;
}

export function setUser(user) {
  state.user = user;
  emit("user");
}

export function clearSession() {
  state.user = null;
  state.wishlist = [];
  state.wishlistLoaded = false;
  state.cartCount = 0;
  emit("user");
  emit("wishlist");
  emit("cart");
}

export function setCartItems(items) {
  state.cartCount = (items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  emit("cart");
}

export async function refreshCart() {
  try {
    const items = await api.getCart();
    setCartItems(items);
    return items;
  } catch {
    return null;
  }
}

export async function refreshWishlist() {
  if (!state.user || isAdmin()) {
    state.wishlist = [];
    state.wishlistLoaded = false;
    emit("wishlist");
    return [];
  }
  const items = await api.getWishlist();
  state.wishlist = Array.isArray(items) ? items : [];
  state.wishlistLoaded = true;
  emit("wishlist");
  return state.wishlist;
}

export function findWishlistItem(productId, color) {
  return state.wishlist.find((item) => item.productId === productId && item.color === color) || null;
}

// Produkte werden für die Suche zwischengespeichert; Seiten laden sie jeweils neu.
export async function loadProducts({ fresh = true } = {}) {
  if (!fresh && state.productsCache) return state.productsCache;
  const products = await api.getProducts();
  state.productsCache = Array.isArray(products) ? products : [];
  return state.productsCache;
}

export function invalidateProducts() {
  state.productsCache = null;
}
