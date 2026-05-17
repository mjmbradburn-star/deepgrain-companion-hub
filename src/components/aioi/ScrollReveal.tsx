/**
 * ScrollReveal — wraps children in a div that adds the `is-visible` class
 * when it enters the viewport. Stagger via the `index` prop (integer),
 * multiplied by 70ms in CSS via the `--i` custom property.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Stagger index — multiplied by 70ms in CSS. */
  index?: number;
}

type RevealStyle = CSSProperties & { "--i"?: number };

export function ScrollReveal({
  children,
  className = "",
  index = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const style: RevealStyle = { "--i": index };

  return (
    <div
      ref={ref}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  );
}
