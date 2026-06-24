// /api/notify.js — Vercel serverless function
// Ontvangt email van gebruiker + volledige rapport data,
// stuurt notificatiemail naar paul@vreemdevogel.com via Mailchimp Transactional (Mandrill).
//
// BELANGRIJK: Mailchimp gratis plan gebruikt Mandrill voor transactionele mail.
// Mandrill vereist een apart (gratis) account op mandrillapp.com — zelfde login als Mailchimp.
// Stel MANDRILL_API_KEY in als environment variable in Vercel.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, teaser } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Ongeldig e-mailadres.' });
  }

  const API_KEY = process.env.MANDRILL_API_KEY;

  // Bouw leesbare HTML van de teaser inzichten
  const insightsHtml = (teaser || []).map((t, i) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1E2A4A;">
        <strong style="color:#E8ECF4;">${i + 1}. ${t.thema}</strong>
        <span style="color:#00C896;margin-left:8px;">~${t.percentage}%</span><br>
        <span style="color:#8A94AD;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${t.sentiment}</span><br>
        <span style="color:#8A94AD;font-size:13px;">${t.samenvatting}</span>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="background:#0A0F1E;padding:32px;font-family:monospace;color:#E8ECF4;max-width:600px;">
      <div style="color:#00C896;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">
        Vreemde Vogel — Nieuwe aanvraag
      </div>
      <h2 style="font-size:20px;font-weight:500;margin-bottom:24px;">
        NPS Sentiment rapport aangevraagd
      </h2>

      <div style="background:#111831;border:1px solid #1E2A4A;border-radius:8px;padding:16px;margin-bottom:24px;">
        <div style="font-size:12px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">
          E-mailadres gebruiker
        </div>
        <div style="font-size:16px;color:#00C896;">${email}</div>
      </div>

      <div style="font-size:12px;color:#8A94AD;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">
        Analyse resultaten (teaser)
      </div>
      <table style="width:100%;border-collapse:collapse;background:#111831;border:1px solid #1E2A4A;border-radius:8px;margin-bottom:24px;">
        ${insightsHtml}
      </table>

      <div style="background:#13203F;border:1px solid #00C896;border-radius:8px;padding:16px;font-size:13px;color:#8A94AD;line-height:1.6;">
        <strong style="color:#E8ECF4;">Wat nu?</strong><br>
        Zodra <strong style="color:#00C896;">${email}</strong> betaalt via Gumroad,
        stuur je het volledige rapport naar dit adres.<br><br>
        <a href="mailto:${email}" style="color:#00C896;">Mail ${email} →</a>
      </div>
    </div>
  `;

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

    // Mandrill geeft array terug; check op rejected/invalid
    if (Array.isArray(data) && data[0]?.status === 'sent') {
      return res.status(200).json({ ok: true });
    }
    if (Array.isArray(data) && ['rejected','invalid'].includes(data[0]?.status)) {
      throw new Error(`Mail afgewezen: ${data[0]?.reject_reason || 'onbekend'}`);
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Notificatie mislukt, probeer opnieuw.' });
  }
}
