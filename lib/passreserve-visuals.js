export const publicVisualStylePrompt = [
  "Passreserve.com brand image system.",
  "Warm modern editorial direction with sand, parchment, deep moss green, terracotta-coral, and soft cream highlights.",
  "Hybrid visual language: stylized 3D smartphones for platform and product moments; stylized place and object still lifes for hosts, events, and venue atmosphere.",
  "No people or human figures, including inside device screens or interface thumbnails.",
  "Premium studio lighting, matte glass, ceramic, brushed metal, paper textures, subtle depth, restrained reflections, clean negative space.",
  "Avoid neon tech vibes, noisy realism, stock-photo staging, clutter, logos, watermarks, and any visible text."
].join(" ");

function createVisual(id, src, alt) {
  return {
    id,
    src,
    alt,
    width: 1536,
    height: 1024
  };
}

export const publicVisualCatalog = {
  "home-find-event": createVisual(
    "home-find-event",
    "/images/passreserve/home-find-event.webp",
    "A stylized warm-toned smartphone render showing a local event discovery feed."
  ),
  "home-host-event": createVisual(
    "home-host-event",
    "/images/passreserve/home-host-event.webp",
    "A stylized warm-toned smartphone render showing a host event page and registration highlights."
  ),
  "about-editorial": createVisual(
    "about-editorial",
    "/images/passreserve/about-editorial.webp",
    "A premium still life of Passreserve-like event cards, paper tickets, and a phone resting on warm stone."
  ),
  "about-launch": createVisual(
    "about-launch",
    "/images/passreserve/about-launch.webp",
    "A sculptural 3D phone render with warm interface cards and hosting details arranged on a soft editorial set."
  ),
  "organizer-hero-still": createVisual(
    "organizer-hero-still",
    "/images/passreserve/organizer-hero-still.webp",
    "A warm venue still life with event signage, ceramic cups, and editorial objects arranged without people."
  ),
  "organizer-gallery-01": createVisual(
    "organizer-gallery-01",
    "/images/passreserve/organizer-gallery-01.webp",
    "A stylized venue lounge still life with maps, coffee, and natural materials."
  ),
  "organizer-gallery-02": createVisual(
    "organizer-gallery-02",
    "/images/passreserve/organizer-gallery-02.webp",
    "A warm editorial event-prep still life with paper cards, table textures, and soft afternoon light."
  ),
  "event-hero-still": createVisual(
    "event-hero-still",
    "/images/passreserve/event-hero-still.webp",
    "A cinematic event still life with place cues, tactile materials, and warm atmospheric lighting."
  ),
  "event-gallery-01": createVisual(
    "event-gallery-01",
    "/images/passreserve/event-gallery-01.webp",
    "A detail-rich editorial still life with warm stone, notes, and event accessories."
  ),
  "event-gallery-02": createVisual(
    "event-gallery-02",
    "/images/passreserve/event-gallery-02.webp",
    "A polished still life of venue objects and branded paper materials in a warm modern palette."
  ),
  "registration-flow": createVisual(
    "registration-flow",
    "/images/passreserve/registration-flow.webp",
    "A stylized 3D smartphone render showing a clean registration flow in warm earthy colors."
  ),
  "payment-preview": createVisual(
    "payment-preview",
    "/images/passreserve/payment-preview.webp",
    "A stylized 3D smartphone render showing a payment review screen with soft glass reflections."
  ),
  "payment-success": createVisual(
    "payment-success",
    "/images/passreserve/payment-success.webp",
    "A stylized 3D smartphone render showing a payment success state with warm premium lighting."
  ),
  "not-found": createVisual(
    "not-found",
    "/images/passreserve/not-found.webp",
    "A warm editorial still life with a folded map, compass-like object, and a phone resting on soft stone."
  ),
  "staff-login": createVisual(
    "staff-login",
    "/images/passreserve/staff-login.webp",
    "A stylized 3D device render showing a calm support dashboard in the Passreserve brand palette."
  )
};

export const routeVisuals = {
  homeFind: "home-find-event",
  homeHost: "home-host-event",
  aboutHero: "about-editorial",
  aboutCta: "about-launch",
  organizerHero: "organizer-hero-still",
  eventHero: "event-hero-still",
  registrationStart: "registration-flow",
  registrationConfirm: "registration-flow",
  registrationConfirmed: "registration-flow",
  paymentPreview: "payment-preview",
  paymentCancel: "payment-preview",
  paymentSuccess: "payment-success",
  notFound: "not-found",
  staffLogin: "staff-login"
};

const catalogVisualIds = [
  "organizer-gallery-01",
  "organizer-gallery-02",
  "event-gallery-01",
  "event-gallery-02"
];

function hashSeed(seed) {
  return Array.from(seed).reduce((hash, char) => {
    return (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }, 7);
}

export function selectCatalogVisualId(seed, index = 0) {
  const offset = (hashSeed(seed) + index) % catalogVisualIds.length;

  return catalogVisualIds[offset];
}

export function getPublicVisual(id) {
  const visual = publicVisualCatalog[id];

  if (!visual) {
    throw new Error(`Unknown Passreserve visual "${id}".`);
  }

  return visual;
}

export const publicVisualGenerationJobs = [
  {
    id: "home-find-event",
    out: "home-find-event.png",
    use_case: "stylized-concept",
    prompt:
      "Hero visual for the Find an event path on Passreserve.com.",
    scene:
      "Soft parchment studio set with sculpted stone blocks and a warm abstract backdrop.",
    subject:
      "Single modern stylized smartphone showing a clean local event discovery feed with cards, dates, and venue chips.",
    style:
      "Premium 3D render, editorial product image, warm modern brand styling.",
    composition:
      "Landscape, three-quarter phone angle, generous negative space, balanced for a landing page hero.",
    lighting:
      "Soft studio glow with subtle long shadows and restrained reflections.",
    palette:
      "Sand, parchment, deep moss, terracotta-coral, soft cream.",
    materials:
      "Matte glass, ceramic, brushed metal, lightly textured paper.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, text, neon glow, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "home-host-event",
    out: "home-host-event.png",
    use_case: "stylized-concept",
    prompt:
      "Hero visual for the Host an event path on Passreserve.com.",
    scene:
      "Warm sculptural set with layered cards, soft stone surfaces, and a calm brand-color backdrop.",
    subject:
      "Single stylized smartphone showing a host-facing event page with dates, pricing, and attendee counts.",
    style:
      "Premium 3D render with product-marketing polish and editorial restraint.",
    composition:
      "Landscape, device centered left with supporting paper cards and room for nearby copy.",
    lighting:
      "Warm side light, subtle rim light, matte reflections.",
    palette:
      "Sand, cream, terracotta-coral, moss green, muted gold.",
    materials:
      "Matte glass, ceramic cards, brushed aluminum, paper textures.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, text, neon UI, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "about-editorial",
    out: "about-editorial.png",
    use_case: "stylized-concept",
    prompt:
      "About-page editorial still life for Passreserve.com.",
    scene:
      "Warm stone tabletop with soft paper objects and a sculptural neutral background.",
    subject:
      "Smartphone, printed event cards, tickets, venue tags, and abstract wayfinding pieces arranged in a premium editorial composition.",
    style:
      "Stylized editorial still life with 3D-rendered objects and no visible text.",
    composition:
      "Landscape overhead three-quarter composition with layered objects and elegant spacing.",
    lighting:
      "Soft morning light, gentle glow, natural shadow falloff.",
    palette:
      "Parchment, moss, terracotta, cream, muted bronze.",
    materials:
      "Paper stock, ceramic, frosted glass, linen, stone.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, words, neon, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "about-launch",
    out: "about-launch.png",
    use_case: "stylized-concept",
    prompt:
      "Hosting-focused brand illustration for Passreserve.com.",
    scene:
      "Warm minimal studio set with layered plinths and soft curved backdrop.",
    subject:
      "Stylized smartphone with host tools and abstract hosting props like event cards, payment chips, and schedule tiles.",
    style:
      "Premium 3D render with soft editorial color grading.",
    composition:
      "Landscape composition with the device slightly off-center and generous breathing room.",
    lighting:
      "Studio light with soft edge glow and restrained reflections.",
    palette:
      "Sand, moss, terracotta-coral, cream, muted charcoal.",
    materials:
      "Matte glass, paper, ceramic, brushed metal.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "organizer-hero-still",
    out: "organizer-hero-still.png",
    use_case: "stylized-concept",
    prompt:
      "Organizer page hero image for a warm event venue story.",
    scene:
      "Editorial venue corner with warm stone, ceramic cups, paper maps, and atmospheric natural light.",
    subject:
      "Still life of venue details and event-prep objects that feel inviting and trustworthy, with no people.",
    style:
      "Premium stylized still life, tactile and calm.",
    composition:
      "Landscape scene with layered foreground and background depth.",
    lighting:
      "Golden-hour indoor light with soft contrast.",
    palette:
      "Warm sand, olive moss, terracotta, cream, walnut.",
    materials:
      "Ceramic, stone, linen, matte paper, wood.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "organizer-gallery-01",
    out: "organizer-gallery-01.png",
    use_case: "stylized-concept",
    prompt:
      "Atmospheric organizer gallery image for Passreserve.com.",
    scene:
      "Warm lounge setting with soft daylight and simple venue details.",
    subject:
      "Paper map, ceramic cup, event token, and tactile hosting objects arranged without people.",
    style:
      "Stylized editorial still life with premium restraint.",
    composition:
      "Landscape composition with layered depth and room for overlay text.",
    lighting:
      "Soft afternoon light, calm shadows.",
    palette:
      "Parchment, moss, terracotta, soft cream.",
    materials:
      "Paper, ceramic, wood, matte fabric.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "organizer-gallery-02",
    out: "organizer-gallery-02.png",
    use_case: "stylized-concept",
    prompt:
      "Second organizer gallery image for Passreserve.com.",
    scene:
      "Warm editorial tabletop with subtle venue cues and natural materials.",
    subject:
      "Tactile hosting props, ticket cards, and soft architectural shadows, no people.",
    style:
      "Premium stylized still life with cinematic calm.",
    composition:
      "Landscape crop with open negative space and text-friendly framing.",
    lighting:
      "Low-angle warm studio light with matte highlights.",
    palette:
      "Sand, olive, terracotta, cream, muted bronze.",
    materials:
      "Stone, paper, linen, ceramic, frosted glass.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, words, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "event-hero-still",
    out: "event-hero-still.png",
    use_case: "stylized-concept",
    prompt:
      "Event page hero image for Passreserve.com.",
    scene:
      "Cinematic still life on a warm studio set with venue cues and elegant event materials.",
    subject:
      "Objects that suggest a hosted event experience such as cards, tactile accessories, and a place marker, without any people.",
    style:
      "Premium editorial still life with subtle stylization.",
    composition:
      "Landscape with strong foreground object and depth behind it.",
    lighting:
      "Warm spotlight mixed with soft ambient fill.",
    palette:
      "Cream, sand, moss, terracotta, muted charcoal.",
    materials:
      "Paper, stone, ceramic, brushed metal, matte glass.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "event-gallery-01",
    out: "event-gallery-01.png",
    use_case: "stylized-concept",
    prompt:
      "Event atmosphere gallery image for Passreserve.com.",
    scene:
      "Warmly lit venue details with abstract architectural forms and calm event props.",
    subject:
      "Tactile event objects arranged as a premium still life, no people.",
    style:
      "Editorial stylized still life with depth and calm.",
    composition:
      "Landscape frame with open space for overlay text.",
    lighting:
      "Late-afternoon warm light, soft falloff.",
    palette:
      "Sand, cream, terracotta-coral, olive, walnut.",
    materials:
      "Stone, wood, ceramic, paper, fabric.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, words, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "event-gallery-02",
    out: "event-gallery-02.png",
    use_case: "stylized-concept",
    prompt:
      "Second event atmosphere image for Passreserve.com.",
    scene:
      "Refined indoor venue corner with soft shadows and modern editorial styling.",
    subject:
      "Minimal event accessories and venue markers rendered as a tactile still life, no people.",
    style:
      "Premium warm 3D editorial scene.",
    composition:
      "Landscape with layered foreground and background shapes.",
    lighting:
      "Soft studio light with subtle directionality.",
    palette:
      "Parchment, moss green, terracotta, cream, brushed bronze.",
    materials:
      "Ceramic, frosted glass, stone, paper.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "registration-flow",
    out: "registration-flow.png",
    use_case: "stylized-concept",
    prompt:
      "Registration flow visual for Passreserve.com.",
    scene:
      "Warm minimal studio set with a sculptural smartphone on a layered plinth.",
    subject:
      "A clean event registration form interface with date, ticket, and attendee details shown in an elegant warm UI.",
    style:
      "Premium 3D smartphone render with editorial lighting.",
    composition:
      "Landscape, device-forward composition with room for adjacent page copy.",
    lighting:
      "Soft studio lighting with matte highlights and shallow depth cues.",
    palette:
      "Sand, cream, moss, terracotta-coral, charcoal.",
    materials:
      "Matte glass, brushed aluminum, ceramic plinth, textured paper.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable body text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "payment-preview",
    out: "payment-preview.png",
    use_case: "stylized-concept",
    prompt:
      "Payment review visual for Passreserve.com.",
    scene:
      "Warm editorial studio set with soft glass reflections and layered payment chips.",
    subject:
      "Stylized smartphone showing a calm payment review screen with amount summary and secure checkout cues.",
    style:
      "Premium 3D product render, warm and restrained.",
    composition:
      "Landscape three-quarter view with supportive floating UI elements and negative space.",
    lighting:
      "Soft key light, subtle rim glow, matte reflections.",
    palette:
      "Cream, sand, terracotta, moss, muted graphite.",
    materials:
      "Frosted glass, brushed metal, ceramic, paper.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, neon, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "payment-success",
    out: "payment-success.png",
    use_case: "stylized-concept",
    prompt:
      "Payment success visual for Passreserve.com.",
    scene:
      "Warm studio backdrop with calm celebratory lighting and clean abstract shapes.",
    subject:
      "Stylized smartphone showing a successful payment state with elegant confirmation cues, no readable text.",
    style:
      "Premium 3D product render with warm editorial restraint.",
    composition:
      "Landscape with device centered and supportive abstract confirmation elements.",
    lighting:
      "Soft glow with restrained highlights and subtle depth.",
    palette:
      "Cream, moss, terracotta-coral, sand, muted gold.",
    materials:
      "Glass, ceramic, brushed metal, stone.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, confetti clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "not-found",
    out: "not-found.png",
    use_case: "stylized-concept",
    prompt:
      "Not-found page visual for Passreserve.com.",
    scene:
      "Warm editorial still life on stone with a folded map, compass-inspired object, and resting phone.",
    subject:
      "Wayfinding objects arranged with calm premium styling and no people.",
    style:
      "Stylized editorial still life with tactile materials.",
    composition:
      "Landscape composition with a clear focal object and negative space.",
    lighting:
      "Soft natural light with subtle shadows.",
    palette:
      "Parchment, sand, moss, terracotta, walnut.",
    materials:
      "Paper, stone, metal, ceramic, matte glass.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  },
  {
    id: "staff-login",
    out: "staff-login.png",
    use_case: "stylized-concept",
    prompt:
      "Staff access visual for Passreserve.com.",
    scene:
      "Warm modern studio set with layered dashboards and subtle architectural forms.",
    subject:
      "Stylized device render showing a calm host-request and service-status dashboard in the Passreserve palette.",
    style:
      "Premium 3D device render, editorial and restrained.",
    composition:
      "Landscape with device and interface cards balanced for a sign-in page hero.",
    lighting:
      "Soft studio lighting, low-glare glass, subtle edge highlights.",
    palette:
      "Deep moss, sand, terracotta-coral, cream, muted graphite.",
    materials:
      "Matte glass, brushed metal, ceramic, stone.",
    constraints:
      publicVisualStylePrompt,
    negative:
      "people, logos, readable text, clutter, watermark",
    size: "1536x1024",
    quality: "high"
  }
];
