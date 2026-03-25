export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, voiceName, speakingRate } = req.body ?? {};

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing text" });
    }

    const apiKey = process.env.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GOOGLE_TTS_API_KEY" });
    }

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: "en-US",
            name: typeof voiceName === "string" ? voiceName : "en-US-Chirp3-HD-Algieba",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate:
              typeof speakingRate === "number" && speakingRate > 0
                ? speakingRate
                : 1,
          },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error ?? "TTS failed" });
    }

    if (!data?.audioContent) {
      return res.status(502).json({ error: "No audioContent in Google response" });
    }

    return res.status(200).json({ audioContent: data.audioContent });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return res.status(500).json({ error: message });
  }
}
