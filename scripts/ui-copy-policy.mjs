export const forbiddenUiCopyRules = [
  {
    label: "phase",
    htmlPattern: /\bphase\b/i
  },
  {
    label: "cms",
    htmlPattern: /\bcms\b/i
  },
  {
    label: "back office",
    htmlPattern: /\bback[- ]office\b/i,
    sourcePattern: /\bback[- ]office\b/i
  },
  {
    label: "platform admin",
    htmlPattern: /\bplatform[- ]admin\b/i,
    sourcePattern: /\bplatform[- ]admin\b/i
  },
  {
    label: "operations",
    htmlPattern: /\boperations\b/i
  },
  {
    label: "lifecycle",
    htmlPattern: /\blifecycle\b/i
  },
  {
    label: "source of truth",
    htmlPattern: /\bsource of truth\b/i,
    sourcePattern: /\bsource of truth\b/i
  },
  {
    label: "demo",
    htmlPattern: /\bdemo\b/i
  },
  {
    label: "preview mode",
    htmlPattern: /\bpreview mode\b/i,
    sourcePattern: /\bpreview mode\b/i
  },
  {
    label: "current build layer",
    htmlPattern: /\bcurrent build layer\b/i,
    sourcePattern: /\bcurrent build layer\b/i
  },
  {
    label: "what this phase delivers",
    htmlPattern: /\bwhat this phase delivers\b/i,
    sourcePattern: /\bwhat this phase delivers\b/i
  },
  {
    label: "tenant",
    htmlPattern: /\btenant\b/i
  },
  {
    label: "rider",
    htmlPattern: /\brider\b/i
  },
  {
    label: "booking",
    htmlPattern: /\bbooking\b/i
  },
  {
    label: "pickup",
    htmlPattern: /\bpickup\b/i
  },
  {
    label: "inventory",
    htmlPattern: /\binventory\b/i
  },
  {
    label: "workspace",
    htmlPattern: /\bworkspace\b/i
  },
  {
    label: "public story",
    htmlPattern: /\bpublic story\b/i,
    sourcePattern: /\bpublic story\b/i
  },
  {
    label: "super-admin",
    htmlPattern: /\bsuper-admin\b/i,
    sourcePattern: /\bsuper-admin\b/i
  },
  {
    label: "eyebrow badge",
    sourcePattern: /className="eyebrow"/
  }
];

export function findForbiddenUiCopy(text, patternKey = "htmlPattern") {
  return forbiddenUiCopyRules.find((rule) => {
    const pattern = rule[patternKey];

    return pattern ? pattern.test(text) : false;
  });
}
