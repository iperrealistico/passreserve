"use client";

import { useEffect, useMemo, useState } from "react";

import { PassreserveMedia } from "../../lib/passreserve-media.js";

export function PublicPhotoGallery({ items = [], title = "Gallery" }) {
  const photos = useMemo(() => items.filter(Boolean), [items]);
  const previewPhotos = photos.slice(0, 5);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const activePhoto = photos[activeIndex] || photos[0] || null;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % photos.length);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + photos.length) % photos.length);
      }
    }

    document.body.classList.add("gallery-modal-open");
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove("gallery-modal-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, photos.length]);

  if (!previewPhotos.length) {
    return null;
  }

  return (
    <>
      <div
        className={`photo-gallery-grid photo-gallery-grid-${Math.min(previewPhotos.length, 5)}`}
      >
        {previewPhotos.map((photo, index) => (
          <button
            className={`photo-gallery-tile${index === 0 ? " photo-gallery-tile-featured" : ""}`}
            key={`${photo.imageUrl || photo.visualId || "photo"}-${index}`}
            onClick={() => {
              setActiveIndex(index);
              setIsOpen(true);
            }}
            type="button"
          >
            <PassreserveMedia
              alt={`${title} photo ${index + 1}`}
              className="photo-gallery-media"
              media={photo}
              sizes={index === 0 ? "(min-width: 1024px) 56vw, 100vw" : "(min-width: 1024px) 22vw, 50vw"}
            />
          </button>
        ))}
        {photos.length > 1 ? (
          <button
            className="photo-gallery-all-button"
            onClick={() => {
              setActiveIndex(0);
              setIsOpen(true);
            }}
            type="button"
          >
            View all photos
          </button>
        ) : null}
      </div>

      {isOpen && activePhoto ? (
        <div
          aria-label={`${title} viewer`}
          className="photo-gallery-modal"
          role="dialog"
          aria-modal="true"
        >
          <button
            aria-label="Close photo viewer"
            className="photo-gallery-backdrop"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <div className="photo-gallery-dialog">
            <div className="photo-gallery-dialog-bar">
              <div>
                <strong>{title}</strong>
                <span>
                  Photo {activeIndex + 1} of {photos.length}
                </span>
              </div>
              <button
                className="button button-secondary button-small"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="photo-gallery-stage">
              <button
                aria-label="Previous photo"
                className="photo-gallery-nav photo-gallery-nav-prev"
                onClick={() => setActiveIndex((current) => (current - 1 + photos.length) % photos.length)}
                type="button"
              >
                Prev
              </button>
              <PassreserveMedia
                alt={`${title} photo ${activeIndex + 1}`}
                className="photo-gallery-stage-media"
                media={activePhoto}
                priority
                sizes="90vw"
              />
              <button
                aria-label="Next photo"
                className="photo-gallery-nav photo-gallery-nav-next"
                onClick={() => setActiveIndex((current) => (current + 1) % photos.length)}
                type="button"
              >
                Next
              </button>
            </div>

            {photos.length > 1 ? (
              <div className="photo-gallery-strip">
                {photos.map((photo, index) => (
                  <button
                    aria-label={`Open photo ${index + 1}`}
                    className={`photo-gallery-strip-item${index === activeIndex ? " photo-gallery-strip-item-active" : ""}`}
                    key={`${photo.imageUrl || photo.visualId || "thumb"}-${index}`}
                    onClick={() => setActiveIndex(index)}
                    type="button"
                  >
                    <PassreserveMedia
                      alt={`${title} thumbnail ${index + 1}`}
                      className="photo-gallery-strip-media"
                      media={photo}
                      sizes="140px"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
