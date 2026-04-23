function resolveMedia(media) {
  if (media?.imageUrl) {
    return {
      type: "remote",
      alt: media.alt || media.title || "",
      imageUrl: media.imageUrl,
      aspectRatio: media.aspectRatio || "4 / 3"
    };
  }

  return null;
}

export function PassreserveMedia({
  media,
  alt,
  className = "",
  imageClassName = "",
  priority = false,
  aspectRatio,
  children
}) {
  const resolved = resolveMedia(media);

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
    (resolved.aspectRatio || "4 / 3");
  const resolvedAlt = alt ?? resolved.alt;

  return (
    <div className={wrapperClassName} style={{ aspectRatio: resolvedAspectRatio }}>
      <img
        alt={resolvedAlt}
        className={["public-visual-image", imageClassName].filter(Boolean).join(" ")}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        src={resolved.imageUrl}
      />
      {children ? <div className="public-visual-content">{children}</div> : null}
    </div>
  );
}
