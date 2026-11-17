
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");

const BASE = `${API_URL}/api/v1/student/voice`;

async function responseError(response) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 401) {
    window.dispatchEvent(
      new Event("connect-ai-auth-expired")
    );

    return "Your login expired. Please sign in again.";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  return `Voice API failed (${response.status})`;
}

export async function transcribeAudio(
  audioBlob,
  token,
  languageCode = "unknown"
) {
  if (!token) {
    throw new Error("Please sign in again.");
  }

  const type = audioBlob.type || "audio/webm";

  const extension = type.includes("mp4")
    ? "m4a"
    : type.includes("ogg")
      ? "ogg"
      : type.includes("wav")
        ? "wav"
        : "webm";

  const form = new FormData();

  form.append(
    "file",
    audioBlob,
    `question.${extension}`
  );

  const response = await fetch(
    `${BASE}/transcribe?language_code=${encodeURIComponent(
      languageCode
    )}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  const result = await response.json();

  return {
    transcript: result.transcript || "",
    language_code: result.language_code || "unknown",
  };
}

export async function generateVoice(
  text,
  token,
  languageCode = "en-IN",
  signal
) {
  if (!token) {
    throw new Error("Please sign in again.");
  }

  const speechText = String(text || "")
    .replace(/\[\d+\]/g, "")
    .trim();

  if (!speechText) {
    throw new Error("Nothing to speak.");
  }

  const response = await fetch(`${BASE}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text: speechText.slice(0, 2500),
      language_code: languageCode,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await responseError(response));
  }

  const audio = await response.blob();

  if (!audio.size) {
    throw new Error("No speech audio returned.");
  }

  return audio;
}
