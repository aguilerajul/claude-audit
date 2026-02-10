import { Loader2, FileEdit, FilePlus, Trash2, FolderOpen } from "lucide-react";

interface ToolInvocationProps {
  toolName: string;
  args: string | Record<string, any>;
  state: "partial-call" | "call" | "result";
  result?: any;
}

function getToolMessage(toolName: string, args: Record<string, any>): {
  icon: React.ReactNode;
  message: string;
} {
  if (toolName === "str_replace_editor") {
    const command = args.command;
    const path = args.path || "";
    const fileName = path.split("/").pop() || path;

    switch (command) {
      case "create":
        return {
          icon: <FilePlus className="w-3 h-3" />,
          message: `Creating ${fileName}`,
        };
      case "str_replace":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Editing ${fileName}`,
        };
      case "insert":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Inserting into ${fileName}`,
        };
      case "view":
        return {
          icon: <FolderOpen className="w-3 h-3" />,
          message: `Viewing ${fileName}`,
        };
      default:
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Modifying ${fileName}`,
        };
    }
  }

  if (toolName === "file_manager") {
    const command = args.command;
    const path = args.path || "";
    const fileName = path.split("/").pop() || path;
    const newPath = args.new_path || "";
    const newFileName = newPath.split("/").pop() || newPath;

    switch (command) {
      case "rename":
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Renaming ${fileName} to ${newFileName}`,
        };
      case "delete":
        return {
          icon: <Trash2 className="w-3 h-3" />,
          message: `Deleting ${fileName}`,
        };
      default:
        return {
          icon: <FileEdit className="w-3 h-3" />,
          message: `Managing ${fileName}`,
        };
    }
  }

  return {
    icon: <FileEdit className="w-3 h-3" />,
    message: toolName,
  };
}

export function ToolInvocation({
  toolName,
  args,
  state,
  result,
}: ToolInvocationProps) {
  const parsedArgs = typeof args === "string" ? JSON.parse(args) : args;
  const { icon, message } = getToolMessage(toolName, parsedArgs);
  const isComplete = state === "result" && result;

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs border border-neutral-200">
      {isComplete ? (
        <>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <div className="flex items-center gap-1.5 text-neutral-700">
            {icon}
            <span>{message}</span>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          <div className="flex items-center gap-1.5 text-neutral-700">
            {icon}
            <span>{message}</span>
          </div>
        </>
      )}
    </div>
  );
}
