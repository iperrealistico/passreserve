"use client";

import { useMemo, useState } from "react";

function createEditorItem(item = {}, index = 0) {
  return {
    id: `${item.imageUrl || "gallery"}-${index}`,
    imageUrl: item.imageUrl || "",
    title: item.title || "",
    caption: item.caption || ""
  };
}

function serializeItems(items) {
  return items
    .map((item) => ({
      imageUrl: item.imageUrl || undefined,
      title: item.title || undefined,
      caption: item.caption || undefined
    }))
    .filter((item) => item.imageUrl);
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
            <div className="gallery-editor-row-head">
              <div className="gallery-editor-row-title">
                <strong>Photo {index + 1}</strong>
                <span>Paste a direct image URL to preview it here.</span>
              </div>
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
            <div className="gallery-editor-row-layout">
              <div className="gallery-editor-row-main">
                <label className="field">
                  <span>Direct image URL</span>
                  <input
                    onChange={(event) => updateItem(item.id, { imageUrl: event.target.value })}
                    placeholder="https://i.imgur.com/your-photo.jpg"
                    type="url"
                    value={item.imageUrl}
                  />
                </label>
                <label className="field">
                  <span>Photo title</span>
                  <input
                    onChange={(event) => updateItem(item.id, { title: event.target.value })}
                    placeholder="Optional title"
                    type="text"
                    value={item.title}
                  />
                </label>
                <label className="field">
                  <span>Caption</span>
                  <textarea
                    onChange={(event) => updateItem(item.id, { caption: event.target.value })}
                    placeholder="Optional short caption"
                    rows="2"
                    value={item.caption}
                  />
                </label>
              </div>
              <GalleryPreview item={item} label={`Gallery preview ${index + 1}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="gallery-editor-footer">
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
        <p className="admin-page-tip">
          Paste direct image links only. Generated template images are no longer used as fallbacks,
          so pages stay text-first if no real photo is provided.
        </p>
      </div>
    </div>
  );
}
