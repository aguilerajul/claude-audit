import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolInvocation } from "../ToolInvocation";

afterEach(() => {
  cleanup();
});

describe("ToolInvocation", () => {
  describe("str_replace_editor tool", () => {
    it("displays creating message for create command", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "create", path: "/components/Button.jsx" }}
          state="call"
        />
      );

      expect(screen.getByText("Creating Button.jsx")).toBeDefined();
    });

    it("displays editing message for str_replace command", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "str_replace", path: "/App.jsx" }}
          state="call"
        />
      );

      expect(screen.getByText("Editing App.jsx")).toBeDefined();
    });

    it("displays inserting message for insert command", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "insert", path: "/utils/helper.js" }}
          state="call"
        />
      );

      expect(screen.getByText("Inserting into helper.js")).toBeDefined();
    });

    it("displays viewing message for view command", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "view", path: "/config.json" }}
          state="call"
        />
      );

      expect(screen.getByText("Viewing config.json")).toBeDefined();
    });

    it("handles nested file paths correctly", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{
            command: "create",
            path: "/src/components/ui/Card.tsx",
          }}
          state="call"
        />
      );

      expect(screen.getByText("Creating Card.tsx")).toBeDefined();
    });
  });

  describe("file_manager tool", () => {
    it("displays renaming message for rename command", () => {
      render(
        <ToolInvocation
          toolName="file_manager"
          args={{
            command: "rename",
            path: "/old-name.jsx",
            new_path: "/new-name.jsx",
          }}
          state="call"
        />
      );

      expect(screen.getByText("Renaming old-name.jsx to new-name.jsx")).toBeDefined();
    });

    it("displays deleting message for delete command", () => {
      render(
        <ToolInvocation
          toolName="file_manager"
          args={{ command: "delete", path: "/temp.js" }}
          state="call"
        />
      );

      expect(screen.getByText("Deleting temp.js")).toBeDefined();
    });
  });

  describe("state handling", () => {
    it("shows loading spinner when state is call", () => {
      const { container } = render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "create", path: "/test.jsx" }}
          state="call"
        />
      );

      const spinner = container.querySelector(".animate-spin");
      expect(spinner).toBeDefined();
    });

    it("shows success indicator when state is result", () => {
      const { container } = render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "create", path: "/test.jsx" }}
          state="result"
          result={{ success: true }}
        />
      );

      const successDot = container.querySelector(".bg-emerald-500");
      expect(successDot).toBeDefined();
    });
  });

  describe("args parsing", () => {
    it("handles args as string", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args='{"command":"create","path":"/test.jsx"}'
          state="call"
        />
      );

      expect(screen.getByText("Creating test.jsx")).toBeDefined();
    });

    it("handles args as object", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "create", path: "/test.jsx" }}
          state="call"
        />
      );

      expect(screen.getByText("Creating test.jsx")).toBeDefined();
    });
  });

  describe("unknown tools", () => {
    it("displays tool name for unknown tools", () => {
      render(
        <ToolInvocation
          toolName="unknown_tool"
          args={{}}
          state="call"
        />
      );

      expect(screen.getByText("unknown_tool")).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("handles missing path gracefully", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ command: "create" }}
          state="call"
        />
      );

      expect(screen.getByText("Creating")).toBeDefined();
    });

    it("handles missing command gracefully", () => {
      render(
        <ToolInvocation
          toolName="str_replace_editor"
          args={{ path: "/test.jsx" }}
          state="call"
        />
      );

      expect(screen.getByText("Modifying test.jsx")).toBeDefined();
    });
  });
});
