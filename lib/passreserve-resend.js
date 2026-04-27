import { Resend } from "resend";

let resendClient;

function getRequiredApiKey() {
  return process.env.RESEND_API_KEY?.trim() || "";
}

function readResponseError(error, fallbackMessage) {
  if (error?.message) {
    return error.message;
  }

  return fallbackMessage;
}

export function hasResendApiKey() {
  return Boolean(getRequiredApiKey());
}

export function getResendWebhookSecret() {
  return process.env.RESEND_WEBHOOK_SECRET?.trim() || "";
}

export function getResendClient() {
  const apiKey = getRequiredApiKey();

  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export async function verifyResendWebhookPayload(payload, headers) {
  const client = getResendClient();
  const webhookSecret = getResendWebhookSecret();

  if (!client || !webhookSecret) {
    throw new Error("Resend webhook verification is not configured.");
  }

  return client.webhooks.verify({
    payload,
    headers: {
      id: headers.get("svix-id"),
      timestamp: headers.get("svix-timestamp"),
      signature: headers.get("svix-signature")
    },
    webhookSecret
  });
}

export async function getReceivedEmailById(emailId) {
  const client = getResendClient();

  if (!client) {
    throw new Error("Resend receiving is not configured.");
  }

  const { data, error } = await client.emails.receiving.get(emailId);

  if (error || !data) {
    throw new Error(readResponseError(error, `Resend could not retrieve received email ${emailId}.`));
  }

  return data;
}

export async function listReceivedEmailAttachments(emailId) {
  const client = getResendClient();

  if (!client) {
    throw new Error("Resend receiving is not configured.");
  }

  const { data, error } = await client.emails.receiving.attachments.list({
    emailId
  });

  if (error || !Array.isArray(data)) {
    throw new Error(
      readResponseError(error, `Resend could not list attachments for received email ${emailId}.`)
    );
  }

  return data;
}

export async function getReceivedEmailAttachment(emailId, attachmentId) {
  const client = getResendClient();

  if (!client) {
    throw new Error("Resend receiving is not configured.");
  }

  const { data, error } = await client.emails.receiving.attachments.get({
    emailId,
    id: attachmentId
  });

  if (error || !data) {
    throw new Error(
      readResponseError(
        error,
        `Resend could not retrieve attachment ${attachmentId} for received email ${emailId}.`
      )
    );
  }

  return data;
}
