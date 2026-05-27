export type Theme = "dark" | "light";

/** Props shared by every Miosa component */
export interface MiosaBaseProps {
  /** CSS class forwarded to the root element */
  className?: string;
  /** Visual theme. Defaults to "dark". */
  theme?: Theme;
  /** Called on any SDK/network error */
  onError?: (err: Error) => void;
}

/** Auth: provide exactly one of apiKey or previewToken */
export type MiosaAuth =
  | { apiKey: string; previewToken?: never }
  | { previewToken: string; apiKey?: never };
