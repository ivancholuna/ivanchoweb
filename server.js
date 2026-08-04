require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const path = require('path');
const https = require('https');
const { Pool } = require('pg');
const { publishPost } = require('./blog-generator');

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
    const result = await db.query(
      `INSERT INTO leads (nombre, email, contacto, tipo_proyecto, presupuesto_estimado, resumen, origen, mensaje_inicial, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'nuevo') RETURNING id`,
      [lead.nombre, lead.email, lead.contacto || lead.email,
       lead.tipo_proyecto, lead.presupuesto_estimado, lead.resumen,
       lead.origen || 'chat_widget', lead.mensaje_inicial || null]
    );
    return result.rows[0].id;
  } catch (err) {
    console.error('DB lead error:', err.message);
    return null;
  }
}

async function dispararWebhookN8n(leadId, lead) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: leadId, nombre: lead.nombre,
        contacto: lead.contacto || lead.email, email: lead.email,
        origen: lead.origen || 'chat_widget',
        tipo_proyecto: lead.tipo_proyecto,
        presupuesto_estimado: lead.presupuesto_estimado,
        resumen: lead.resumen, mensaje_inicial: lead.mensaje_inicial || null
      })
    });
  } catch (err) {
    console.error('n8n webhook error:', err.message);
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

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  const { nombre, contacto, mensaje } = req.body;
  if (!nombre || !contacto) {
    return res.status(400).json({ error: 'nombre y contacto son requeridos' });
  }
  const lead = {
    nombre, email: contacto.includes('@') ? contacto : null, contacto,
    tipo_proyecto: 'consulta_directa', presupuesto_estimado: 'por definir',
    resumen: mensaje || '(sin mensaje)', origen: 'form', mensaje_inicial: mensaje || null
  };
  const leadId = await guardarLead(lead);
  notificarTelegram(lead);
  if (leadId) dispararWebhookN8n(leadId, lead);
  res.json({ ok: true, message: '¡Gracias! Me pondré en contacto pronto.' });
});

// Internal API para n8n (requiere x-api-key)
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY || '';
function requireApiKey(req, res, next) {
  if (N8N_API_KEY && req.headers['x-api-key'] !== N8N_API_KEY) return res.status(401).end();
  next();
}

app.get('/api/leads/:id', requireApiKey, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, estado, nombre, contacto, origen FROM leads WHERE id = $1', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const ESTADOS_VALIDOS = ['nuevo','contactado','calificado','cerrado','perdido','frio'];
app.patch('/api/leads/:id/estado', requireApiKey, async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS_VALIDOS.includes(estado)) return res.status(400).json({ error: 'estado inválido' });
  try {
    await db.query(
      'UPDATE leads SET estado = $1, fecha_ultimo_contacto = NOW() WHERE id = $2', [estado, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
        const leadId = await guardarLead(lead);
        notificarTelegram(lead);
        if (leadId) dispararWebhookN8n(leadId, lead);
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

// ── BLOG CMS (protegido con API key) ────────────────────────────────────────

// Tópicos publicados — para que n8n evite repetir ángulos
app.get('/api/blog/topics', requireApiKey, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT slug, pilar_tematico, titulo_en FROM blog_posts WHERE estado = 'publicado' ORDER BY fecha_publicacion DESC"
    );
    res.json({ published: rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Guardar borrador (llamado por n8n tras generar con Claude)
app.post('/api/blog/draft', requireApiKey, async (req, res) => {
  const { slug, pilar_tematico, titulo_es, meta_description_es, cuerpo_es,
          titulo_en, meta_description_en, cuerpo_en,
          tag_en, tag_es, tag_color, read_time_mins, n8n_execution_id } = req.body;
  if (!slug || !titulo_es || !titulo_en) {
    return res.status(400).json({ error: 'slug, titulo_es y titulo_en son requeridos' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO blog_posts
        (slug, pilar_tematico, titulo_es, meta_description_es, cuerpo_es,
         titulo_en, meta_description_en, cuerpo_en,
         tag_en, tag_es, tag_color, read_time_mins, n8n_execution_id, estado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pendiente_aprobacion')
       ON CONFLICT (slug) DO UPDATE SET
         titulo_es=$3, meta_description_es=$4, cuerpo_es=$5,
         titulo_en=$6, meta_description_en=$7, cuerpo_en=$8,
         tag_en=$9, tag_es=$10, tag_color=$11, read_time_mins=$12,
         n8n_execution_id=$13, estado='pendiente_aprobacion'
       RETURNING id`,
      [slug, pilar_tematico, titulo_es, meta_description_es, cuerpo_es,
       titulo_en, meta_description_en, cuerpo_en,
       tag_en || 'Development', tag_es || 'Desarrollo',
       tag_color || 'indigo', read_time_mins || 8, n8n_execution_id]
    );
    res.json({ ok: true, id: rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Publicar post aprobado — genera HTML y actualiza índice
app.post('/api/blog/publish', requireApiKey, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id es requerido' });
  try {
    const { rows } = await db.query('SELECT * FROM blog_posts WHERE id=$1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'post no encontrado' });
    const post = rows[0];
    post.fecha_publicacion = new Date();
    publishPost(post);
    await db.query(
      "UPDATE blog_posts SET estado='publicado', fecha_publicacion=NOW(), aprobado_at=NOW() WHERE id=$1",
      [id]
    );
    res.json({ ok: true, url: `https://ivanchoweb.com/blog/${post.slug}/` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rechazar borrador
app.post('/api/blog/reject', requireApiKey, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id es requerido' });
  try {
    await db.query("UPDATE blog_posts SET estado='rechazado' WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, () => console.log(`ivanchoweb running on port ${PORT}`));
