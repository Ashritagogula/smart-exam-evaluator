import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Token management helpers (local stubs, not from api.js) ──────────────────
// These test the generic localStorage pattern; api.js now uses httpOnly cookies.
const TOKEN_KEY = "au_token";
const getToken  = () => localStorage.getItem(TOKEN_KEY);
const setToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

describe("Token management (localStorage helpers)", () => {
  beforeEach(() => localStorage.clear());

  it("setToken stores value in localStorage", () => {
    setToken("abc123");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("abc123");
  });

  it("getToken returns stored token", () => {
    localStorage.setItem(TOKEN_KEY, "tok_xyz");
    expect(getToken()).toBe("tok_xyz");
  });

  it("removeToken deletes the token", () => {
    setToken("abc");
    removeToken();
    expect(getToken()).toBeNull();
  });

  it("getToken returns null when nothing is stored", () => {
    expect(getToken()).toBeNull();
  });
});

// ── fetch wrapper behaviour (cookie-based auth) ───────────────────────────────

describe("API request error handling", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("throws an error when response is not ok", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Bad request" }),
    });

    const { auth } = await import("../../services/api.js");
    await expect(auth.getMe()).rejects.toThrow("Bad request");
  });

  it("dispatches auth:logout event on 401 when refresh also fails", async () => {
    // Both the original request AND the refresh attempt return 401
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    });

    const eventFired = new Promise((resolve) => {
      window.addEventListener("auth:logout", resolve, { once: true });
    });

    const { auth } = await import("../../services/api.js");
    try { await auth.getMe(); } catch {}

    await expect(eventFired).resolves.toBeDefined();
  });

  it("sends credentials:include so httpOnly cookie is forwarded automatically", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "1", role: "admin" } }),
    });

    const { auth } = await import("../../services/api.js");
    await auth.getMe();

    const fetchOptions = fetch.mock.calls[0][1];
    expect(fetchOptions.credentials).toBe("include");
  });

  it("login returns user data without storing a token in localStorage", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "1", role: "faculty" } }),
    });

    const { auth } = await import("../../services/api.js");
    const data = await auth.login("user@test.com", "pass");

    expect(data.user.role).toBe("faculty");
    // Cookie is managed by the browser automatically; localStorage must stay empty
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
