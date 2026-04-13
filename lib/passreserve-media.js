import Image from "next/image";

import { getPublicVisual } from "./passreserve-visuals.js";

function resolveMedia(media, fallbackVisualId = null) {
  if (media?.imageUrl) {
    return {
      type: "remote",
      alt: media.alt || media.title || "",
      imageUrl: media.imageUrl,
      aspectRatio: media.aspectRatio || "4 / 3"
    };
  }

  const visualId = media?.visualId || fallbackVisualId;

  if (!visualId) {
    return null;
  }

  const visual = getPublicVisual(visualId);

  return {
    type: "catalog",
    alt: media?.alt || media?.title || visual.alt,
    src: visual.src,
    width: visual.width,
    height: visual.height
  };
}

export function PassreserveMedia({
  media,
  fallbackVisualId = null,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  sizes = "(min-width: 1024px) 40vw, 100vw",
  aspectRatio,
  children
}) {
  const resolved = resolveMedia(media, fallbackVisualId);

  if (!resolved) {
    return null;
  }

  const wrapperClassName = [
    "public-visual",
    children ? "public-visual-has-content" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");
  const resolvedAspectRatio =
    aspectRatio ??
    (resolved.type === "catalog"
      ? `${resolved.width} / ${resolved.height}`
      : resolved.aspectRatio || "4 / 3");
  const resolvedAlt = alt ?? resolved.alt;

  return (
    <div className={wrapperClassName} style={{ aspectRatio: resolvedAspectRatio }}>
      {resolved.type === "catalog" ? (
        <Image
          alt={resolvedAlt}
          className={["public-visual-image", imageClassName].filter(Boolean).join(" ")}
          fill
          loading={priority ? undefined : "lazy"}
          priority={priority}
          quality={82}
          sizes={sizes}
          src={resolved.src}
        />
      ) : (
        <img
          alt={resolvedAlt}
          className={["public-visual-image", imageClassName].filter(Boolean).join(" ")}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          loading={priority ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          src={resolved.imageUrl}
        />
      )}
      {children ? <div className="public-visual-content">{children}</div> : null}
    </div>
  );
}
