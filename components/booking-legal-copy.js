import Link from "next/link";

export function BookingTermsLabel({ locale = "en" }) {
  if (locale === "it") {
    return (
      <span>
        Dichiaro di aver letto l&apos;
        <Link href="/privacy" rel="noreferrer" target="_blank">
          Informativa Privacy
        </Link>{" "}
        e accetto i{" "}
        <Link href="/terms" rel="noreferrer" target="_blank">
          Termini d&apos;Uso
        </Link>
        .
      </span>
    );
  }

  return (
    <span>
      I have read the{" "}
      <Link href="/privacy" rel="noreferrer" target="_blank">
        Privacy Notice
      </Link>{" "}
      and accept the{" "}
      <Link href="/terms" rel="noreferrer" target="_blank">
        Terms of Use
      </Link>
      .
    </span>
  );
}

export function BookingRefundPolicyLabel({ locale = "en" }) {
  if (locale === "it") {
    return (
      <span>
        Ho letto e accetto la policy di cancellazione e rimborso pubblicata
        dall&apos;organizer per questa prenotazione.
      </span>
    );
  }

  return (
    <span>
      I have read and accept the organizer&apos;s published refund and
      cancellation policy for this booking.
    </span>
  );
}

export function BookingResponsibilityLabel({ locale = "en" }) {
  if (locale === "it") {
    return (
      <span>
        Confermo il numero dei partecipanti, la correttezza della data selezionata e di aver
        verificato che l&apos;evento corrisponda alle esigenze del gruppo registrato.
      </span>
    );
  }

  return (
    <span>
      I confirm the participant count, the selected date, and that the event still matches the
      needs of the registered group.
    </span>
  );
}

export function BookingLegalRecap({ active = false, locale = "en" }) {
  const isItalian = locale === "it";
  const title = isItalian ? "Recap rapido" : "Quick recap";
  const items = isItalian
    ? [
        "Passreserve fornisce la piattaforma, ma l'evento, l'esecuzione e le policy restano in capo all'organizer.",
        "I pagamenti online e i dati della carta sono gestiti da Stripe e dall'account collegato dell'organizer, non dai server Passreserve.",
        "Prima di confermare controlla data, note venue, policy pubblicate e condizioni dell'organizer per il tuo gruppo."
      ]
    : [
        "Passreserve provides the platform, but the event, its delivery, and the policies remain the organizer's responsibility.",
        "Online payments and card data are handled by Stripe and by the organizer's connected account, not by Passreserve servers.",
        "Before confirming, review the date, venue notes, published policies, and organizer conditions for your group."
      ];

  return (
    <div
      aria-hidden={!active}
      className={`booking-legal-recap ${active ? "booking-legal-recap-active" : ""}`}
    >
      <div className="booking-legal-recap-inner">
        <span className="booking-legal-recap-title">{title}</span>
        <ul className="booking-legal-recap-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function BookingRefundPolicyDisclosure({
  policy = null,
  expanded = false,
  onToggle = null,
  locale = "en"
}) {
  if (!policy) {
    return null;
  }

  const isItalian = locale === "it";
  const toggleLabel = expanded
    ? isItalian
      ? "Nascondi dettagli"
      : "Hide details"
    : isItalian
      ? "Vedi dettagli"
      : "View details";
  const summaryTitle = isItalian ? "Policy organizer" : "Organizer policy";

  return (
    <div className="booking-refund-policy">
      <div className="booking-refund-policy-summary">
        <div className="booking-refund-policy-copy">
          <span className="booking-refund-policy-kicker">{summaryTitle}</span>
          <strong>{policy.label}</strong>
          <p>{policy.summary}</p>
        </div>
        <button
          aria-expanded={expanded}
          className="button button-secondary booking-refund-policy-toggle"
          onClick={onToggle}
          type="button"
        >
          {toggleLabel}
        </button>
      </div>

      <div
        aria-hidden={!expanded}
        className={`booking-refund-policy-details ${
          expanded ? "booking-refund-policy-details-active" : ""
        }`}
      >
        <div className="booking-refund-policy-details-inner">
          <p>{policy.detail}</p>
        </div>
      </div>
    </div>
  );
}
