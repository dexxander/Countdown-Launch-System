export const LAUNCH_CHANNEL = "launch-countdown";
export const LAUNCH_EVENT = "start";
export const COUNTDOWN_FROM = 5;

export function isValidLaunchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
