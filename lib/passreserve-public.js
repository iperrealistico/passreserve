import { calculatePaymentBreakdown } from "./passreserve-domain";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

function formatCurrency(amount) {
  return currencyFormatter.format(amount);
}

function formatCollectionLabel(prepayPercentage) {
  if (prepayPercentage === 0) {
    return "0% online";
  }

  if (prepayPercentage === 100) {
    return "100% online";
  }

  return `${prepayPercentage}% online`;
}

function buildMailto(email, subject) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

function createOccurrence({
  id,
  startsAt,
  label,
  time,
  capacity,
  note
}) {
  return {
    id,
    startsAt,
    label,
    time,
    capacity,
    note
  };
}

function buildPhoto(title, caption, background) {
  return {
    title,
    caption,
    background
  };
}

const organizerCatalog = [
  {
    slug: "alpine-trail-lab",
    name: "Alpine Trail Lab",
    city: "Bolzano",
    region: "Dolomites",
    tagline:
      "Small-group mountain experiences designed around first-light routes, calm arrival logistics, and clear payment framing.",
    description:
      "Alpine Trail Lab hosts guided mountain formats where the organizer page needs to feel like a destination: attendees should understand the venue, the next available dates, and how the online deposit relates to the balance collected at the trail lounge.",
    themeTags: ["guided mornings", "skills", "alpine venue"],
    venue: {
      title: "Piazza Walther trail lounge",
      detail:
        "Meet in central Bolzano for coffee, bike check, and the short shuttle toward the morning trailhead. The organizer uses this venue block to explain parking, rail arrival, and where on-site payments are finished.",
      mapLabel: "Open Bolzano trail lounge map",
      mapHref: "https://maps.google.com/?q=Piazza+Walther+Bolzano"
    },
    contact: {
      email: "hello@alpinetraillab.passreserve.com",
      phone: "+39 0471 140 220"
    },
    photoStory: [
      buildPhoto(
        "First-light briefing",
        "Use the organizer page to show the pace, scale, and atmosphere before the attendee opens the event detail page.",
        "linear-gradient(135deg, rgba(17, 50, 39, 0.98), rgba(59, 112, 86, 0.85))"
      ),
      buildPhoto(
        "Ridge approach",
        "A photo-support section makes room for route personality without turning the page into a generic marketplace grid.",
        "linear-gradient(135deg, rgba(31, 68, 96, 0.96), rgba(139, 179, 197, 0.82))"
      ),
      buildPhoto(
        "Coffee reset",
        "Organizer pages can reassure attendees about where they regroup, pay any remaining balance, and ask last-minute questions.",
        "linear-gradient(135deg, rgba(148, 86, 44, 0.94), rgba(234, 191, 134, 0.82))"
      )
    ],
    policies: [
      "Deposits convert into the final event balance and remain tied to the specific occurrence.",
      "Weather calls are communicated by email before 20:00 the prior evening when a sunrise route must shift.",
      "Attendees can move once to a later published date while capacity is still open."
    ],
    faq: [
      {
        question: "Is equipment hire included?",
        answer:
          "No. Alpine Trail Lab uses Passreserve.com for event registration and deposits, so the public page stays focused on the guided experience rather than rental inventory."
      },
      {
        question: "When do attendees pay the remainder?",
        answer:
          "Any amount not collected online is settled at the trail lounge before the shuttle departs."
      }
    ],
    events: [
      {
        slug: "sunrise-ridge-session",
        title: "Sunrise Ridge Session",
        category: "Guided morning",
        summary:
          "A first-light alpine skills morning with route coaching, coffee service, and a clear 30% online deposit.",
        description:
          "This event page explains exactly what the attendee is reserving: an early guided mountain session with briefing, ridge coaching, and a structured handoff into the venue coffee reset once the route closes.",
        audience:
          "Best for attendees searching sunrise, alpine, skills clinic, or guided mountain sessions.",
        duration: "4h 15m",
        venueDetail:
          "Starts at the Bolzano lounge before a short transfer to the ridge trailhead.",
        basePrice: 65,
        prepayPercentage: 30,
        highlights: [
          "Trail briefing and route pacing",
          "Coach-led skill adjustments on exposed switchbacks",
          "Coffee and recovery notes at the lounge"
        ],
        included: [
          "Guide support from briefing to finish",
          "Venue coffee and post-route notes",
          "Digital follow-up with trail recommendations"
        ],
        gallery: [
          buildPhoto(
            "Warm-up lane",
            "The event page can hold the opening visual cues that explain pace and altitude.",
            "linear-gradient(135deg, rgba(82, 53, 28, 0.94), rgba(223, 177, 120, 0.8))"
          ),
          buildPhoto(
            "Ridgeline view",
            "Featured event presentation needs enough visual space to feel more editorial than transactional.",
            "linear-gradient(135deg, rgba(28, 58, 92, 0.94), rgba(133, 177, 205, 0.8))"
          )
        ],
        policies: [
          "The online amount secures the date and counts toward the total event price.",
          "Attendees should arrive 20 minutes early for the venue briefing.",
          "Final capacity decisions remain occurrence-specific, not organizer-wide."
        ],
        faq: [
          {
            question: "Is this suitable for intermediate riders?",
            answer:
              "Yes. The event is paced for confident intermediate attendees who want coaching and route support rather than a race effort."
          },
          {
            question: "What happens if the weather changes the route?",
            answer:
              "The occurrence stays the source of truth. Alpine Trail Lab updates the date card and sends a clear briefing if the route plan changes."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "atl-sunrise-2026-04-18",
            startsAt: "2026-04-18T06:15:00+02:00",
            label: "18 Apr 2026",
            time: "06:15 to 10:30",
            capacity: "7 spots left",
            note: "Coffee reset and route notes included."
          }),
          createOccurrence({
            id: "atl-sunrise-2026-05-02",
            startsAt: "2026-05-02T06:10:00+02:00",
            label: "02 May 2026",
            time: "06:10 to 10:20",
            capacity: "11 spots open",
            note: "Slightly longer ridge loop with shuttle return."
          }),
          createOccurrence({
            id: "atl-sunrise-2026-05-16",
            startsAt: "2026-05-16T06:05:00+02:00",
            label: "16 May 2026",
            time: "06:05 to 10:15",
            capacity: "5 spots left",
            note: "Limited-capacity spring edition."
          })
        ]
      },
      {
        slug: "alpine-switchback-clinic",
        title: "Alpine Switchback Clinic",
        category: "Skills clinic",
        summary:
          "A tighter mid-morning clinic focused on braking, body position, and exposed corner confidence.",
        description:
          "The second event card shows how an organizer hub can list more than one event type while keeping each format distinct in tone, duration, and payment expectations.",
        audience:
          "Useful for skills-focused attendees who want a shorter clinic rather than a full guided morning.",
        duration: "3h 30m",
        venueDetail:
          "Runs from the same Bolzano base with a later start and a smaller coaching group.",
        basePrice: 89,
        prepayPercentage: 50,
        highlights: [
          "Braking and line-choice coaching",
          "Small-group corner repetition",
          "Half-online payment to lock scarce seats"
        ],
        included: [
          "Coach feedback on each drill block",
          "Venue debrief with movement notes",
          "Post-event terrain recommendations"
        ],
        gallery: [
          buildPhoto(
            "Corner practice",
            "A second visual story keeps the organizer page from collapsing into one repeated hero image.",
            "linear-gradient(135deg, rgba(31, 41, 72, 0.96), rgba(105, 128, 193, 0.8))"
          ),
          buildPhoto(
            "Venue debrief",
            "The event detail page can hold calmer operational visuals alongside the action cues.",
            "linear-gradient(135deg, rgba(55, 71, 48, 0.96), rgba(149, 184, 117, 0.8))"
          )
        ],
        policies: [
          "Half the event amount is collected online because each occurrence runs with limited seats.",
          "Late arrivals can join only if the venue briefing is still in progress.",
          "Attendees should confirm skill level honestly before arrival."
        ],
        faq: [
          {
            question: "Does this include the sunrise route?",
            answer:
              "No. This clinic is a separate event type with a later start, smaller group, and more focused drill blocks."
          },
          {
            question: "Can I move from the clinic into the sunrise session?",
            answer:
              "Only when both occurrences still have capacity. Passreserve.com treats each event occurrence separately."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "atl-clinic-2026-04-26",
            startsAt: "2026-04-26T10:30:00+02:00",
            label: "26 Apr 2026",
            time: "10:30 to 14:00",
            capacity: "9 seats open",
            note: "Warm-weather drill focus."
          }),
          createOccurrence({
            id: "atl-clinic-2026-05-10",
            startsAt: "2026-05-10T10:15:00+02:00",
            label: "10 May 2026",
            time: "10:15 to 13:45",
            capacity: "4 seats left",
            note: "High-demand date before the holiday weekend."
          }),
          createOccurrence({
            id: "atl-clinic-2026-05-31",
            startsAt: "2026-05-31T10:45:00+02:00",
            label: "31 May 2026",
            time: "10:45 to 14:15",
            capacity: "12 seats open",
            note: "Expanded late-spring clinic."
          })
        ]
      }
    ]
  },
  {
    slug: "lago-studio-pass",
    name: "Lago Studio Pass",
    city: "Como",
    region: "Lake Como",
    tagline:
      "Weekend formats that mix movement, shoreline pacing, and hospitality details in one organizer-first public surface.",
    description:
      "Lago Studio Pass needs a public hub that can present overnight logistics, weekend structure, and a payment split that feels calm instead of transactional. The organizer page leads with place, timing, and what is already included.",
    themeTags: ["weekender", "wellness", "lake venue"],
    venue: {
      title: "Villa darsena dock house",
      detail:
        "The venue panel explains where attendees arrive, where they store bags, and how weekend participants check in before the first shoreline block.",
      mapLabel: "Open Lake Como dock house map",
      mapHref: "https://maps.google.com/?q=Lake+Como+dock+house"
    },
    contact: {
      email: "hello@lagostudiopass.passreserve.com",
      phone: "+39 031 340 510"
    },
    photoStory: [
      buildPhoto(
        "Dock arrival",
        "Organizer pages can foreground hospitality cues before the attendee sees the full event schedule.",
        "linear-gradient(135deg, rgba(24, 59, 81, 0.96), rgba(121, 188, 214, 0.82))"
      ),
      buildPhoto(
        "Waterline movement",
        "The public route should feel like a place-led event hub rather than a plain reservation form.",
        "linear-gradient(135deg, rgba(38, 90, 88, 0.94), rgba(116, 204, 183, 0.8))"
      ),
      buildPhoto(
        "Evening table",
        "Photo-support sections make it easier to explain why a weekend pass carries a larger deposit.",
        "linear-gradient(135deg, rgba(117, 63, 48, 0.94), rgba(234, 170, 144, 0.8))"
      )
    ],
    policies: [
      "Weekend deposits are applied to the final pass total and protect limited dock-house capacity.",
      "Accommodation guidance is sent after confirmation because room blocks vary by occurrence.",
      "Attendees can transfer their pass once if the new participant is approved before the final week."
    ],
    faq: [
      {
        question: "Is accommodation included in the listed price?",
        answer:
          "The event page makes inclusions explicit for each event type. Some passes include shared accommodation and some only reserve the program itself."
      },
      {
        question: "When is the remainder due?",
        answer:
          "Any remaining balance is collected at the venue check-in unless the event is marked as fully prepaid online."
      }
    ],
    events: [
      {
        slug: "lakeside-flow-weekender",
        title: "Lakeside Flow Weekender",
        category: "Weekend pass",
        summary:
          "A two-day shoreline movement and paddle format with a 50% online deposit and a clear venue-first agenda.",
        description:
          "The event detail page needs to do more than list a date. It has to explain the rhythm of the weekend, what the attendee should bring, and why half the price is collected online to secure limited residential capacity.",
        audience:
          "Strong fit for attendees searching weekender, lake movement, wellness, or paddle retreat.",
        duration: "2 days",
        venueDetail:
          "Starts and ends at the Villa darsena dock house with shoreline transitions between movement blocks.",
        basePrice: 120,
        prepayPercentage: 50,
        highlights: [
          "Shoreline movement sessions and paddle windows",
          "Dock-house meals and check-in support",
          "Clear split between online deposit and arrival balance"
        ],
        included: [
          "Full guided program across both days",
          "Venue meals listed in the attendee brief",
          "Paddle equipment during the water blocks"
        ],
        gallery: [
          buildPhoto(
            "Morning waterline",
            "Use a featured event gallery to explain the atmosphere before the attendee reads the long description.",
            "linear-gradient(135deg, rgba(17, 61, 74, 0.96), rgba(79, 165, 196, 0.82))"
          ),
          buildPhoto(
            "Dock house dinner",
            "Hospitality visuals make the price and deposit feel anchored to a real experience.",
            "linear-gradient(135deg, rgba(96, 53, 41, 0.96), rgba(226, 172, 146, 0.8))"
          )
        ],
        policies: [
          "The 50% online amount secures program space and residential planning.",
          "The organizer confirms accommodation timing after the attendee is registered.",
          "Each occurrence manages its own capacity, even when the event type remains the same."
        ],
        faq: [
          {
            question: "Can I attend one day only?",
            answer:
              "No. This event type is sold as a full weekend pass, which is why the event page explains the two-day agenda in detail."
          },
          {
            question: "Do I need paddle experience?",
            answer:
              "No advanced experience is required. The attendee brief explains how the water blocks are paced."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "lsp-weekender-2026-04-25",
            startsAt: "2026-04-25T09:30:00+02:00",
            label: "25 Apr 2026",
            time: "09:30 Sat to 17:00 Sun",
            capacity: "12 places open",
            note: "Spring launch weekend with dock-house dinner."
          }),
          createOccurrence({
            id: "lsp-weekender-2026-05-23",
            startsAt: "2026-05-23T09:15:00+02:00",
            label: "23 May 2026",
            time: "09:15 Sat to 17:00 Sun",
            capacity: "8 places left",
            note: "Warm-season edition with longer shoreline block."
          }),
          createOccurrence({
            id: "lsp-weekender-2026-06-20",
            startsAt: "2026-06-20T09:30:00+02:00",
            label: "20 Jun 2026",
            time: "09:30 Sat to 17:15 Sun",
            capacity: "15 places open",
            note: "Expanded summer capacity."
          })
        ]
      },
      {
        slug: "villa-dawn-paddle",
        title: "Villa Dawn Paddle",
        category: "Morning session",
        summary:
          "A shorter single-day paddle and movement session with a lighter deposit and a strong place-led presentation.",
        description:
          "This secondary event type shows how the organizer page can list both multi-day and single-day experiences without flattening them into one generic catalog card.",
        audience:
          "Best for attendees searching dawn, paddle, lake, and shorter recovery-focused sessions.",
        duration: "3h 45m",
        venueDetail:
          "Runs entirely from the dock house with no overnight component.",
        basePrice: 72,
        prepayPercentage: 30,
        highlights: [
          "Single-day shoreline program",
          "Lower online amount than the weekender",
          "Arrival flow optimized for local attendees"
        ],
        included: [
          "Dock access and paddle equipment",
          "Guided mobility and breathwork sequence",
          "Post-session tea service"
        ],
        gallery: [
          buildPhoto(
            "Early dock launch",
            "Short-format events still need their own presentation page and visual identity.",
            "linear-gradient(135deg, rgba(16, 70, 82, 0.96), rgba(119, 191, 214, 0.82))"
          ),
          buildPhoto(
            "Tea reset",
            "Smaller events benefit from photo support that clarifies pace and setting.",
            "linear-gradient(135deg, rgba(69, 85, 45, 0.96), rgba(174, 203, 119, 0.8))"
          )
        ],
        policies: [
          "The online amount secures the limited dock launch window.",
          "Attendees may move to a later date while published capacity remains open.",
          "Venue timing is strict because the session ends before lunchtime turnover."
        ],
        faq: [
          {
            question: "Is this event easier than the weekender?",
            answer:
              "Yes. The pace is calmer and shorter, and the event page makes that distinction explicit."
          },
          {
            question: "Can I bring a guest later?",
            answer:
              "Only if a published occurrence still has capacity and the organizer approves the change before the final briefing email."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "lsp-dawn-2026-05-09",
            startsAt: "2026-05-09T07:10:00+02:00",
            label: "09 May 2026",
            time: "07:10 to 10:55",
            capacity: "10 places left",
            note: "Local-attendee format with tea service."
          }),
          createOccurrence({
            id: "lsp-dawn-2026-06-06",
            startsAt: "2026-06-06T07:00:00+02:00",
            label: "06 Jun 2026",
            time: "07:00 to 10:45",
            capacity: "6 places left",
            note: "Early-summer date with warmer water block."
          }),
          createOccurrence({
            id: "lsp-dawn-2026-06-27",
            startsAt: "2026-06-27T07:05:00+02:00",
            label: "27 Jun 2026",
            time: "07:05 to 10:50",
            capacity: "14 places open",
            note: "Expanded late-June capacity."
          })
        ]
      }
    ]
  },
  {
    slug: "officina-gravel-house",
    name: "Officina Gravel House",
    city: "Bologna",
    region: "Emilia-Romagna",
    tagline:
      "Community-heavy gravel formats where the organizer hub should feel warm, practical, and low-friction from the first click.",
    description:
      "Officina Gravel House leans on 0% online collection for some events, so the public pages need to explain trust, check-in, and route clarity rather than pushing every attendee straight into payment.",
    themeTags: ["community", "gravel", "city launch"],
    venue: {
      title: "Portico workshop courtyard",
      detail:
        "This venue block tells attendees where to arrive, where the courtyard social starts, and how pay-later check-in works when no online amount is required.",
      mapLabel: "Open Bologna courtyard map",
      mapHref: "https://maps.google.com/?q=Bologna+Portico+courtyard"
    },
    contact: {
      email: "hello@officinagravelhouse.passreserve.com",
      phone: "+39 051 810 440"
    },
    photoStory: [
      buildPhoto(
        "Courtyard coffee",
        "The organizer page can lead with culture and host credibility before the attendee chooses a date.",
        "linear-gradient(135deg, rgba(74, 41, 28, 0.96), rgba(205, 135, 102, 0.82))"
      ),
      buildPhoto(
        "City edge rollout",
        "Program visuals help frame the event as an organized social format, not a product listing.",
        "linear-gradient(135deg, rgba(25, 63, 52, 0.96), rgba(102, 170, 145, 0.82))"
      ),
      buildPhoto(
        "Post-ride table",
        "Organizer hubs can use imagery to explain why some events are community-pay-later rather than deposit-led.",
        "linear-gradient(135deg, rgba(51, 50, 89, 0.96), rgba(141, 140, 205, 0.82))"
      )
    ],
    policies: [
      "Community formats with 0% online collection still use the occurrence list as the public source of truth.",
      "No-show rules are stated clearly on the event page because organizers rely on check-in planning.",
      "Attendees should update quantity changes before the final route brief."
    ],
    faq: [
      {
        question: "Why is no payment taken online for some dates?",
        answer:
          "Because these events are community-led and the organizer prefers to collect at check-in. Passreserve.com still shows the total and event-day expectations clearly."
      },
      {
        question: "Are routes fixed in advance?",
        answer:
          "The event page explains the route style, while each occurrence card carries any date-specific adjustments."
      }
    ],
    events: [
      {
        slug: "gravel-social-camp",
        title: "Gravel Social Camp",
        category: "Community weekender",
        summary:
          "A two-day social camp with route groups, coffee stops, and 0% online collection to keep registration friction low.",
        description:
          "The event detail route clarifies that this is still a structured registration flow even though payment is handled at check-in. Attendees need the page to explain group pacing, arrival windows, and the social format in a clear operational way.",
        audience:
          "Strong fit for attendees searching gravel, community weekend, coffee stop, or beginner-friendly social rides.",
        duration: "2 days",
        venueDetail:
          "Starts in the Bologna courtyard and fans into regional route groups.",
        basePrice: 95,
        prepayPercentage: 0,
        highlights: [
          "Low-friction 0% online collection",
          "Route groups matched to pace",
          "Community supper and workshop courtyard finish"
        ],
        included: [
          "Route support and on-course notes",
          "Courtyard social and evening meal",
          "Printed ride sheet at check-in"
        ],
        gallery: [
          buildPhoto(
            "Crew rollout",
            "Event detail pages should make community-heavy formats feel curated, not generic.",
            "linear-gradient(135deg, rgba(31, 84, 67, 0.96), rgba(133, 201, 168, 0.82))"
          ),
          buildPhoto(
            "Courtyard supper",
            "Photo support helps explain what the total event price actually includes when nothing is charged online.",
            "linear-gradient(135deg, rgba(95, 59, 38, 0.96), rgba(224, 174, 129, 0.82))"
          )
        ],
        policies: [
          "No online amount is collected for this event type.",
          "Attendees still confirm attendance against a dated occurrence and should avoid no-shows.",
          "The organizer may rebalance route groups the night before based on final counts."
        ],
        faq: [
          {
            question: "Do I need to pay cash only?",
            answer:
              "No. The organizer collects the full amount at check-in and explains accepted payment methods in the attendee brief."
          },
          {
            question: "Can I join for one day only?",
            answer:
              "This event type is presented as a full camp. Shorter one-day options live on separate event cards."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "ogh-camp-2026-05-09",
            startsAt: "2026-05-09T08:00:00+02:00",
            label: "09 May 2026",
            time: "08:00 Sat to 18:00 Sun",
            capacity: "20 passes available",
            note: "Community launch weekend."
          }),
          createOccurrence({
            id: "ogh-camp-2026-06-13",
            startsAt: "2026-06-13T08:15:00+02:00",
            label: "13 Jun 2026",
            time: "08:15 Sat to 18:00 Sun",
            capacity: "13 passes left",
            note: "Longer summer route edition."
          }),
          createOccurrence({
            id: "ogh-camp-2026-09-05",
            startsAt: "2026-09-05T08:30:00+02:00",
            label: "05 Sep 2026",
            time: "08:30 Sat to 18:00 Sun",
            capacity: "24 passes open",
            note: "Late-season social camp."
          })
        ]
      },
      {
        slug: "via-colli-evening-spin",
        title: "Via Colli Evening Spin",
        category: "After-work social",
        summary:
          "A shorter city-edge spin that keeps the same host tone but uses a smaller ticket and a lighter operational footprint.",
        description:
          "Short-format events deserve dedicated detail pages too. This route explains timing, surface mix, and social expectations without borrowing rental-language patterns from the legacy app.",
        audience:
          "Useful for attendees searching evening spin, social ride, and quick city-edge events.",
        duration: "2h 20m",
        venueDetail:
          "Starts and ends in the same courtyard with no overnight component.",
        basePrice: 38,
        prepayPercentage: 0,
        highlights: [
          "Short after-work event card",
          "Pay-later check-in at the courtyard",
          "Clear city-edge route framing"
        ],
        included: [
          "Host briefing and group lead support",
          "Post-ride aperitivo",
          "Surface notes in the confirmation brief"
        ],
        gallery: [
          buildPhoto(
            "City edge turn",
            "A second event page lets the organizer keep short formats visually distinct.",
            "linear-gradient(135deg, rgba(43, 66, 103, 0.96), rgba(132, 162, 214, 0.82))"
          ),
          buildPhoto(
            "Aperitivo finish",
            "Shorter sessions still need place, timing, and social cues to feel complete.",
            "linear-gradient(135deg, rgba(104, 58, 40, 0.96), rgba(223, 163, 118, 0.82))"
          )
        ],
        policies: [
          "No online payment is collected for this event type.",
          "Attendees should arrive ready to roll because the event start is brief and operationally tight.",
          "The organizer reserves the right to shift route length based on light and weather."
        ],
        faq: [
          {
            question: "Is this beginner-friendly?",
            answer:
              "Yes. The event page explains the surface mix and social pace so attendees can self-select confidently."
          },
          {
            question: "Can I bring a friend at the last minute?",
            answer:
              "Only when the selected occurrence still has space and the organizer updates the attendee count in advance."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "ogh-evening-2026-05-21",
            startsAt: "2026-05-21T18:30:00+02:00",
            label: "21 May 2026",
            time: "18:30 to 20:50",
            capacity: "16 spots left",
            note: "Spring after-work launch."
          }),
          createOccurrence({
            id: "ogh-evening-2026-06-11",
            startsAt: "2026-06-11T18:45:00+02:00",
            label: "11 Jun 2026",
            time: "18:45 to 21:05",
            capacity: "12 spots left",
            note: "Long-light summer edition."
          }),
          createOccurrence({
            id: "ogh-evening-2026-07-02",
            startsAt: "2026-07-02T19:00:00+02:00",
            label: "02 Jul 2026",
            time: "19:00 to 21:20",
            capacity: "19 spots open",
            note: "High-season city-edge social."
          })
        ]
      }
    ]
  },
  {
    slug: "atelier-del-gusto",
    name: "Atelier del Gusto",
    city: "Parma",
    region: "Food Valley",
    tagline:
      "Cooking and tasting formats that need full event pages, venue clarity, and strong payment signaling when seats are scarce.",
    description:
      "Atelier del Gusto shows why event detail pages matter: the organizer needs room for menu details, inclusions, dietary notes, and clear 100% or partial online collection rules tied to each occurrence.",
    themeTags: ["food workshop", "date night", "limited seats"],
    venue: {
      title: "Fire kitchen studio",
      detail:
        "The venue panel explains where attendees check in, when aprons are issued, and how ingredient-sensitive notes are handled before the kitchen opens.",
      mapLabel: "Open Parma fire kitchen map",
      mapHref: "https://maps.google.com/?q=Parma+fire+kitchen+studio"
    },
    contact: {
      email: "hello@atelierdelgusto.passreserve.com",
      phone: "+39 0521 440 280"
    },
    photoStory: [
      buildPhoto(
        "Prep table",
        "The organizer page needs visual cues that explain scarcity and hospitality in one frame.",
        "linear-gradient(135deg, rgba(105, 53, 31, 0.96), rgba(236, 170, 113, 0.82))"
      ),
      buildPhoto(
        "Open fire station",
        "Featured event presentation should feel crafted enough to justify full prepayment when required.",
        "linear-gradient(135deg, rgba(89, 31, 22, 0.96), rgba(214, 112, 90, 0.82))"
      ),
      buildPhoto(
        "Shared table",
        "Photo-support sections help the public page communicate atmosphere, not just logistics.",
        "linear-gradient(135deg, rgba(46, 64, 41, 0.96), rgba(149, 196, 125, 0.82))"
      )
    ],
    policies: [
      "Seat-limited dinner workshops may require 100% online payment before arrival.",
      "Dietary notes are collected after confirmation and tied to the selected occurrence.",
      "Organizer cancellation notices must name the event, occurrence, and any refund state clearly."
    ],
    faq: [
      {
        question: "Why are some dates fully prepaid online?",
        answer:
          "Because ingredient purchasing and scarce kitchen seating make those occurrences expensive to hold without payment."
      },
      {
        question: "Can I transfer my place?",
        answer:
          "Yes, if the organizer approves the transfer before the final kitchen brief and the new attendee details are submitted."
      }
    ],
    events: [
      {
        slug: "fire-and-pasta-night",
        title: "Fire and Pasta Night",
        category: "Dinner workshop",
        summary:
          "An intimate evening cooking format with a 100% online payment rule and a strong emphasis on what is included.",
        description:
          "This event page needs to do the full storytelling job: menu arc, seat count, arrival sequence, and why full online collection secures both ingredients and limited studio capacity.",
        audience:
          "Designed for food, workshop, pasta, Parma, and date-night discovery terms.",
        duration: "3h 15m",
        venueDetail:
          "Runs entirely inside the fire kitchen studio with a seated shared table finish.",
        basePrice: 78,
        prepayPercentage: 100,
        highlights: [
          "Full online payment to secure scarce seats",
          "Hands-on kitchen sequence and shared table dinner",
          "Venue instructions and inclusion list on the event page"
        ],
        included: [
          "Ingredient set and apron use",
          "Shared table dinner and tasting pours",
          "Recipe recap after the event"
        ],
        gallery: [
          buildPhoto(
            "Open fire prep",
            "The event page needs enough visual identity to justify a higher-friction checkout stance.",
            "linear-gradient(135deg, rgba(86, 31, 21, 0.96), rgba(225, 111, 82, 0.82))"
          ),
          buildPhoto(
            "Shared table finale",
            "This gallery helps attendees understand that the seat includes both workshop and dinner.",
            "linear-gradient(135deg, rgba(74, 59, 26, 0.96), rgba(209, 177, 102, 0.82))"
          )
        ],
        policies: [
          "This event type is fully prepaid online.",
          "Dietary notes must be submitted before the final kitchen prep window.",
          "Refunds and transfers depend on the timing stated in the selected occurrence brief."
        ],
        faq: [
          {
            question: "Is wine included?",
            answer:
              "The event page describes included pours clearly so attendees understand what the full ticket covers."
          },
          {
            question: "Can I attend solo?",
            answer:
              "Yes. The shared table format is designed for solo attendees as well as pairs."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "adg-fire-2026-05-14",
            startsAt: "2026-05-14T19:00:00+02:00",
            label: "14 May 2026",
            time: "19:00 to 22:15",
            capacity: "4 seats left",
            note: "High-demand spring dinner workshop."
          }),
          createOccurrence({
            id: "adg-fire-2026-06-04",
            startsAt: "2026-06-04T19:00:00+02:00",
            label: "04 Jun 2026",
            time: "19:00 to 22:15",
            capacity: "7 seats open",
            note: "Early-summer menu variation."
          }),
          createOccurrence({
            id: "adg-fire-2026-06-25",
            startsAt: "2026-06-25T19:15:00+02:00",
            label: "25 Jun 2026",
            time: "19:15 to 22:30",
            capacity: "3 seats left",
            note: "Small-capacity solstice edition."
          })
        ]
      },
      {
        slug: "parmigiano-workshop-table",
        title: "Parmigiano Workshop Table",
        category: "Hands-on tasting",
        summary:
          "A smaller-format tasting workshop with a 50% online deposit and a more educational flow than the dinner event.",
        description:
          "The second event route lets Atelier del Gusto separate its educational tasting format from the fully prepaid date-night workshop, while keeping venue and policy details equally explicit.",
        audience:
          "Useful for attendees searching tasting, cheese workshop, and shorter Parma formats.",
        duration: "2h 30m",
        venueDetail:
          "Hosted at the same studio but with a classroom table layout.",
        basePrice: 62,
        prepayPercentage: 50,
        highlights: [
          "Educational tasting format",
          "Half-online payment before arrival",
          "Different pace and capacity from the dinner workshop"
        ],
        included: [
          "Guided tasting sequence",
          "Notebook and pairing sheet",
          "Small table service at the finish"
        ],
        gallery: [
          buildPhoto(
            "Tasting table",
            "Dedicated event pages help organizers explain what is included without burying the detail.",
            "linear-gradient(135deg, rgba(110, 83, 35, 0.96), rgba(223, 197, 117, 0.82))"
          ),
          buildPhoto(
            "Pairing notes",
            "A second visual mode stops the organizer hub from feeling like one repeated template.",
            "linear-gradient(135deg, rgba(56, 71, 46, 0.96), rgba(159, 194, 126, 0.82))"
          )
        ],
        policies: [
          "Half the ticket price is collected online to protect small-format seating.",
          "Dietary constraints should be submitted after confirmation.",
          "The organizer may substitute pairings while keeping the workshop structure intact."
        ],
        faq: [
          {
            question: "Is dinner included?",
            answer:
              "No. This event type is a tasting workshop, not the shared-table dinner format."
          },
          {
            question: "Can I attend if I have dietary restrictions?",
            answer:
              "Yes, as long as you send the note in time for the occurrence-specific prep window."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "adg-parmigiano-2026-05-22",
            startsAt: "2026-05-22T18:30:00+02:00",
            label: "22 May 2026",
            time: "18:30 to 21:00",
            capacity: "10 seats open",
            note: "Spring tasting table."
          }),
          createOccurrence({
            id: "adg-parmigiano-2026-06-12",
            startsAt: "2026-06-12T18:45:00+02:00",
            label: "12 Jun 2026",
            time: "18:45 to 21:15",
            capacity: "8 seats left",
            note: "Extended pairing notes session."
          }),
          createOccurrence({
            id: "adg-parmigiano-2026-07-03",
            startsAt: "2026-07-03T18:30:00+02:00",
            label: "03 Jul 2026",
            time: "18:30 to 21:00",
            capacity: "12 seats open",
            note: "Summer tasting edition."
          })
        ]
      }
    ]
  },
  {
    slug: "comune-aperto",
    name: "Comune Aperto",
    city: "Verona",
    region: "Veneto",
    tagline:
      "Public and family-first events that need clear accessibility notes, quantity-based wording, and a gentle organizer presence.",
    description:
      "Comune Aperto shows how Passreserve.com can support civic or community events without sounding like a rental shop. The public pages lead with accessibility, venue guidance, and event-day expectations rather than equipment language.",
    themeTags: ["family", "community", "civic"],
    venue: {
      title: "Riverside welcome point",
      detail:
        "The venue block names where families gather, where prams can be left, and how on-site staff handle check-in when events are pay-later.",
      mapLabel: "Open Verona riverside welcome map",
      mapHref: "https://maps.google.com/?q=Verona+riverside+welcome+point"
    },
    contact: {
      email: "hello@comuneaperto.passreserve.com",
      phone: "+39 045 120 770"
    },
    photoStory: [
      buildPhoto(
        "Lantern queue",
        "Community organizers still need photo support to explain atmosphere and family scale.",
        "linear-gradient(135deg, rgba(86, 55, 26, 0.96), rgba(223, 183, 116, 0.82))"
      ),
      buildPhoto(
        "Riverside path",
        "Organizer hubs can reassure attendees about space, pace, and accessibility before registration opens.",
        "linear-gradient(135deg, rgba(28, 62, 67, 0.96), rgba(120, 193, 190, 0.82))"
      ),
      buildPhoto(
        "Closing circle",
        "Visuals help community events feel hosted and intentional, not improvised.",
        "linear-gradient(135deg, rgba(60, 54, 96, 0.96), rgba(150, 144, 212, 0.82))"
      )
    ],
    policies: [
      "Family events may use 0% online collection while still issuing dated registrations.",
      "Accessibility and venue notes belong on both organizer and event pages.",
      "Capacity counts apply to each occurrence because community turnout can change sharply by date."
    ],
    faq: [
      {
        question: "Do children need their own registration?",
        answer:
          "The event page explains the quantity model clearly so families understand what one pass covers."
      },
      {
        question: "Are these events fully outdoors?",
        answer:
          "Each event route states whether the format is fully outdoors or uses an indoor fallback point."
      }
    ],
    events: [
      {
        slug: "family-lantern-walk",
        title: "Family Lantern Walk",
        category: "Community evening",
        summary:
          "A gentle city walk with family passes, clear accessibility notes, and 0% online collection.",
        description:
          "This event detail page proves that Passreserve.com can present low-friction civic formats with the same clarity as premium paid events: route, timing, accessibility, and what the family pass includes are all explicit.",
        audience:
          "Built for family, lantern, kids, city walk, and community-event searches.",
        duration: "1h 45m",
        venueDetail:
          "Begins at the riverside welcome point and closes with a short story circle.",
        basePrice: 18,
        prepayPercentage: 0,
        highlights: [
          "Family-pass framing instead of individual ticket jargon",
          "Accessibility notes and venue support",
          "0% online collection with clear event-day expectations"
        ],
        included: [
          "One lantern set per family registration",
          "Staffed welcome point and route support",
          "Closing story circle"
        ],
        gallery: [
          buildPhoto(
            "Lantern start",
            "Event pages can keep civic formats warm and editorial instead of plain and administrative.",
            "linear-gradient(135deg, rgba(107, 68, 27, 0.96), rgba(234, 183, 94, 0.82))"
          ),
          buildPhoto(
            "Family route",
            "Accessibility and atmosphere belong alongside date and quantity information.",
            "linear-gradient(135deg, rgba(28, 69, 70, 0.96), rgba(120, 194, 196, 0.82))"
          )
        ],
        policies: [
          "No online amount is collected for this event type.",
          "Families should arrive 15 minutes early to receive lantern materials.",
          "The organizer may shorten the route in severe weather while preserving the same occurrence."
        ],
        faq: [
          {
            question: "Is this suitable for small children?",
            answer:
              "Yes. The route is slow, supervised, and designed for family groups with clear accessibility notes."
          },
          {
            question: "What does one family pass cover?",
            answer:
              "The event page explains the quantity model and how many household members fit within one pass."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "ca-lantern-2026-05-30",
            startsAt: "2026-05-30T18:45:00+02:00",
            label: "30 May 2026",
            time: "18:45 to 20:30",
            capacity: "45 family passes",
            note: "Spring community launch."
          }),
          createOccurrence({
            id: "ca-lantern-2026-06-27",
            startsAt: "2026-06-27T19:00:00+02:00",
            label: "27 Jun 2026",
            time: "19:00 to 20:45",
            capacity: "38 family passes",
            note: "Long-light summer edition."
          }),
          createOccurrence({
            id: "ca-lantern-2026-09-12",
            startsAt: "2026-09-12T18:30:00+02:00",
            label: "12 Sep 2026",
            time: "18:30 to 20:15",
            capacity: "52 family passes",
            note: "Back-to-school community date."
          })
        ]
      },
      {
        slug: "courtyard-story-festival",
        title: "Courtyard Story Festival",
        category: "Family afternoon",
        summary:
          "A seated courtyard storytelling format with a modest ticket price and quantity-driven family passes.",
        description:
          "A second event type gives the organizer page a true event list, while the detail route explains audience fit, indoor fallback planning, and what each registration covers.",
        audience:
          "Useful for families searching story, courtyard, afternoon event, and kid-friendly cultural formats.",
        duration: "2h",
        venueDetail:
          "Held in a shaded courtyard with an indoor fallback room if needed.",
        basePrice: 24,
        prepayPercentage: 0,
        highlights: [
          "Family-pass quantity model",
          "Indoor fallback clearly explained",
          "Community-hosted format with light operational overhead"
        ],
        included: [
          "Story circle programming",
          "Courtyard seating area",
          "Closing snack table"
        ],
        gallery: [
          buildPhoto(
            "Courtyard seating",
            "Separate detail pages help the organizer explain format differences without cluttering the main hub.",
            "linear-gradient(135deg, rgba(76, 56, 36, 0.96), rgba(208, 173, 124, 0.82))"
          ),
          buildPhoto(
            "Story circle",
            "Community events still benefit from visual presentation and explicit occurrence details.",
            "linear-gradient(135deg, rgba(44, 58, 97, 0.96), rgba(139, 149, 214, 0.82))"
          )
        ],
        policies: [
          "No online amount is collected for this event type.",
          "Indoor fallback decisions are communicated on the day of the event.",
          "Registrations remain important because seating is finite even for civic events."
        ],
        faq: [
          {
            question: "Will there be assigned seats?",
            answer:
              "No assigned seats, but the quantity model helps staff prepare the right amount of courtyard space."
          },
          {
            question: "Can grandparents join under the same pass?",
            answer:
              "The event page explains how many attendees one family registration can cover."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "ca-story-2026-06-14",
            startsAt: "2026-06-14T16:00:00+02:00",
            label: "14 Jun 2026",
            time: "16:00 to 18:00",
            capacity: "30 family passes",
            note: "Shaded courtyard afternoon."
          }),
          createOccurrence({
            id: "ca-story-2026-07-19",
            startsAt: "2026-07-19T16:30:00+02:00",
            label: "19 Jul 2026",
            time: "16:30 to 18:30",
            capacity: "26 family passes",
            note: "Summer storytelling edition."
          }),
          createOccurrence({
            id: "ca-story-2026-08-23",
            startsAt: "2026-08-23T16:00:00+02:00",
            label: "23 Aug 2026",
            time: "16:00 to 18:00",
            capacity: "34 family passes",
            note: "Late-summer courtyard session."
          })
        ]
      }
    ]
  },
  {
    slug: "studio-movimento-sud",
    name: "Studio Movimento Sud",
    city: "Lecce",
    region: "Salento",
    tagline:
      "Evening and early-morning wellness formats that need polished event detail pages, venue cues, and gentle deposit framing.",
    description:
      "Studio Movimento Sud relies on recurring seasonal occurrences, so the public experience has to foreground the next dates, terrace atmosphere, and exactly what part of the ticket is paid online before arrival.",
    themeTags: ["sunset series", "wellness", "seasonal dates"],
    venue: {
      title: "Old-town terrace studio",
      detail:
        "Use the venue block to explain roof access, timing, and how late arrivals are handled when the session begins in silence.",
      mapLabel: "Open Lecce terrace studio map",
      mapHref: "https://maps.google.com/?q=Lecce+terrace+studio"
    },
    contact: {
      email: "hello@studiomovimentosud.passreserve.com",
      phone: "+39 0832 180 630"
    },
    photoStory: [
      buildPhoto(
        "Terrace arrival",
        "The organizer hub should feel seasonal and atmospheric before the attendee opens a single event page.",
        "linear-gradient(135deg, rgba(46, 53, 109, 0.96), rgba(133, 145, 224, 0.82))"
      ),
      buildPhoto(
        "Sunset sequence",
        "Recurring wellness events need a visual rhythm that supports the occurrence calendar.",
        "linear-gradient(135deg, rgba(111, 68, 43, 0.96), rgba(241, 167, 116, 0.82))"
      ),
      buildPhoto(
        "Quiet close",
        "Photo-support sections make the venue and timing feel intentional and premium.",
        "linear-gradient(135deg, rgba(31, 79, 68, 0.96), rgba(126, 208, 177, 0.82))"
      )
    ],
    policies: [
      "Deposits are used for recurring seasonal series that reserve limited terrace capacity.",
      "Attendees should review access instructions on the event page because the venue timing is quiet and precise.",
      "Occurrence-specific weather plans are published on each date card rather than buried in organizer settings."
    ],
    faq: [
      {
        question: "Do these sessions happen every week?",
        answer:
          "They recur through the season, but each occurrence is still a first-class dated instance with its own availability."
      },
      {
        question: "When is the remainder due?",
        answer:
          "Any amount not collected online is settled at the venue check-in before the session starts."
      }
    ],
    events: [
      {
        slug: "sunset-breathwork-terrace",
        title: "Sunset Breathwork Terrace",
        category: "Sunset series",
        summary:
          "A recurring terrace series with a 30% online deposit and calm attendee-facing logistics.",
        description:
          "The event detail route shows how Passreserve.com can handle recurring event types well: the long description stays steady, while each occurrence card holds the next date, terrace timing, and capacity truth.",
        audience:
          "A clear match for sunset, breathwork, Lecce, terrace, and wellness browsing.",
        duration: "1h 50m",
        venueDetail:
          "Held on the old-town terrace studio with a short indoor fallback plan for wind shifts.",
        basePrice: 42,
        prepayPercentage: 30,
        highlights: [
          "Recurring seasonal occurrence list",
          "Deposit-led registration without full online payment",
          "Terrace arrival and weather-plan clarity"
        ],
        included: [
          "Guided breathwork and cooldown sequence",
          "Mat placement support on arrival",
          "Short post-session tea service"
        ],
        gallery: [
          buildPhoto(
            "Golden-hour terrace",
            "Recurring series still need a strong featured-event visual identity.",
            "linear-gradient(135deg, rgba(98, 59, 46, 0.96), rgba(232, 153, 118, 0.82))"
          ),
          buildPhoto(
            "Quiet finish",
            "The event page can explain both atmosphere and operational timing without clutter.",
            "linear-gradient(135deg, rgba(27, 74, 79, 0.96), rgba(116, 198, 203, 0.82))"
          )
        ],
        policies: [
          "The online amount secures the terrace spot and is applied to the total ticket price.",
          "Late arrivals may be asked to wait until the first guided sequence ends.",
          "Each occurrence carries any weather-plan note directly on the date card."
        ],
        faq: [
          {
            question: "Is this beginner-friendly?",
            answer:
              "Yes. The pace is introductory and the event page explains how the sequence is guided."
          },
          {
            question: "What if the terrace is too windy?",
            answer:
              "The organizer uses the occurrence note to explain whether the indoor fallback is active for that date."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "sms-sunset-2026-06-12",
            startsAt: "2026-06-12T20:15:00+02:00",
            label: "12 Jun 2026",
            time: "20:15 to 22:05",
            capacity: "16 spots available",
            note: "Season opener on the terrace."
          }),
          createOccurrence({
            id: "sms-sunset-2026-06-26",
            startsAt: "2026-06-26T20:20:00+02:00",
            label: "26 Jun 2026",
            time: "20:20 to 22:10",
            capacity: "11 spots left",
            note: "Warm-weather terrace date."
          }),
          createOccurrence({
            id: "sms-sunset-2026-07-10",
            startsAt: "2026-07-10T20:25:00+02:00",
            label: "10 Jul 2026",
            time: "20:25 to 22:15",
            capacity: "18 spots open",
            note: "High-summer recurring session."
          })
        ]
      },
      {
        slug: "salt-air-reset-morning",
        title: "Salt Air Reset Morning",
        category: "Morning reset",
        summary:
          "An early coastal reset with a smaller ticket, the same gentle deposit framing, and a distinct morning tone.",
        description:
          "A second event route helps the organizer show range: the recurring terrace sunset series remains distinct from the lighter morning coastal format, even though both live under the same public hub.",
        audience:
          "Useful for attendees searching morning reset, coastal wellness, and slower-paced sessions.",
        duration: "2h 10m",
        venueDetail:
          "Starts at the coastal gathering point before a short walk into the practice area.",
        basePrice: 55,
        prepayPercentage: 30,
        highlights: [
          "Morning format with coastal venue notes",
          "Deposit-led registration with balance at arrival",
          "Separate mood and pacing from the sunset series"
        ],
        included: [
          "Guided reset sequence",
          "Tea and fruit at the finish",
          "Venue directions in the attendee brief"
        ],
        gallery: [
          buildPhoto(
            "Coastal start",
            "Separate photo support keeps the second event type from feeling like a duplicate of the sunset series.",
            "linear-gradient(135deg, rgba(26, 80, 84, 0.96), rgba(123, 212, 215, 0.82))"
          ),
          buildPhoto(
            "Morning close",
            "Event detail pages can present atmosphere and logistics together.",
            "linear-gradient(135deg, rgba(112, 78, 52, 0.96), rgba(228, 180, 133, 0.82))"
          )
        ],
        policies: [
          "The online amount secures the selected morning occurrence.",
          "Arrival timing matters because the session starts promptly and quietly.",
          "The organizer may rebalance the coastal location based on wind and crowd conditions."
        ],
        faq: [
          {
            question: "Do I need to bring my own mat?",
            answer:
              "The event page explains what is provided and what the attendee should carry to the coastal meeting point."
          },
          {
            question: "Is this more intense than the sunset series?",
            answer:
              "No. It is a lighter morning reset with a different venue and rhythm."
          }
        ],
        occurrences: [
          createOccurrence({
            id: "sms-reset-2026-06-21",
            startsAt: "2026-06-21T08:00:00+02:00",
            label: "21 Jun 2026",
            time: "08:00 to 10:10",
            capacity: "14 spots left",
            note: "Summer-solstice morning reset."
          }),
          createOccurrence({
            id: "sms-reset-2026-07-05",
            startsAt: "2026-07-05T08:05:00+02:00",
            label: "05 Jul 2026",
            time: "08:05 to 10:15",
            capacity: "17 spots open",
            note: "High-summer coastal edition."
          }),
          createOccurrence({
            id: "sms-reset-2026-07-26",
            startsAt: "2026-07-26T08:10:00+02:00",
            label: "26 Jul 2026",
            time: "08:10 to 10:20",
            capacity: "9 spots left",
            note: "Limited-capacity late-July date."
          })
        ]
      }
    ]
  }
];

function decorateEvent(organizer, event) {
  const payment = calculatePaymentBreakdown({
    unitPrice: event.basePrice,
    quantity: 1,
    prepayPercentage: event.prepayPercentage
  });
  const occurrences = [...event.occurrences].sort((left, right) =>
    left.startsAt.localeCompare(right.startsAt)
  );
  const nextOccurrence = occurrences[0];

  return {
    ...event,
    organizerSlug: organizer.slug,
    organizerName: organizer.name,
    organizerHref: `/${organizer.slug}`,
    detailHref: `/${organizer.slug}/events/${event.slug}`,
    interestHref: buildMailto(
      organizer.contact.email,
      `Interest in ${event.title}`
    ),
    collectionLabel: formatCollectionLabel(event.prepayPercentage),
    priceLabel: formatCurrency(event.basePrice),
    nextOccurrence,
    nextOccurrenceLabel: `${nextOccurrence.label} - ${nextOccurrence.time}`,
    payment
  };
}

function buildAgenda(organizerSlug, events) {
  return events
    .flatMap((event) =>
      event.occurrences.map((occurrence) => ({
        ...occurrence,
        eventTitle: event.title,
        eventSlug: event.slug,
        detailHref: `/${organizerSlug}/events/${event.slug}`,
        collectionLabel: event.collectionLabel,
        priceLabel: event.priceLabel
      }))
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
}

function decorateOrganizer(organizer) {
  const events = organizer.events.map((event) => decorateEvent(organizer, event));
  const agenda = buildAgenda(organizer.slug, events);
  const featuredEvent = events[0];

  return {
    ...organizer,
    events,
    featuredEvent,
    agenda,
    organizerHref: `/${organizer.slug}`,
    defaultCollectionLabel: featuredEvent.collectionLabel,
    totalUpcomingOccurrences: agenda.length,
    interestHref: buildMailto(
      organizer.contact.email,
      `Question about ${organizer.name}`
    )
  };
}

export const publicOrganizerPhase = {
  label: "Phase 06",
  title: "Organizer public pages and event detail experience",
  summary:
    "Passreserve.com now turns discovery results into real organizer hubs and event detail pages with upcoming occurrences, venue context, photos, policy blocks, and event-specific calls to action."
};

export const publicOrganizers = organizerCatalog.map(decorateOrganizer);

export function getOrganizerSlugs() {
  return publicOrganizers.map((organizer) => organizer.slug);
}

export function getOrganizerBySlug(slug) {
  return publicOrganizers.find((organizer) => organizer.slug === slug) ?? null;
}

export function getEventRouteParams() {
  return publicOrganizers.flatMap((organizer) =>
    organizer.events.map((event) => ({
      slug: organizer.slug,
      eventSlug: event.slug
    }))
  );
}

export function getEventBySlugs(slug, eventSlug) {
  const organizer = getOrganizerBySlug(slug);

  if (!organizer) {
    return null;
  }

  const event = organizer.events.find((entry) => entry.slug === eventSlug) ?? null;

  if (!event) {
    return null;
  }

  return {
    organizer,
    event
  };
}
