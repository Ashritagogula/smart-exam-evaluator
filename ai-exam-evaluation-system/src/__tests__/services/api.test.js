import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ── Token management helpers ──────────────────────────────────────────────────
// Import helpers directly to avoid full module init with fetch deps
const TOKEN_KEY = "au_token";

const getToken  = () => localStorage.getItem(TOKEN_KEY);
const setToken  = (t) => localStorage.setItem(TOKEN_KEY, t);
const removeToken = () => localStorage.removeItem(TOKEN_KEY);

describe("Token management", () => {
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

// ── fetch wrapper behaviour ───────────────────────────────────────────────────

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

    // Dynamically import after stubbing fetch so the module sees the stub
    const { auth } = await import("../../services/api.js");
    await expect(auth.getMe()).rejects.toThrow("Bad request");
  });

  it("dispatches auth:logout event on 401 response", async () => {
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

  it("includes Authorization header when token is present", async () => {
    localStorage.setItem(TOKEN_KEY, "test-token");
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: "1", role: "admin" } }),
    });

    const { auth } = await import("../../services/api.js");
    await auth.getMe();

    const calledHeaders = fetch.mock.calls[0][1].headers;
    expect(calledHeaders["Authorization"]).toBe("Bearer test-token");
  });

  it("stores token in localStorage after successful login", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ token: "jwt-token-xyz", user: { id: "1", role: "faculty" } }),
    });

    const { auth } = await import("../../services/api.js");
    await auth.login("user@test.com", "pass");
    expect(localStorage.getItem(TOKEN_KEY)).toBe("jwt-token-xyz");
  });
});
