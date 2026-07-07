/**
 * App scheme handler for opening Xiaohongshu
 * Attempts to open the Xiaohongshu app, with fallback to web version
 */
export const useAppScheme = () => {
  const openXiaohongshu = () => {
    const scheme = "xhsdiscover://";
    const fallbackUrl = "https://www.xiaohongshu.com";

    // Create a hidden iframe to attempt app opening
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = scheme;
    document.body.appendChild(iframe);

    // Set timeout to detect if app didn't open
    const timer = setTimeout(() => {
      document.body.removeChild(iframe);
      // If still here, app is not installed, try web version
      window.open(fallbackUrl, "_blank");
    }, 2000);

    // Clear timeout if app opened (page visibility will change)
    const handleVisibilityChange = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.body.removeChild(iframe);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
  };

  return {
    openXiaohongshu,
  };
};
