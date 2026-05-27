// Core components
export { MiosaPreview } from "./components/MiosaPreview.js";
export type { MiosaPreviewProps } from "./components/MiosaPreview.js";

export { MiosaTerminal } from "./components/MiosaTerminal.js";
export type { MiosaTerminalProps } from "./components/MiosaTerminal.js";

export { MiosaFileTree } from "./components/MiosaFileTree.js";
export type {
  MiosaFileTreeProps,
  FileNode,
} from "./components/MiosaFileTree.js";

// Optional: requires @monaco-editor/react peer dep
export { MiosaCodeEditor } from "./components/MiosaCodeEditor.js";
export type { MiosaCodeEditorProps } from "./components/MiosaCodeEditor.js";

export { MiosaUsage } from "./components/MiosaUsage.js";
export type { MiosaUsageProps } from "./components/MiosaUsage.js";

export { MiosaShareButton } from "./components/MiosaShareButton.js";
export type { MiosaShareButtonProps } from "./components/MiosaShareButton.js";

// Theme provider
export { MiosaThemeProvider } from "./components/MiosaThemeProvider.js";
export type { MiosaThemeProviderProps } from "./components/MiosaThemeProvider.js";

// Phase 6 — Admin governance
export { MiosaPolicyEditor } from "./components/MiosaPolicyEditor.js";
export type {
  MiosaPolicyEditorProps,
  PolicyScope,
} from "./components/MiosaPolicyEditor.js";

export { MiosaMemberManager } from "./components/MiosaMemberManager.js";
export type {
  MiosaMemberManagerProps,
  MemberScope,
} from "./components/MiosaMemberManager.js";

export { MiosaWorkspaceManager } from "./components/MiosaWorkspaceManager.js";
export type { MiosaWorkspaceManagerProps } from "./components/MiosaWorkspaceManager.js";

export { MiosaUsageDashboard } from "./components/MiosaUsageDashboard.js";
export type {
  MiosaUsageDashboardProps,
  UsageScope,
} from "./components/MiosaUsageDashboard.js";

export { MiosaAuditLog } from "./components/MiosaAuditLog.js";
export type {
  MiosaAuditLogProps,
  AuditLogFilters,
} from "./components/MiosaAuditLog.js";

export { MiosaActivityFeed } from "./components/MiosaActivityFeed.js";
export type { MiosaActivityFeedProps } from "./components/MiosaActivityFeed.js";

export { MiosaBulkActions } from "./components/MiosaBulkActions.js";
export type {
  MiosaBulkActionsProps,
  BulkAction,
} from "./components/MiosaBulkActions.js";

export { MiosaBrandingEditor } from "./components/MiosaBrandingEditor.js";
export type { MiosaBrandingEditorProps } from "./components/MiosaBrandingEditor.js";

export { MiosaApiKeyManager } from "./components/MiosaApiKeyManager.js";
export type { MiosaApiKeyManagerProps } from "./components/MiosaApiKeyManager.js";

// Shared types
export type { Theme, MiosaBaseProps, MiosaAuth } from "./types.js";
