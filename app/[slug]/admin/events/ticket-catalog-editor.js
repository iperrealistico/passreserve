"use client";

import { useEffect, useMemo, useState } from "react";

function toEurosInput(cents) {
  if (typeof cents !== "number") {
    return "";
  }

  const euros = cents / 100;
  return Number.isInteger(euros) ? String(euros) : euros.toFixed(2);
}

function createBlankTicket(priceCents = 0, sortOrder = 0) {
  return {
    id: "",
    slug: "",
    priceEuros: toEurosInput(priceCents),
    isDefault: sortOrder === 0,
    isActive: true,
    sortOrder,
    nameIt: "",
    nameEn: "",
    descriptionIt: "",
    descriptionEn: "",
    includedIt: "",
    includedEn: ""
  };
}

function buildEditableTicket(ticket, index) {
  return {
    id: ticket.id || "",
    slug: ticket.slug || "",
    priceEuros: toEurosInput(ticket.unitPriceCents),
    isDefault: Boolean(ticket.isDefault),
    isActive: ticket.isActive !== false,
    sortOrder: Number(ticket.sortOrder || index),
    nameIt: ticket.contentI18n?.name?.it || "",
    nameEn: ticket.contentI18n?.name?.en || ticket.name || "",
    descriptionIt: ticket.contentI18n?.description?.it || "",
    descriptionEn: ticket.contentI18n?.description?.en || ticket.description || "",
    includedIt: Array.isArray(ticket.contentI18n?.included?.it)
      ? ticket.contentI18n.included.it.join("\n")
      : Array.isArray(ticket.included)
        ? ticket.included.join("\n")
        : "",
    includedEn: Array.isArray(ticket.contentI18n?.included?.en)
      ? ticket.contentI18n.included.en.join("\n")
      : Array.isArray(ticket.included)
        ? ticket.included.join("\n")
        : ""
  };
}

export function TicketCatalogEditor({
  defaultPriceCents = 0,
  initialTickets = [],
  isItalian = false
}) {
  const [tickets, setTickets] = useState(
    initialTickets.length
      ? initialTickets.map((ticket, index) => buildEditableTicket(ticket, index))
      : [createBlankTicket(defaultPriceCents, 0)]
  );

  useEffect(() => {
    if (!tickets.length) {
      setTickets([createBlankTicket(defaultPriceCents, 0)]);
    }
  }, [defaultPriceCents, tickets.length]);

  function updateTicket(index, patch) {
    setTickets((current) =>
      current.map((ticket, ticketIndex) =>
        ticketIndex === index ? { ...ticket, ...patch } : ticket
      )
    );
  }

  function setDefaultTicket(index) {
    setTickets((current) =>
      current.map((ticket, ticketIndex) => ({
        ...ticket,
        isDefault: ticketIndex === index
      }))
    );
  }

  function addTicket() {
    setTickets((current) => [
      ...current,
      createBlankTicket(defaultPriceCents, current.length)
    ]);
  }

  function removeTicket(index) {
    setTickets((current) => {
      if (current.length === 1) {
        return [createBlankTicket(defaultPriceCents, 0)];
      }

      const next = current.filter((_ticket, ticketIndex) => ticketIndex !== index);

      if (!next.some((ticket) => ticket.isDefault)) {
        next[0].isDefault = true;
      }

      return next.map((ticket, ticketIndex) => ({
        ...ticket,
        sortOrder: ticketIndex
      }));
    });
  }

  function moveTicket(index, direction) {
    setTickets((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [ticket] = next.splice(index, 1);
      next.splice(targetIndex, 0, ticket);

      return next.map((entry, ticketIndex) => ({
        ...entry,
        sortOrder: ticketIndex
      }));
    });
  }

  const serializedTickets = useMemo(
    () =>
      JSON.stringify(
        tickets.map((ticket, index) => ({
          ...ticket,
          sortOrder: index
        }))
      ),
    [tickets]
  );

  return (
    <div className="registration-panel-stack">
      <input name="ticketCatalogJson" type="hidden" value={serializedTickets} />

      <div className="admin-section-header">
        <div>
          <span className="metric-label">{isItalian ? "Catalogo ticket" : "Ticket catalog"}</span>
          <strong>
            {isItalian
              ? "Aggiungi i ticket acquistabili in uno stesso ordine."
              : "Add the ticket types that can be purchased in the same order."}
          </strong>
        </div>
        <button className="button button-secondary" onClick={addTicket} type="button">
          {isItalian ? "Aggiungi ticket" : "Add ticket"}
        </button>
      </div>

      <div className="admin-card-grid">
        {tickets.map((ticket, index) => (
          <article className="admin-card" key={ticket.id || `ticket-${index}`}>
            <div className="admin-card-head">
              <div>
                <div className="admin-badge-row">
                  <span className="admin-badge admin-badge-public">
                    {isItalian ? `Ticket ${index + 1}` : `Ticket ${index + 1}`}
                  </span>
                  {ticket.isDefault ? (
                    <span className="admin-badge admin-badge-capacity-watch">
                      {isItalian ? "Default" : "Default"}
                    </span>
                  ) : null}
                </div>
                <h4>{ticket.nameEn || ticket.nameIt || (isItalian ? "Nuovo ticket" : "New ticket")}</h4>
                <p>
                  {isItalian
                    ? "Se compili una sola lingua, il frontend usera quella disponibile."
                    : "If you fill only one language, the frontend will use the available version."}
                </p>
              </div>
            </div>

            <div className="registration-field-grid">
              <label className="field">
                <span>Slug</span>
                <input
                  onChange={(event) => updateTicket(index, { slug: event.target.value })}
                  type="text"
                  value={ticket.slug}
                />
              </label>
              <label className="field">
                <span>{isItalian ? "Prezzo EUR" : "Price EUR"}</span>
                <input
                  inputMode="decimal"
                  onChange={(event) => updateTicket(index, { priceEuros: event.target.value })}
                  step="0.01"
                  type="number"
                  value={ticket.priceEuros}
                />
              </label>
              <div className="field field-span">
                <span>{isItalian ? "Ticket predefinito" : "Default ticket"}</span>
                <button
                  className={`button ${ticket.isDefault ? "button-primary" : "button-secondary"}`}
                  onClick={() => setDefaultTicket(index)}
                  type="button"
                >
                  {ticket.isDefault
                    ? isItalian
                      ? "Selezionato come default"
                      : "Selected as default"
                    : isItalian
                      ? "Imposta come default"
                      : "Set as default"}
                </button>
              </div>

              <div className="locale-fieldset field-span">
                <div className="locale-field-column">
                  <div className="section-kicker">Italiano</div>
                  <label className="field">
                    <span>{isItalian ? "Nome ticket" : "Ticket name"}</span>
                    <input
                      onChange={(event) => updateTicket(index, { nameIt: event.target.value })}
                      type="text"
                      value={ticket.nameIt}
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      onChange={(event) =>
                        updateTicket(index, { descriptionIt: event.target.value })
                      }
                      rows="2"
                      value={ticket.descriptionIt}
                    />
                  </label>
                  <label className="field">
                    <span>{isItalian ? "Incluso (uno per riga)" : "Included (one per line)"}</span>
                    <textarea
                      onChange={(event) => updateTicket(index, { includedIt: event.target.value })}
                      rows="4"
                      value={ticket.includedIt}
                    />
                  </label>
                </div>

                <div className="locale-field-column">
                  <div className="section-kicker">English</div>
                  <label className="field">
                    <span>Ticket name</span>
                    <input
                      onChange={(event) => updateTicket(index, { nameEn: event.target.value })}
                      type="text"
                      value={ticket.nameEn}
                    />
                  </label>
                  <label className="field">
                    <span>Summary</span>
                    <textarea
                      onChange={(event) =>
                        updateTicket(index, { descriptionEn: event.target.value })
                      }
                      rows="2"
                      value={ticket.descriptionEn}
                    />
                  </label>
                  <label className="field">
                    <span>Included (one per line)</span>
                    <textarea
                      onChange={(event) => updateTicket(index, { includedEn: event.target.value })}
                      rows="4"
                      value={ticket.includedEn}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="button button-secondary"
                disabled={index === 0}
                onClick={() => moveTicket(index, "up")}
                type="button"
              >
                {isItalian ? "Sposta su" : "Move up"}
              </button>
              <button
                className="button button-secondary"
                disabled={index === tickets.length - 1}
                onClick={() => moveTicket(index, "down")}
                type="button"
              >
                {isItalian ? "Sposta giu" : "Move down"}
              </button>
              <button
                className="button button-secondary button-danger"
                onClick={() => removeTicket(index)}
                type="button"
              >
                {isItalian ? "Rimuovi" : "Remove"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
