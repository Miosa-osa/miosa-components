import React, { createContext, useContext } from "react";
import type { Theme } from "../types.js";

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark" });

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export interface MiosaThemeProviderProps {
  theme?: Theme;
  /** When true, injects the bundled stylesheet automatically. */
  injectStyles?: boolean;
  children: React.ReactNode;
}

let stylesInjected = false;

export function MiosaThemeProvider({
  theme = "dark",
  injectStyles = false,
  children,
}: MiosaThemeProviderProps): React.ReactElement {
  if (injectStyles && !stylesInjected && typeof document !== "undefined") {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    // consumers import "@miosa/react/styles.css" directly, or let the
    // provider inject it lazily via this flag.
    // When injectStyles is used, consumers must ensure styles.css is reachable.
    // This is a best-effort path; the recommended approach is to import the
    // CSS file directly: import "@miosa/react/styles.css"
    link.href = "/@miosa/react/styles.css";
    document.head.appendChild(link);
    stylesInjected = true;
  }

  return (
    <ThemeContext.Provider value={{ theme }}>
      <div data-miosa-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}
