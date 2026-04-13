import Image from "next/image";

import { getPublicVisual } from "./passreserve-visuals";

export function PublicVisual({
  visualId,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  aspectRatio,
  children
}) {
  const visual = getPublicVisual(visualId);

  return (
    <div
      className={["public-visual", children ? "public-visual-has-content" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ aspectRatio: aspectRatio ?? `${visual.width} / ${visual.height}` }}
    >
      <Image
        alt={alt ?? visual.alt}
        className={["public-visual-image", imageClassName].filter(Boolean).join(" ")}
        fill
        loading={priority ? undefined : "lazy"}
        priority={priority}
        quality={82}
        sizes={sizes}
        src={visual.src}
      />
      {children ? <div className="public-visual-content">{children}</div> : null}
    </div>
  );
}
