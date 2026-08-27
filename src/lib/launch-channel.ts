export const LAUNCH_CHANNEL_PREFIX = "launch-countdown";
export const LAUNCH_EVENT = "start";
export const COUNTDOWN_FROM = 5;

export function createRoomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getLaunchChannel(roomId: string): string {
  return `${LAUNCH_CHANNEL_PREFIX}:${roomId}`;
}

export function isValidRoomId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(value);
}

export function isValidLaunchUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
