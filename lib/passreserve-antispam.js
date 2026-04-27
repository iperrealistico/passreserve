import { randomUUID } from "node:crypto";

import { createChallenge, verifySolution } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";

import { SESSION_PASSWORD } from "./passreserve-config.js";

export const ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS = 20 * 60;
export const ORGANIZER_REQUEST_MIN_SUBMIT_SECONDS = 3;

const ORGANIZER_REQUEST_FORM_SCOPE = "organizer-request";

function resolveAltchaSecret() {
  return (
    process.env.ALTCHA_HMAC_KEY?.trim() ||
    process.env.IP_SALT?.trim() ||
    SESSION_PASSWORD
  );
}

function parseAltchaPayload(rawPayload) {
  if (!rawPayload) {
    return null;
  }

  try {
    const decoded = Buffer.from(String(rawPayload), "base64url").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    try {
      const decoded = Buffer.from(String(rawPayload), "base64").toString("utf8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

function getPayloadChallengeId(payload) {
  return (
    payload?.challenge?.parameters?.data?.challengeId ||
    payload?.challenge?.parameters?.nonce ||
    null
  );
}

export async function createOrganizerRequestAltchaChallenge() {
  return createChallenge({
    algorithm: "PBKDF2/SHA-256",
    cost: 5_000,
    data: {
      challengeId: randomUUID(),
      form: ORGANIZER_REQUEST_FORM_SCOPE
    },
    deriveKey,
    expiresAt: new Date(Date.now() + ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS * 1000),
    hmacSignatureSecret: resolveAltchaSecret()
  });
}

export async function verifyOrganizerRequestAltchaPayload(rawPayload) {
  const payload = parseAltchaPayload(rawPayload);

  if (!payload?.challenge || !payload?.solution) {
    return {
      ok: false,
      message: "Complete the human verification step before sending your request."
    };
  }

  if (payload.challenge?.parameters?.data?.form !== ORGANIZER_REQUEST_FORM_SCOPE) {
    return {
      ok: false,
      message: "The verification token does not match this request form. Please try again."
    };
  }

  const challengeId = getPayloadChallengeId(payload);

  if (!challengeId) {
    return {
      ok: false,
      message: "The verification token is incomplete. Please reload the form and try again."
    };
  }

  const verification = await verifySolution({
    challenge: payload.challenge,
    deriveKey,
    hmacSignatureSecret: resolveAltchaSecret(),
    solution: payload.solution
  });

  if (!verification.verified) {
    return {
      ok: false,
      message: verification.expired
        ? "The human verification expired. Please try again."
        : "We could not verify this submission. Please try again."
    };
  }

  return {
    ok: true,
    challengeId
  };
}
