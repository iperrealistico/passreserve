"use client";

import { useMemo, useState } from "react";

import { PublicVisual } from "../../../lib/passreserve-visual-component.js";

function createEditorItem(item = {}, index = 0) {
  return {
    id: `${item.imageUrl || item.visualId || "gallery"}-${index}`,
    imageUrl: item.imageUrl || "",
    visualId: item.visualId || "",
    title: item.title || "",
    caption: item.caption || ""
  };
}

function serializeItems(items) {
  return items
    .map((item) => ({
      visualId: item.visualId || undefined,
      imageUrl: item.imageUrl || undefined,
      title: item.title || undefined,
      caption: item.caption || undefined
    }))
    .filter((item) => item.imageUrl || item.visualId);
}

function GalleryPreview({ item, label }) {
  if (item.imageUrl) {
    return (
      <div className="gallery-editor-preview-media">
        <img
          alt={label}
          className="gallery-editor-preview-image"
          decoding="async"
          loading="lazy"
          referrerPolicy="no-referrer"
          src={item.imageUrl}
        />
      </div>
    );
  }

  if (item.visualId) {
    return <PublicVisual className="gallery-editor-preview-media" visualId={item.visualId} />;
  }

  return (
    <div className="gallery-editor-preview-media gallery-editor-preview-empty">
      <span>Paste a direct image URL to preview it here.</span>
    </div>
  );
}

export function EventGalleryEditor({ initialItems = [] }) {
  const [items, setItems] = useState(() =>
    (initialItems.length ? initialItems : [{ imageUrl: "" }]).map(createEditorItem)
  );
  const serializedValue = useMemo(() => JSON.stringify(serializeItems(items)), [items]);

  function updateItem(targetId, patch) {
    setItems((current) =>
      current.map((item) => (item.id === targetId ? { ...item, ...patch } : item))
    );
  }

  function removeItem(targetId) {
    setItems((current) => {
      const nextItems = current.filter((item) => item.id !== targetId);
      return nextItems.length ? nextItems : [createEditorItem({ imageUrl: "" }, 0)];
    });
  }

  function moveItem(targetIndex, direction) {
    setItems((current) => {
      const nextIndex = targetIndex + direction;

      if (nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextItems = [...current];
      const [moved] = nextItems.splice(targetIndex, 1);
      nextItems.splice(nextIndex, 0, moved);
      return nextItems;
    });
  }

  return (
    <div className="gallery-editor">
      <input name="galleryJson" type="hidden" value={serializedValue} />
      <div className="gallery-editor-list">
        {items.map((item, index) => (
          <div className="gallery-editor-row" key={item.id}>
            <div className="gallery-editor-row-main">
              <div className="gallery-editor-row-head">
                <strong>Photo {index + 1}</strong>
                {item.visualId ? <span className="admin-page-tip">Seeded catalog photo</span> : null}
              </div>
              {item.visualId ? (
                <div className="gallery-editor-inline-note">
                  This event currently uses a built-in Passreserve image. Add your own photo URL
                  or remove this item if you want a simpler custom gallery.
                </div>
              ) : (
                <label className="field">
                  <span>Direct image URL</span>
                  <input
                    onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })}
                    placeholder="https://i.imgur.com/your-photo.jpg"
                    type="url"
                    value={item.imageUrl}
                  />
                </label>
              )}
            </div>

            <div className="gallery-editor-row-actions">
              <button
                className="button button-secondary button-small"
                onClick={() => moveItem(index, -1)}
                type="button"
              >
                Up
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() => moveItem(index, 1)}
                type="button"
              >
                Down
              </button>
              <button
                className="button button-secondary button-small"
                onClick={() => removeItem(item.id)}
                type="button"
              >
                Remove
              </button>
            </div>

            <GalleryPreview item={item} label={`Gallery preview ${index + 1}`} />
          </div>
        ))}
      </div>

      <div className="hero-actions">
        <button
          className="button button-secondary"
          onClick={() =>
            setItems((current) => [
              ...current,
              createEditorItem({ imageUrl: "" }, current.length)
            ])
          }
          type="button"
        >
          Add photo URL
        </button>
      </div>

      <p className="admin-page-tip">
        Paste direct image links only. Passreserve will display them on the public page, but it
        will not upload or host the files for you.
      </p>
    </div>
  );
}
