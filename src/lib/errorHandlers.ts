// Global error handlers for unhandled promises and JavaScript errors

let handlersInitialized = false;
let lastSupportErrorKey = "";
let lastSupportErrorAt = 0;

const SUPPORT_ERROR_COOLDOWN_MS = 12000;

function shouldIgnoreErrorMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return (
    normalized === "script error." ||
    normalized === "script error" ||
    normalized.includes("non-error promise rejection captured") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("load failed") ||
    normalized.includes("aborterror") ||
    normalized.includes("error.loadfailed") ||
    normalized.includes("the operation was aborted") ||
    normalized.includes("the internet connection appears to be offline")
  );
}

function canOpenSupportForError(errorKey: string) {
  const now = Date.now();
  if (errorKey === lastSupportErrorKey && now - lastSupportErrorAt < SUPPORT_ERROR_COOLDOWN_MS) {
    return false;
  }
  lastSupportErrorKey = errorKey;
  lastSupportErrorAt = now;
  return true;
}

export function initializeErrorHandlers() {
  if (handlersInitialized) {
    return () => {};
  }

  const onUnhandledRejection = (e: PromiseRejectionEvent) => {
    const message = String(e.reason?.message ?? e.reason ?? "Unknown promise rejection");
    if (shouldIgnoreErrorMessage(message)) return;

    console.error("Unhandled promise rejection:", e.reason);
    try {
      const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
      const errorKey = `UNHANDLED_PROMISE:${message}`;
      if (typeof supportOpen === 'function' && canOpenSupportForError(errorKey)) {
        supportOpen({
          title: "Error no controlado (Promise)",
          message,
          errorCode: "UNHANDLED_PROMISE"
        });
      }
    } catch (err) {
      console.error("Failed to open support dialog:", err);
    }
  };

  const onUncaughtError = (e: ErrorEvent) => {
    const message = e.error?.message || e.message || "Error desconocido";
    if (shouldIgnoreErrorMessage(message)) return;

    console.error("Uncaught error:", e.error || e.message);
    try {
      const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
      const errorKey = `UNCAUGHT_ERROR:${message}`;
      if (typeof supportOpen === 'function' && canOpenSupportForError(errorKey)) {
        supportOpen({
          title: "Error no controlado (JavaScript)",
          message,
          errorCode: "UNCAUGHT_ERROR"
        });
      }
    } catch (err) {
      console.error("Failed to open support dialog:", err);
    }
  };

  window.addEventListener("unhandledrejection", onUnhandledRejection);
  window.addEventListener("error", onUncaughtError);
  handlersInitialized = true;

  return () => {
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
    window.removeEventListener("error", onUncaughtError);
    handlersInitialized = false;
  };
}
