// /api/notify.js — Vercel serverless function
// Stuurt notificatiemail naar paul@vreemdevogel.com via Mandrill
// met emailadres van gebruiker + volledig NPS rapport.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, teaser, full } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres.' });
  }

  const API_KEY = process.env.MANDRILL_API_KEY;

  // Thema's HTML
  const themas = (full?.themas || teaser || []);
  const themasHtml = themas.map((t, i) => {
    const sentColor = t.sentiment === 'positief' ? '#00C896' : t.sentiment === 'negatief' ? '#FF5C7A' : '#E0A800';
    const citaten = (t.citaten || []).map(c => `<div style="font-size:12px;color:#8A94AD;font-style:italic;margin-top:4px;">"${c}"</div>`).join('');
    return `
      <div style="background:#0A0F1E;border:1px solid #1E2A4A;border-radius:8px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong style="color:#E8ECF4;font-size:14px;">${i + 1}. ${t.thema}</strong>
          <span style="color:#00C896;font-size:13px;">~${t.percentage}%</span>
        </div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${sentColor};margin-bottom:6px;">${t.sentiment}</div>
        <div style="font-size:13px;color:#8A94AD;line-height:1.5;">${t.samenvatting}</div>
        ${citaten}
      </div>`;
  }).join('');

  // Aanbevelingen HTML
  const aanbevelingen = (full?.aanbevelingen || []);
  const aanbevelingenHtml = aanbevelingen.length ? `
    <div style="background:#13203F;border:1px solid #1E2A4A;border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:12px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Aanbevelingen</div>
      ${aanbevelingen.map((a, i) => `
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <span style="font-size:11px;color:#00C896;flex-shrink:0;margin-top:2px;">${i + 1}.</span>
          <span style="font-size:13px;color:#8A94AD;line-height:1.5;">${a}</span>
        </div>`).join('')}
    </div>` : '';

  const html = `
    <div style="background:#0A0F1E;padding:32px;font-family:monospace;color:#E8ECF4;max-width:600px;">
      <div style="color:#00C896;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">Vreemde Vogel — Nieuwe aanvraag</div>
      <h2 style="font-size:18px;font-weight:500;margin-bottom:20px;">NPS Sentiment rapport aangevraagd</h2>

      <div style="background:#111831;border:1px solid #1E2A4A;border-radius:8px;padding:14px;margin-bottom:20px;">
        <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">E-mailadres gebruiker</div>
        <div style="font-size:16px;color:#00C896;">${email}</div>
      </div>

      <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
        Volledig rapport (${themas.length} thema's)
      </div>

      ${themasHtml}
      ${aanbevelingenHtml}

      <div style="background:#13203F;border:1px solid #00C896;border-radius:8px;padding:14px;font-size:13px;color:#8A94AD;line-height:1.6;">
        <strong style="color:#E8ECF4;">Wat nu?</strong><br>
        Zodra <strong style="color:#00C896;">${email}</strong> betaalt via Gumroad, stuur je dit rapport door.<br><br>
        <a href="mailto:${email}" style="color:#00C896;">Mail ${email} direct →</a>
      </div>
    </div>`;

  try {
    const r = await fetch('https://mandrillapp.com/api/1.0/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: API_KEY,
        message: {
          html,
          subject: `NPS rapport aangevraagd — ${email}`,
          from_email: 'info@vreemdevogel.com',
          from_name: 'Vreemde Vogel Tool',
          to: [{ email: 'paul@vreemdevogel.com', type: 'to' }],
        },
      }),
    });
    const data = await r.json();
    if (Array.isArray(data) && ['rejected', 'invalid'].includes(data[0]?.status)) {
      throw new Error(`Mail afgewezen: ${data[0]?.reject_reason || 'onbekend'}`);
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Notificatie mislukt, probeer opnieuw.' });
  }
}
