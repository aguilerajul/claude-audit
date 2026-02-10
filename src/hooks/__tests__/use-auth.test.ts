import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
vi.mock("@/actions", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
}));

const mockGetAnonWorkData = vi.fn();
const mockClearAnonWork = vi.fn();
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: () => mockGetAnonWorkData(),
  clearAnonWork: () => mockClearAnonWork(),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/get-projects", () => ({
  getProjects: () => mockGetProjects(),
}));

const mockCreateProject = vi.fn();
vi.mock("@/actions/create-project", () => ({
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

import { useAuth } from "@/hooks/use-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useAuth", () => {
  it("returns signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.signIn).toBeTypeOf("function");
    expect(result.current.signUp).toBeTypeOf("function");
    expect(result.current.isLoading).toBe(false);
  });

  describe("signIn", () => {
    it("calls the signIn action with email and password", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Bad creds" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("user@test.com", "password123");
      });

      expect(mockSignIn).toHaveBeenCalledWith("user@test.com", "password123");
    });

    it("returns the result from signIn action", async () => {
      const expected = { success: false, error: "Invalid credentials" };
      mockSignIn.mockResolvedValue(expected);

      const { result } = renderHook(() => useAuth());

      let signInResult: unknown;
      await act(async () => {
        signInResult = await result.current.signIn("a@b.com", "pw");
      });

      expect(signInResult).toEqual(expected);
    });

    it("sets isLoading to true during sign-in and resets after", async () => {
      let resolveSignIn!: (v: { success: boolean }) => void;
      mockSignIn.mockImplementation(
        () => new Promise((r) => (resolveSignIn = r))
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.signIn("a@b.com", "pw");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn({ success: false });
        await promise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading even when signIn action throws", async () => {
      mockSignIn.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("does not navigate when signIn fails", async () => {
      mockSignIn.mockResolvedValue({ success: false, error: "Bad password" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    it("calls the signUp action with email and password", async () => {
      mockSignUp.mockResolvedValue({ success: false, error: "Exists" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("new@test.com", "pass456");
      });

      expect(mockSignUp).toHaveBeenCalledWith("new@test.com", "pass456");
    });

    it("returns the result from signUp action", async () => {
      const expected = { success: true };
      mockSignUp.mockResolvedValue(expected);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([{ id: "p1" }]);

      const { result } = renderHook(() => useAuth());

      let signUpResult: unknown;
      await act(async () => {
        signUpResult = await result.current.signUp("a@b.com", "pw");
      });

      expect(signUpResult).toEqual(expected);
    });

    it("sets isLoading to true during sign-up and resets after", async () => {
      let resolveSignUp!: (v: { success: boolean }) => void;
      mockSignUp.mockImplementation(
        () => new Promise((r) => (resolveSignUp = r))
      );

      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);

      let promise: Promise<unknown>;
      act(() => {
        promise = result.current.signUp("a@b.com", "pw");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp({ success: false });
        await promise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it("resets isLoading even when signUp action throws", async () => {
      mockSignUp.mockRejectedValue(new Error("Server error"));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("post-sign-in navigation", () => {
    it("saves anonymous work as a project and navigates to it", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "hello" }],
        fileSystemData: { "/App.jsx": "export default () => <div/>" },
      };
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-anon" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    });

    it("skips anonymous work with empty messages", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    it("navigates to most recent project when no anonymous work", async () => {
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([
        { id: "recent" },
        { id: "older" },
      ]);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent");
    });

    it("creates a new project when user has no existing projects", async () => {
      mockSignIn.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signIn("a@b.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+$/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });

    it("works the same for signUp post-auth flow", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "hi" }],
        fileSystemData: { "/App.jsx": "code" },
      };
      mockSignUp.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "signup-proj" });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signUp("a@b.com", "pw");
      });

      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/signup-proj");
    });
  });
});
