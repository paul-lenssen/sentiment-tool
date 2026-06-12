// /api/sentiment.js — Vercel serverless function
// Analyseert open NPS-antwoorden en geeft max 3 insights terug (teaser).
// Het VOLLEDIGE rapport wordt ook gegenereerd maar alleen server-side bewaard
// in de response onder 'fullReport' — de frontend toont alleen de teaser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { answers } = req.body || {};
  if (!answers || typeof answers !== "string" || answers.trim().length < 20) {
    return res.status(400).json({ error: "Plak minimaal een paar antwoorden." });
  }
  // Limiteer input (kostenbeheersing): max ~15.000 tekens
  const text = answers.slice(0, 15000);

  const prompt = `Je bent een NPS-analist. Hieronder staan open antwoorden uit een NPS-survey (één per regel).

Analyseer ze en geef je antwoord UITSLUITEND als JSON, zonder markdown of uitleg eromheen, in dit formaat:
{
  "teaser": [
    {"thema": "...", "sentiment": "positief|negatief|gemengd", "percentage": <getal>, "samenvatting": "één zin"}
  ],
  "full": {
    "themas": [
      {"thema": "...", "sentiment": "...", "percentage": <getal>, "samenvatting": "...", "citaten": ["...", "..."]}
    ],
    "algemeen_sentiment": "...",
    "aanbevelingen": ["...", "...", "..."]
  }
}

Regels:
- "teaser" bevat EXACT de 3 meest voorkomende thema's (kort).
- "full" bevat ALLE gevonden thema's (max 8), met 1-2 representatieve citaten per thema en 3 concrete aanbevelingen.
- "percentage" = geschat aandeel van de antwoorden dat dit thema raakt.
- Schrijf alles in het Nederlands.

ANTWOORDEN:
${text}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await r.json();
    const raw = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Teaser naar de browser; het volledige rapport gaat NIET mee
    // (wordt later geleverd na betaling — zie rapport-flow).
    return res.status(200).json({
      teaser: parsed.teaser || [],
      // full bewust NIET meesturen; optioneel: hier opslaan met een ID
      // zodat het rapport na betaling opgehaald kan worden.
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Analyse mislukt, probeer opnieuw." });
  }
}
