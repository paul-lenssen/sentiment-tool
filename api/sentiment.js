// /api/sentiment.js — Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { answers, scores } = req.body || {};
  if (!answers || typeof answers !== "string" || answers.trim().length < 20) {
    return res.status(400).json({ error: "Plak minimaal een paar antwoorden." });
  }

  const text = answers.slice(0, 15000);

  // NPS berekening als scores aanwezig
  let npsData = null;
  if (Array.isArray(scores) && scores.length > 0) {
    const promotors = scores.filter(s => s >= 9).length;
    const detractors = scores.filter(s => s <= 6).length;
    const total = scores.length;
    const pPromotors = Math.round((promotors / total) * 100);
    const pDetractors = Math.round((detractors / total) * 100);
    npsData = {
      score: pPromotors - pDetractors,
      promotors: pPromotors,
      detractors: pDetractors,
      passives: 100 - pPromotors - pDetractors,
      total
    };
  }

  // Bouw prompt — met of zonder scores
  const scoresContext = scores && scores.length > 0
    ? `\nBij de antwoorden horen de volgende NPS scores (0-10, zelfde volgorde): ${scores.join(', ')}\nGebruik deze scores om per thema aan te geven of het vaker voorkomt bij promotors (9-10), passives (7-8) of detractors (0-6).`
    : '';

  const prompt = `Je bent een NPS-analist. Hieronder staan open antwoorden uit een NPS-survey (één per regel).${scoresContext}
Analyseer ze en geef je antwoord UITSLUITEND als JSON, zonder markdown of uitleg eromheen, in dit formaat:
{
  "teaser": [
    {"thema": "...", "sentiment": "positief|negatief|gemengd", "percentage": <getal>, "samenvatting": "één zin"}
  ],
  "full": {
    "themas": [
      {
        "thema": "...",
        "sentiment": "positief|negatief|gemengd",
        "percentage": <getal>,
        "samenvatting": "...",
        "citaten": ["...", "..."],
        "scorevierdeling": "voornamelijk bij promotors|detractors|alle groepen"
      }
    ],
    "algemeen_sentiment": "...",
    "aanbevelingen": ["...", "...", "..."]
  }
}
Regels:
- "teaser" bevat EXACT de 3 meest voorkomende thema's (kort).
- "full" bevat ALLE gevonden thema's (max 8), met 1-2 representatieve citaten per thema en 3 concrete aanbevelingen.
- "scoreverdeling" alleen invullen als er scores zijn meegegeven, anders weglaten.
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
    const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({
      teaser: parsed.teaser || [],
      full: parsed.full || {},
      nps: npsData,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Analyse mislukt, probeer opnieuw." });
  }
}
