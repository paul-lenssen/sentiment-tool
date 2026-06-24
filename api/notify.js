// /api/notify.js — Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { naam, email, teaser, full, nps } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres.' });
  }

  const API_KEY = process.env.MANDRILL_API_KEY;
  const themas = full?.themas || teaser || [];

  // NPS sectie
  const npsHtml = nps ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">NPS Analyse</div>
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <div style="flex:1;background:#0A0F1E;border:1px solid #1E2A4A;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:500;color:#00C896;">${nps.promotors}%</div>
          <div style="font-size:10px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Promotors</div>
        </div>
        <div style="flex:1;background:#0A0F1E;border:1px solid #1E2A4A;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:500;color:#FF5C7A;">${nps.detractors}%</div>
          <div style="font-size:10px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Detractors</div>
        </div>
        <div style="flex:1;background:#0A0F1E;border:1px solid #1E2A4A;border-radius:8px;padding:12px;text-align:center;">
          <div style="font-size:20px;font-weight:500;color:#E8ECF4;">${nps.score > 0 ? '+' : ''}${nps.score}</div>
          <div style="font-size:10px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">NPS Score</div>
        </div>
      </div>
    </div>` : '';

  // Thema's
  const themasHtml = themas.map((t, i) => {
    const sentColor = t.sentiment === 'positief' ? '#00C896' : t.sentiment === 'negatief' ? '#FF5C7A' : '#E0A800';
    const citaten = (t.citaten || []).map(c => `<div style="font-size:12px;color:#8A94AD;font-style:italic;margin-top:4px;">"${c}"</div>`).join('');
    const scoreVerdeling = t.scoreverdeling ? `<div style="font-size:11px;color:#8A94AD;margin-top:4px;">📊 ${t.scoreverdeling}</div>` : '';
    return `
      <div style="background:#0A0F1E;border:1px solid #1E2A4A;border-radius:8px;padding:14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <strong style="color:#E8ECF4;font-size:14px;">${i + 1}. ${t.thema}</strong>
          <span style="color:#00C896;font-size:13px;">~${t.percentage}%</span>
        </div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${sentColor};margin-bottom:6px;">${t.sentiment}</div>
        <div style="font-size:13px;color:#8A94AD;line-height:1.5;">${t.samenvatting}</div>
        ${scoreVerdeling}
        ${citaten}
      </div>`;
  }).join('');

  // Aanbevelingen
  const aanbHtml = (full?.aanbevelingen || []).length ? `
    <div style="background:#13203F;border:1px solid #1E2A4A;border-radius:8px;padding:14px;margin-bottom:16px;">
      <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Aanbevelingen</div>
      ${(full.aanbevelingen || []).map((a, i) => `
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
        <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Klant</div>
        <div style="font-size:16px;color:#E8ECF4;font-weight:500;">${naam || '—'}</div>
        <div style="font-size:14px;color:#00C896;margin-top:2px;">${email}</div>
      </div>

      ${npsHtml}

      <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
        Volledig rapport (${themas.length} thema's)
      </div>
      ${themasHtml}
      ${aanbHtml}

      <div style="background:#0A0F1E;border:1px solid rgba(0,200,150,.2);border-radius:8px;padding:14px;margin-bottom:16px;">
        <div style="font-size:11px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">📊 Tip om mee te sturen — cross-sell</div>
        <div style="font-size:13px;color:#E8ECF4;margin-bottom:10px;line-height:1.6;">Wil je NPS structureel bijhouden, segmenten vergelijken en trends over tijd zien? Het <strong>NPS Model Pro</strong> Excel-template doet dit automatisch — inclusief dashboard en dummy data.</div>
        <a href="https://vreemdevogel.gumroad.com/l/nps-pro" style="display:inline-block;background:#00C896;color:#04110C;text-decoration:none;border-radius:6px;padding:8px 16px;font-size:12px;font-weight:500;">NPS Model Pro — €39,- →</a>
      </div>

      <div style="background:#13203F;border:1px solid #00C896;border-radius:8px;padding:14px;font-size:13px;color:#8A94AD;line-height:1.6;">
        <strong style="color:#E8ECF4;">Wat nu?</strong><br>
        Zodra <strong style="color:#00C896;">${email}</strong> betaalt via Gumroad, stuur je dit rapport door.<br>
        Voeg de cross-sell tip hierboven toe aan je e-mail.<br><br>
        <a href="mailto:${email}?subject=Jouw NPS Sentiment Rapport — Vreemde Vogel" style="color:#00C896;">Mail ${naam || email} direct →</a>
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
          subject: `NPS rapport aangevraagd — ${naam || email}`,
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
