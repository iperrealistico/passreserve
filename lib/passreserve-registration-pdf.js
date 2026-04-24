import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function getPdfLabels(locale = "en") {
  if (locale === "it") {
    return {
      title: "Elenco partecipanti",
      operational: "Operativo",
      full: "Completo",
      organizer: "Organizer",
      event: "Evento",
      date: "Data",
      generated: "Generato",
      ticketBreakdown: "Riepilogo ticket",
      participants: "Partecipanti",
      restrictions: "Restrizioni",
      none: "Nessuna",
      registration: "Registrazione",
      status: "Stato",
      email: "Email",
      phone: "Telefono",
      address: "Indirizzo",
      ticket: "Ticket",
      summary: "Riepilogo",
      totalParticipants: "Totale partecipanti",
      withRestrictions: "Con restrizioni"
    };
  }

  return {
    title: "Participant list",
    operational: "Operational",
    full: "Full",
    organizer: "Organizer",
    event: "Event",
    date: "Date",
    generated: "Generated",
    ticketBreakdown: "Ticket breakdown",
    participants: "Participants",
    restrictions: "Restrictions",
    none: "None",
    registration: "Registration",
    status: "Status",
    email: "Email",
    phone: "Phone",
    address: "Address",
    ticket: "Ticket",
    summary: "Summary",
    totalParticipants: "Total participants",
    withRestrictions: "With restrictions"
  };
}

function formatNow(locale) {
  return new Intl.DateTimeFormat(locale === "it" ? "it-IT" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());
}

function wrapText(text, maxChars = 90) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (nextLine.length > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = nextLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [""];
}

export async function buildRegistrationParticipantsPdf({
  locale = "en",
  organizerName,
  eventTitle,
  occurrenceLabel,
  occurrenceTime = "",
  registrations = [],
  variant = "operational"
}) {
  const labels = getPdfLabels(locale);
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pageSize = [595.28, 841.89];
  const margin = 40;
  const boxPadding = 12;
  const ticketCounts = new Map();
  let totalParticipants = 0;
  let participantsWithRestrictions = 0;

  for (const registration of registrations) {
    for (const item of registration.ticketItems || []) {
      ticketCounts.set(item.label, (ticketCounts.get(item.label) || 0) + Number(item.quantity || 0));
    }

    for (const attendee of registration.attendees || []) {
      totalParticipants += 1;

      if ((attendee.dietaryFlagLabels || []).length || attendee.dietaryOther) {
        participantsWithRestrictions += 1;
      }
    }
  }

  let page = document.addPage(pageSize);
  let y = pageSize[1] - margin;

  function ensureSpace(height) {
    if (y - height < margin) {
      page = document.addPage(pageSize);
      y = pageSize[1] - margin;
    }
  }

  function drawTextLine(text, options = {}) {
    const {
      font = regular,
      size = 10,
      color = rgb(0.15, 0.16, 0.18),
      x = margin
    } = options;

    ensureSpace(size + 4);
    page.drawText(String(text || ""), {
      x,
      y,
      size,
      font,
      color
    });
    y -= size + 4;
  }

  function drawWrappedBlock(text, options = {}) {
    const { font = regular, size = 10, color, x = margin, maxChars = 92 } = options;

    for (const line of wrapText(text, maxChars)) {
      drawTextLine(line, { font, size, color, x });
    }
  }

  function drawSectionTitle(title) {
    y -= 6;
    drawTextLine(title, { font: bold, size: 13, color: rgb(0.08, 0.1, 0.09) });
    y -= 2;
  }

  function drawDivider() {
    ensureSpace(10);
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageSize[0] - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.87, 0.86)
    });
    y -= 12;
  }

  drawTextLine(labels.title, { font: bold, size: 22, color: rgb(0.08, 0.1, 0.09) });
  drawTextLine(`${variant === "full" ? labels.full : labels.operational} PDF`, {
    font: bold,
    size: 11,
    color: rgb(0.23, 0.36, 0.28)
  });
  y -= 6;
  drawTextLine(`${labels.organizer}: ${organizerName}`);
  drawTextLine(`${labels.event}: ${eventTitle}`);
  drawTextLine(`${labels.date}: ${occurrenceLabel}${occurrenceTime ? ` · ${occurrenceTime}` : ""}`);
  drawTextLine(`${labels.generated}: ${formatNow(locale)}`);
  drawDivider();

  drawSectionTitle(labels.summary);
  drawTextLine(`${labels.totalParticipants}: ${totalParticipants}`);
  drawTextLine(`${labels.withRestrictions}: ${participantsWithRestrictions}`);
  drawDivider();

  drawSectionTitle(labels.ticketBreakdown);
  for (const [label, count] of ticketCounts.entries()) {
    drawTextLine(`${label}: ${count}`);
  }
  drawDivider();

  drawSectionTitle(labels.participants);
  for (const registration of registrations) {
    ensureSpace(80);
    page.drawRectangle({
      x: margin,
      y: y - 10,
      width: pageSize[0] - margin * 2,
      height: 32,
      borderColor: rgb(0.86, 0.88, 0.87),
      borderWidth: 1
    });
    y += 10;
    drawTextLine(
      `${labels.registration}: ${registration.registrationCode} · ${registration.status}`,
      { font: bold, size: 11 }
    );
    drawTextLine(
      `${registration.eventTitle} · ${registration.occurrenceLabel}${registration.occurrenceTime ? ` · ${registration.occurrenceTime}` : ""}`,
      { size: 9, color: rgb(0.43, 0.45, 0.47) }
    );

    for (const attendee of registration.attendees || []) {
      ensureSpace(78);
      page.drawRectangle({
        x: margin + boxPadding,
        y: y - 8,
        width: pageSize[0] - margin * 2 - boxPadding * 2,
        height: variant === "full" ? 68 : 54,
        borderColor: rgb(0.9, 0.92, 0.91),
        borderWidth: 1
      });
      y += 8;

      drawTextLine(attendee.fullName || labels.participants, {
        x: margin + boxPadding * 2,
        font: bold,
        size: 10.5
      });
      drawTextLine(`${labels.ticket}: ${attendee.ticketLabel}`, {
        x: margin + boxPadding * 2,
        size: 9.5
      });
      drawTextLine(`${labels.email}: ${attendee.email || labels.none}`, {
        x: margin + boxPadding * 2,
        size: 9.5
      });
      drawTextLine(`${labels.phone}: ${attendee.phone || labels.none}`, {
        x: margin + boxPadding * 2,
        size: 9.5
      });

      if (variant === "full") {
        drawWrappedBlock(`${labels.address}: ${attendee.address || labels.none}`, {
          x: margin + boxPadding * 2,
          size: 9.5,
          maxChars: 78
        });
      }

      const restrictions = [
        ...(attendee.dietaryFlagLabels || []),
        attendee.dietaryOther || ""
      ]
        .filter(Boolean)
        .join(", ");

      drawWrappedBlock(`${labels.restrictions}: ${restrictions || labels.none}`, {
        x: margin + boxPadding * 2,
        size: 9.5,
        maxChars: 78
      });
      y -= 8;
    }

    drawDivider();
  }

  return document.save();
}
