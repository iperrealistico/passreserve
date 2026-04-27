import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS,
  createOrganizerRequestAltchaChallenge,
  verifyOrganizerRequestAltchaPayload
} from "../lib/passreserve-antispam.js";
import { consumeOrganizerRequestCaptchaToken } from "../lib/passreserve-auth-security.js";

beforeEach(async () => {
  process.env.PASSRESERVE_STATE_FILE = path.join(
    os.tmpdir(),
    `passreserve-antispam-${Date.now()}-${Math.random()}.json`
  );

  await fs.rm(process.env.PASSRESERVE_STATE_FILE, {
    force: true
  });
  await fs.rm(`${process.env.PASSRESERVE_STATE_FILE}.auth-rate-limits.json`, {
    force: true
  });
});

describe("passreserve-antispam", () => {
  it("verifies organizer-request ALTCHA payloads and rejects replayed challenge ids", async () => {
    const challenge = await createOrganizerRequestAltchaChallenge();
    const solution = await solveChallenge({
      challenge,
      deriveKey,
      timeout: 10000
    });

    expect(solution).not.toBeNull();

    const rawPayload = Buffer.from(
      JSON.stringify({
        challenge,
        solution
      }),
      "utf8"
    ).toString("base64url");

    const verification = await verifyOrganizerRequestAltchaPayload(rawPayload);

    expect(verification).toMatchObject({
      ok: true
    });

    const firstUse = await consumeOrganizerRequestCaptchaToken(verification.challengeId, {
      windowSeconds: ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS
    });
    const replayUse = await consumeOrganizerRequestCaptchaToken(verification.challengeId, {
      windowSeconds: ORGANIZER_REQUEST_ALTCHA_WINDOW_SECONDS
    });

    expect(firstUse.success).toBe(true);
    expect(replayUse.success).toBe(false);
  });
});
