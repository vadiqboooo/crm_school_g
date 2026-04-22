let refresher: (() => void) | null = null;

export function registerChatBadgeRefresher(fn: (() => void) | null) {
  refresher = fn;
}

export function refreshChatBadge() {
  refresher?.();
}
