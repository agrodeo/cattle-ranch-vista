// Global error handlers for unhandled promises and JavaScript errors
export function initializeErrorHandlers() {
  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (e) => {
    console.error("Unhandled promise rejection:", e.reason);
    const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
    supportOpen?.({
      title: "Error no controlado (Promise)",
      message: String(e.reason),
      errorCode: "UNHANDLED_PROMISE"
    });
  });

  // Handle uncaught JavaScript errors
  window.addEventListener("error", (e) => {
    console.error("Uncaught error:", e.error || e.message);
    const supportOpen = (window as any).__supportOpen as ((ctx?: any) => void) | undefined;
    supportOpen?.({
      title: "Error no controlado (JavaScript)",
      message: e.error?.message || e.message || "Error desconocido",
      errorCode: "UNCAUGHT_ERROR"
    });
  });
}