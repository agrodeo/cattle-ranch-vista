import { useEffect, useState } from "react";

/**
 * Returns the height in px occupied by the on-screen keyboard (or any other
 * UA widget that shrinks the visual viewport from the bottom). Returns 0 when
 * the keyboard is closed or when window.visualViewport is unavailable.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      const bottom = window.innerHeight - (vv.height + vv.offsetTop);
      setInset(Math.max(0, Math.round(bottom)));
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
