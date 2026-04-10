import Image from "next/image";

import { getPublicVisual } from "./passreserve-visuals";

export function PublicVisual({
  visualId,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  children
}) {
  const visual = getPublicVisual(visualId);

  return (
    <div
      className={["public-visual", className].filter(Boolean).join(" ")}
      style={{ aspectRatio: `${visual.width} / ${visual.height}` }}
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
