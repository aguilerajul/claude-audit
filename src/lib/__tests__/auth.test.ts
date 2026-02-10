import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockJWTPayload = { userId: "", email: "", expiresAt: new Date() };
const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");
const mockVerify = vi.fn().mockResolvedValue({ payload: mockJWTPayload });

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("server-only", () => ({}));

vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    sign: mockSign,
  })),
  jwtVerify: mockVerify,
}));

describe("createSession", () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("creates a session with valid JWT token", async () => {
    const { createSession } = await import("../auth");

    await createSession("user-123", "test@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [cookieName, token] = mockCookieStore.set.mock.calls[0];

    expect(cookieName).toBe("auth-token");
    expect(token).toBe("mock-jwt-token");
    expect(mockSign).toHaveBeenCalledTimes(1);
  });

  it("creates JWT with correct user data", async () => {
    const { SignJWT } = await import("jose");
    const { createSession } = await import("../auth");

    await createSession("user-456", "admin@example.com");

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-456",
        email: "admin@example.com",
        expiresAt: expect.any(Date),
      })
    );
  });

  it("sets cookie with correct options in development", async () => {
    process.env.NODE_ENV = "development";
    const { createSession } = await import("../auth");

    await createSession("user-789", "dev@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(false);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("sets cookie with secure flag in production", async () => {
    process.env.NODE_ENV = "production";

    vi.resetModules();
    const { createSession } = await import("../auth");

    await createSession("user-prod", "prod@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];

    expect(options.secure).toBe(true);
  });

  it("sets cookie expiration to 7 days from now", async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    const { createSession } = await import("../auth");

    await createSession("user-time", "time@example.com");

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expectedExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000);

    expect(options.expires).toEqual(expectedExpiry);

    vi.useRealTimers();
  });

  it("JWT token has correct expiration time", async () => {
    const { createSession } = await import("../auth");

    const beforeCreation = Math.floor(Date.now() / 1000);
    await createSession("user-exp", "exp@example.com");
    const afterCreation = Math.floor(Date.now() / 1000);

    const [, token] = mockCookieStore.set.mock.calls[0];

    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysInSeconds = 7 * 24 * 60 * 60;
    expect(payload.exp).toBeGreaterThanOrEqual(beforeCreation + sevenDaysInSeconds);
    expect(payload.exp).toBeLessThanOrEqual(afterCreation + sevenDaysInSeconds + 1);
  });

  it("handles empty userId and email", async () => {
    const { createSession } = await import("../auth");

    await createSession("", "");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);

    const [, token] = mockCookieStore.set.mock.calls[0];
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || "development-secret-key"
    );
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("");
    expect(payload.email).toBe("");
  });

  it("creates unique tokens for different users", async () => {
    const { createSession } = await import("../auth");

    await createSession("user-1", "user1@example.com");
    const token1 = mockCookieStore.set.mock.calls[0][1];

    mockCookieStore.set.mockClear();

    await createSession("user-2", "user2@example.com");
    const token2 = mockCookieStore.set.mock.calls[0][1];

    expect(token1).not.toBe(token2);
  });
});
