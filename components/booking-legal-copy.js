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
        , le condizioni dell&apos;organizer, le note venue e le policy pubblicate per questa
        data.
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
      , the organizer conditions, venue notes, and the published policies for this date.
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
