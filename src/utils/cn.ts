/**
 * Minimal className merger — avoids taking clsx/twMerge as a dep.
 * Consumers can wrap with their own merger if they use Tailwind.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
