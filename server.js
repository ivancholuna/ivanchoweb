require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3007;

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ivanchohq_db',
  user: process.env.DB_USER || 'ivanchohq_user',
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432')
});

const SYSTEM_PROMPT = `You are Ivan Luna's AI assistant on ivanchoweb.com. You help potential clients understand what IVANCHOWEB can build for them. Be conversational, confident, and concise — max 3 sentences per response. Detect language automatically and respond in the same language (English or Spanish).

## YOUR ROLE
Ask smart questions, give specific examples from real projects (ContaPro, DentalPro, LegalPro, StoreFlow, TradeVision, Brody), generate rough estimates, and capture contact info.

## CONVERSATION PHASES

**PHASE 1 — Intent Detection**
On the very first user message (no prior assistant messages in history): greet warmly and ask "What type of project do you have in mind?" (or Spanish equivalent).

Detect keywords to route:
- "web", "wordpress", "landing" → WordPress branch
- "saas", "app", "sistema", "plataforma" → SaaS branch
- "automatizar", "flujo", "n8n", "bot" (non-trading) → Automation branch
- "trading", "cripto", "bot de trading" → TradeVision branch

**PHASE 2 — Contextual Demo**
- WordPress → Ask industry, recommend Divi structure + estimated timeline
- SaaS → Mention ContaPro or DentalPro as a real case, ask expected users and what problem it solves
- Automation → Describe a relevant n8n flow example, ask what process they want to eliminate
- TradeVision → Describe the trading bot, ask what exchanges they use

**PHASE 3 — Automatic Estimate** (after 3–4 context messages)
Based on branch, generate a range:
- WordPress landing: $300–$600, 1 week
- WordPress + ecommerce: $600–$1,200, 2 weeks
- SaaS MVP: $1,500–$4,000, 4–8 weeks
- n8n automation: $400–$900, 1–2 weeks
- Custom trading bot: $800–$2,000, 2–4 weeks

Present as: "Based on what you've told me, here's a rough estimate: [range] / [time]. Want me to connect you with Ivan directly?"

**PHASE 4 — Lead Capture**
If user responds affirmatively → ask for their name and email.
Once you have BOTH name AND email confirmed, respond warmly and append this exact block at the very end of your message (no extra newlines before or after the markers):
##LEAD##{"nombre":"NAME","email":"EMAIL","tipo":"PROJECT_TYPE","presupuesto":"ESTIMATE_RANGE","resumen":"Two-line summary of what they need and budget."}##`;

function notificarTelegram(lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const msg = `🚀 <b>Nuevo lead — ivanchoweb.com</b>\n\n` +
    `👤 <b>Nombre:</b> ${lead.nombre}\n` +
    `📧 <b>Email:</b> ${lead.email}\n` +
    `💼 <b>Proyecto:</b> ${lead.tipo_proyecto}\n` +
    `💰 <b>Presupuesto:</b> ${lead.presupuesto_estimado}\n\n` +
    `📝 ${lead.resumen}`;

  const url = `https://api.telegram.org/bot${token}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}&parse_mode=HTML`;
  https.get(url, (res) => { res.resume(); }).on('error', (err) => {
    console.error('Telegram error:', err.message);
  });
}

async function guardarLead(lead) {
  try {
    await db.query(
      `INSERT INTO leads (nombre, email, tipo_proyecto, presupuesto_estimado, resumen)
       VALUES ($1, $2, $3, $4, $5)`,
      [lead.nombre, lead.email, lead.tipo_proyecto, lead.presupuesto_estimado, lead.resumen]
    );
  } catch (err) {
    console.error('DB lead error:', err.message);
  }
}

app.use(express.json());

// Block sensitive files from being served as static assets
const BLOCKED_PATHS = [
  /^\/.+\.bak/,           // backup HTML files
  /\.sql$/,               // database dumps
  /\.pdf$/,               // personal/document files
  /^\/server\.js$/,       // source code
  /^\/package(-lock)?\.json$/, // package manifests
  /^\/node_modules\//,    // dependencies
  /^\/leads\./,           // lead data files
  /^\/.env/,              // env files (belt-and-suspenders)
  /^\/\.git\//,           // git repo
];
app.use((req, res, next) => {
  if (BLOCKED_PATHS.some(pattern => pattern.test(req.path))) {
    return res.status(404).end();
  }
  next();
});

// Redirect old /sobre-ivan/ and /about/ to homepage
app.get(['/sobre-ivan', '/sobre-ivan/', '/about', '/about/'], (req, res) => {
  res.redirect(301, '/');
});

app.use(express.static(path.join(__dirname)));

app.post('/api/chat', async (req, res) => {
  const { messages, model = 'claude-sonnet-4-6', max_tokens = 600 } = req.body;

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens, system: SYSTEM_PROMPT, messages })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();
    let text = (data.content || []).map(b => b.text || '').join('');

    // Detect and extract lead marker
    const leadMatch = text.match(/##LEAD##(\{.*?\})##/s);
    if (leadMatch) {
      try {
        const parsed = JSON.parse(leadMatch[1]);
        const lead = {
          nombre: parsed.nombre,
          email: parsed.email,
          tipo_proyecto: parsed.tipo,
          presupuesto_estimado: parsed.presupuesto,
          resumen: parsed.resumen
        };
        await guardarLead(lead);
        notificarTelegram(lead);
      } catch (e) {
        console.error('Lead parse error:', e.message);
      }
      // Strip marker from visible response
      text = text.replace(/##LEAD##.*?##/s, '').trim();
    }

    res.json({ response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`ivanchoweb running on port ${PORT}`));
