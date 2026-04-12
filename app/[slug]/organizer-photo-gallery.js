"use client";

import { useState } from "react";

import { PublicVisual } from "../../lib/passreserve-visual-component.js";

export function OrganizerPhotoGallery({ photos }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activePhoto = photos[activeIndex] || photos[0];

  if (!activePhoto) {
    return null;
  }

  const showControls = photos.length > 1;
  const selectPhoto = (nextIndex) => {
    const boundedIndex = (nextIndex + photos.length) % photos.length;
    setActiveIndex(boundedIndex);
  };

  return (
    <div className="organizer-gallery">
      <div className="organizer-gallery-stage">
        <PublicVisual
          alt={`${activePhoto.title}. ${activePhoto.caption}`}
          className="organizer-gallery-main"
          priority
          sizes="(min-width: 1024px) 55vw, 100vw"
          visualId={activePhoto.visualId}
        />

        <div className="organizer-gallery-panel">
          <span className="spotlight-label">Venue gallery</span>
          <h4>{activePhoto.title}</h4>
          <p>{activePhoto.caption}</p>
          <div className="organizer-gallery-meta">
            <span>
              Photo {activeIndex + 1} of {photos.length}
            </span>
            <span>Browse the setting before you choose a date.</span>
          </div>
          {showControls ? (
            <div className="hero-actions organizer-gallery-actions">
              <button
                className="button button-secondary"
                onClick={() => selectPhoto(activeIndex - 1)}
                type="button"
              >
                Previous photo
              </button>
              <button
                className="button button-primary"
                onClick={() => selectPhoto(activeIndex + 1)}
                type="button"
              >
                Next photo
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showControls ? (
        <div
          aria-label="Organizer venue gallery thumbnails"
          className="organizer-gallery-thumbnails"
          role="tablist"
        >
          {photos.map((photo, index) => (
            <button
              aria-selected={index === activeIndex}
              className={`organizer-gallery-thumb ${index === activeIndex ? "organizer-gallery-thumb-active" : ""}`}
              key={`${photo.title}-${index}`}
              onClick={() => setActiveIndex(index)}
              role="tab"
              type="button"
            >
              <PublicVisual
                alt={`${photo.title}. ${photo.caption}`}
                className="organizer-gallery-thumb-image"
                sizes="180px"
                visualId={photo.visualId}
              />
              <span className="organizer-gallery-thumb-copy">
                <strong>{photo.title}</strong>
                <span>{photo.caption}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
