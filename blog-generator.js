'use strict';
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname);
const BLOG_DIR = path.join(BASE, 'blog');
const BLOG_INDEX = path.join(BLOG_DIR, 'index.html');
const LLMS_TXT = path.join(BASE, 'llms.txt');

const ACCENT_COLORS = {
  indigo: { border: '#4F46E5', tagBg: '#EEF0FF', tagColor: '#4F46E5' },
  teal:   { border: '#0D9488', tagBg: '#F0FDFA', tagColor: '#0D9488' },
  orange: { border: '#F59E0B', tagBg: '#FFFBEB', tagColor: '#D97706' },
  red:    { border: '#EF4444', tagBg: '#FEF2F2', tagColor: '#EF4444' },
  green:  { border: '#059669', tagBg: '#F0FDF4', tagColor: '#059669' },
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function generateArticleHtml(post) {
  const color = ACCENT_COLORS[post.tag_color] || ACCENT_COLORS.indigo;
  const pubDate = post.fecha_publicacion
    ? new Date(post.fecha_publicacion).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const pubDateEn = new Date(pubDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const pubDateEs = new Date(pubDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const readEn = `${post.read_time_mins} min read`;
  const readEs = `${post.read_time_mins} min de lectura`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(post.titulo_en)} | IVANCHOWEB</title>
  <meta name="description" content="${escapeHtml(post.meta_description_en)}">
  <meta name="author" content="Ivan Luna">
  <meta property="og:site_name" content="IVANCHOWEB">
  <meta property="og:title" content="${escapeHtml(post.titulo_en)} | IVANCHOWEB">
  <meta property="og:description" content="${escapeHtml(post.meta_description_en)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://ivanchoweb.com/blog/${post.slug}/">
  <link rel="canonical" href="https://ivanchoweb.com/blog/${post.slug}/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeHtml(post.titulo_en)}",
    "description": "${escapeHtml(post.meta_description_en)}",
    "url": "https://ivanchoweb.com/blog/${post.slug}/",
    "datePublished": "${pubDate}",
    "author": { "@type": "Person", "name": "Ivan Luna", "url": "https://ivanchoweb.com" },
    "publisher": { "@type": "Organization", "name": "IVANCHOWEB", "url": "https://ivanchoweb.com" }
  }
  <\/script>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://ivanchoweb.com/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://ivanchoweb.com/blog/" },
      { "@type": "ListItem", "position": 3, "name": "${escapeHtml(post.titulo_en)}", "item": "https://ivanchoweb.com/blog/${post.slug}/" }
    ]
  }
  <\/script>

  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZY32K4WMRR"><\/script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-ZY32K4WMRR');
  <\/script>

  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root { --bg:#fff; --text:#0A0A0A; --text-muted:#525252; --border:#E5E5E5; --surface:#F8F8F8; --nav-bg:rgba(255,255,255,0.88); --indigo:${color.border}; --indigo-hover:${color.border}cc; }
    body.dark { --bg:#0A0A0A; --text:#F0F0F0; --text-muted:#A3A3A3; --border:#2A2A2A; --surface:#111; --nav-bg:rgba(10,10,10,0.92); }
    body { font-family: 'Inter', -apple-system, sans-serif; background: var(--bg); color: var(--text); transition: background .25s, color .25s; line-height: 1.7; }
    a { color: var(--indigo); text-decoration: none; }
    a:hover { text-decoration: underline; }
    nav { position: sticky; top: 0; z-index: 100; background: var(--nav-bg); backdrop-filter: blur(12px); border-bottom: 1px solid var(--border); transition: background .25s, border-color .25s; }
    .nav-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; transition: height 300ms ease, padding 300ms ease; }
    .nav-logo-img { height: 40px; width: auto; display: block; transition: height 300ms ease; }
    nav.scrolled .nav-logo-img { height: 32px; }
    nav.scrolled .nav-inner { height: 48px; }
    .nav-right { display: flex; align-items: center; gap: 28px; }
    .nav-links { display: flex; gap: 28px; align-items: center; }
    .nav-links a { font-size: 14px; font-weight: 500; color: var(--text-muted); transition: color .2s; }
    .nav-links a:hover, .nav-links a.active { color: var(--text); }
    .nav-controls { display: flex; align-items: center; gap: 8px; }
    .btn-lang { border: 1px solid var(--border); background: transparent; color: var(--text); font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 100px; cursor: pointer; font-family: inherit; letter-spacing: 0.03em; transition: border-color .2s, color .2s; }
    .btn-lang:hover { border-color: var(--indigo); color: var(--indigo); }
    .btn-theme { border: none; background: transparent; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; padding: 4px; border-radius: 6px; transition: color .2s; }
    .btn-theme:hover { color: var(--text); }
    .icon-sun, .icon-moon { display: none; }
    body:not(.dark) .icon-moon { display: block; }
    body.dark .icon-sun { display: block; }
    .nav-cta { background: var(--indigo); color: #fff !important; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; transition: background .2s; }
    .nav-cta:hover { background: var(--indigo-hover) !important; color: #fff !important; text-decoration: none; }
    .article-wrap { max-width: 720px; margin: 0 auto; padding: 56px 24px 80px; }
    .breadcrumb { font-size: 13px; color: #A3A3A3; margin-bottom: 32px; }
    .breadcrumb a { color: #A3A3A3; text-decoration: none; }
    .breadcrumb a:hover { color: var(--indigo); }
    .breadcrumb span { margin: 0 6px; }
    .article-tag { display: inline-block; background: ${color.tagBg}; color: ${color.tagColor}; font-size: 12px; font-weight: 600; padding: 4px 12px; border-radius: 20px; letter-spacing: .5px; text-transform: uppercase; margin-bottom: 20px; }
    .article-wrap h1 { font-size: clamp(28px, 4vw, 42px); font-weight: 700; line-height: 1.2; letter-spacing: -1px; margin-bottom: 20px; }
    .article-meta { display: flex; align-items: center; gap: 16px; padding-bottom: 32px; border-bottom: 1px solid #E5E5E5; margin-bottom: 40px; flex-wrap: wrap; }
    .meta-author { display: flex; align-items: center; gap: 10px; }
    .meta-avatar { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg,${color.border},${color.border}99); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    .meta-author-info { font-size: 14px; }
    .meta-author-info strong { display: block; color: #0A0A0A; font-weight: 600; }
    .meta-author-info span { color: #525252; }
    .meta-divider { color: #E5E5E5; }
    .meta-date { font-size: 13px; color: #525252; }
    .meta-read { font-size: 13px; color: #525252; }
    .article-body { font-size: 17px; color: #1a1a1a; overflow-wrap: break-word; word-break: break-word; }
    .article-body p { margin-bottom: 24px; }
    .article-body h2 { font-size: 26px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.3; margin: 48px 0 16px; color: #0A0A0A; }
    .article-body h3 { font-size: 19px; font-weight: 600; margin: 32px 0 12px; color: #0A0A0A; }
    .article-body ul, .article-body ol { padding-left: 24px; margin-bottom: 24px; }
    .article-body li { margin-bottom: 8px; }
    .article-body strong { font-weight: 600; color: #0A0A0A; }
    .article-body code { background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 4px; padding: 2px 7px; font-size: 14px; font-family: 'SF Mono', 'Fira Code', monospace; color: var(--indigo); }
    .article-body blockquote { border-left: 3px solid var(--indigo); padding: 12px 20px; background: #F8F8F8; margin: 32px 0; border-radius: 0 8px 8px 0; }
    .article-body blockquote p { margin: 0; color: #525252; font-style: italic; }
    .cta-box { background: linear-gradient(135deg,${color.border},${color.border}bb); border-radius: 20px; padding: 48px 40px; text-align: center; margin: 64px 0 0; color: #fff; }
    .cta-box h2 { font-size: 28px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.5px; }
    .cta-box p { font-size: 16px; opacity: .85; margin-bottom: 28px; max-width: 460px; margin-left: auto; margin-right: auto; }
    .cta-btn { display: inline-block; background: #fff; color: ${color.border}; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 10px; transition: transform .2s, box-shadow .2s; }
    .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); text-decoration: none; }
    footer { border-top: 1px solid var(--border); background: var(--bg); padding: 32px 24px; margin-top: 80px; transition: background .25s, border-color .25s; }
    .footer-inner { max-width: 1240px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .footer-copy { font-size: 13px; color: var(--text-muted); }
    .footer-links { display: flex; gap: 18px; }
    .footer-links a { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; transition: color .2s; }
    .footer-links a:hover { color: var(--text); }
    .lang-block { display: none; }
    .lang-block.active { display: block; }
    @media (max-width: 640px) {
      body { overflow-x: hidden; }
      .nav-links { display: none; }
      .nav-controls .btn-lang { display: none; }
      .cta-box { padding: 32px 20px; }
    }
  </style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <a href="https://ivanchoweb.com">
      <img src="/assets/logo.webp" alt="IVANCHOWEB" class="nav-logo-img" width="auto" height="40" loading="eager" fetchpriority="high">
    </a>
    <div class="nav-right">
      <div class="nav-links">
        <a href="https://ivanchoweb.com/#servicios" data-en="Services" data-es="Servicios">Services</a>
        <a href="https://ivanchoweb.com/#portafolio" data-en="Work" data-es="Trabajo">Work</a>
        <a href="/blog/" class="active">Blog</a>
        <a href="https://ivanchoweb.com/#about" data-en="About" data-es="Sobre mí">About</a>
      </div>
      <div class="nav-controls">
        <button class="btn-lang" id="btnLang" aria-label="Switch language">EN/ES</button>
        <button class="btn-theme" id="btnTheme" aria-label="Toggle dark mode">
          <svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          <svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
        </button>
        <a href="https://cal.com/ivancholuna/discovery" target="_blank" class="nav-cta" data-en="Let's Talk" data-es="Hablemos">Let's Talk</a>
      </div>
    </div>
  </div>
</nav>

<article class="article-wrap">

  <div class="breadcrumb">
    <a href="https://ivanchoweb.com" data-en="Home" data-es="Inicio">Home</a>
    <span>›</span>
    <a href="/blog/">Blog</a>
    <span>›</span>
    <span data-en="${escapeHtml(post.titulo_en)}" data-es="${escapeHtml(post.titulo_es)}">${escapeHtml(post.titulo_en)}</span>
  </div>

  <span class="article-tag" data-en="${escapeHtml(post.tag_en)}" data-es="${escapeHtml(post.tag_es)}">${escapeHtml(post.tag_en)}</span>

  <h1 data-en="${escapeHtml(post.titulo_en)}" data-es="${escapeHtml(post.titulo_es)}">${escapeHtml(post.titulo_en)}</h1>

  <div class="article-meta">
    <div class="meta-author">
      <div class="meta-avatar">IL</div>
      <div class="meta-author-info">
        <strong>Ivan Luna</strong>
        <span data-en="Full-Stack Developer &amp; Accountant, IVANCHOWEB" data-es="Desarrollador Full-Stack &amp; Contador, IVANCHOWEB">Full-Stack Developer &amp; Accountant, IVANCHOWEB</span>
      </div>
    </div>
    <span class="meta-divider">·</span>
    <span class="meta-date" data-en="${pubDateEn}" data-es="${pubDateEs}">${pubDateEn}</span>
    <span class="meta-divider">·</span>
    <span class="meta-read" data-en="${readEn}" data-es="${readEs}">${readEn}</span>
  </div>

  <div class="article-body">

    <div class="lang-block active" id="body-en">
${post.cuerpo_en}
    </div>

    <div class="lang-block" id="body-es">
${post.cuerpo_es}
    </div>

    <div class="cta-box">
      <h2 data-en="Ready to build your project?" data-es="¿Listo para construir tu proyecto?">Ready to build your project?</h2>
      <p data-en="Let's talk about what you need — I'll give you a real estimate, timeline, and a clear plan." data-es="Cuéntame qué necesitas — te doy un presupuesto real, plazo y un plan claro.">Let's talk about what you need — I'll give you a real estimate, timeline, and a clear plan.</p>
      <a href="https://ivanchoweb.com/#contacto" class="cta-btn" data-en="Let's Talk About Your Project →" data-es="Hablemos de tu proyecto →">Let's Talk About Your Project →</a>
    </div>

  </div>
</article>

<footer>
  <div class="footer-inner">
    <span class="footer-copy" data-en="© 2026 IVANCHOWEB. All rights reserved." data-es="© 2026 IVANCHOWEB. Todos los derechos reservados.">© 2026 IVANCHOWEB. All rights reserved.</span>
    <div class="footer-links">
      <a href="https://www.upwork.com/freelancers/~01bbc3829851e3233e" target="_blank">Upwork</a>
      <a href="https://www.instagram.com/ivanchoweb/" target="_blank">Instagram</a>
      <a href="https://github.com/ivancholuna" target="_blank">GitHub</a>
    </div>
  </div>
</footer>

<script>
(function(){
  var body = document.body;
  var saved = localStorage.getItem('iw-theme');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (saved ? saved === 'dark' : prefersDark) body.classList.add('dark');
  document.getElementById('btnTheme').addEventListener('click', function() {
    localStorage.setItem('iw-theme', body.classList.toggle('dark') ? 'dark' : 'light');
  });
  var btnLang = document.getElementById('btnLang');
  var lang = localStorage.getItem('iw-blog-lang') || 'en';
  function applyLang(l) {
    document.querySelectorAll('[data-en][data-es]').forEach(function(el) {
      el.innerHTML = el.getAttribute('data-' + l);
    });
    document.getElementById('body-en').classList.toggle('active', l === 'en');
    document.getElementById('body-es').classList.toggle('active', l === 'es');
    btnLang.innerHTML = l === 'en' ? '<strong>EN<\/strong>/ES' : 'EN/<strong>ES<\/strong>';
    localStorage.setItem('iw-blog-lang', l);
    lang = l;
  }
  applyLang(lang);
  btnLang.addEventListener('click', function() { applyLang(lang === 'en' ? 'es' : 'en'); });
  window.addEventListener('scroll', function() {
    document.querySelector('nav').classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();
<\/script>
</body>
</html>`;
}

function generateCardHtml(post) {
  const color = ACCENT_COLORS[post.tag_color] || ACCENT_COLORS.indigo;
  const accentClass = `card-accent-${post.tag_color || 'indigo'}`;
  const tagStyle = post.tag_color !== 'indigo'
    ? ` style="background:${color.tagBg};color:${color.tagColor};"`
    : '';
  const readEn = `${post.read_time_mins} min read`;
  const readEs = `${post.read_time_mins} min de lectura`;

  return `
  <!-- ${escapeHtml(post.titulo_en)} — bilingual -->
  <div class="card ${accentClass}" data-href="/blog/${post.slug}/" data-bilingual>
    <img loading="lazy" decoding="async" width="1200" height="420" src="/assets/blog/${post.slug}.webp" onerror="this.style.display='none'" alt="${escapeHtml(post.titulo_en)}" style="width:100%; height:200px; object-fit:cover; border-radius:12px 12px 0 0;">
    <div class="card-tag-bar">
      <span class="card-tag"${tagStyle} data-en="${escapeHtml(post.tag_en)}" data-es="${escapeHtml(post.tag_es)}">${escapeHtml(post.tag_en)}</span>
    </div>
    <div class="card-body">
      <h2
        data-en="${escapeHtml(post.titulo_en)}"
        data-es="${escapeHtml(post.titulo_es)}">
        ${escapeHtml(post.titulo_en)}
      </h2>
      <p
        data-en="${escapeHtml(post.meta_description_en)}"
        data-es="${escapeHtml(post.meta_description_es)}">
        ${escapeHtml(post.meta_description_en)}
      </p>
      <div class="card-meta">
        <span class="card-author">By <strong>Ivan Luna</strong> · <span class="card-readtime" data-en="${readEn}" data-es="${readEs}">${readEn}</span></span>
        <a href="/blog/${post.slug}/" class="card-read"
           data-en-href="/blog/${post.slug}/" data-en-text="Read →"
           data-es-href="/blog/${post.slug}/" data-es-text="Leer →">Read →</a>
      </div>
    </div>
  </div>`;
}

function updateBlogIndex(post) {
  let html = fs.readFileSync(BLOG_INDEX, 'utf8');
  const marker = '<!-- SaaS MVP — bilingual -->';
  const card = generateCardHtml(post) + '\n\n  ' + marker;
  html = html.replace(marker, card);
  fs.writeFileSync(BLOG_INDEX, html, 'utf8');
}

function updateLlmsTxt(post) {
  let content = fs.readFileSync(LLMS_TXT, 'utf8');
  const blogLine = `- [Blog](https://ivanchoweb.com/blog): Artículos sobre desarrollo web, automatización e IA`;
  const newLine = `- [${post.titulo_en}](https://ivanchoweb.com/blog/${post.slug}/): ${post.meta_description_en}`;
  if (!content.includes(newLine)) {
    content = content.replace(blogLine, blogLine + '\n' + newLine);
    fs.writeFileSync(LLMS_TXT, content, 'utf8');
  }
}

function publishPost(post) {
  const dir = path.join(BLOG_DIR, post.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), generateArticleHtml(post), 'utf8');
  updateBlogIndex(post);
  updateLlmsTxt(post);
}

module.exports = { publishPost, generateArticleHtml, generateCardHtml };
