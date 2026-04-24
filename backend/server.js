require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./src/routes/auth.routes');
const gpuRoutes = require('./src/routes/gpu.routes');
const modelsRoutes = require('./src/routes/models.routes');
const insightsRoutes = require('./src/routes/insights.routes');
const backupsRoutes = require('./src/routes/backups.routes');
const { errorHandler } = require('./src/middleware/errorHandler.middleware');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = path.join(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const HAS_DIST = fs.existsSync(DIST_DIR);
const isProduction = process.env.NODE_ENV === 'production';
const authLimiterWindowMs = isProduction ? 15 * 60 * 1000 : 60 * 1000;
const authLimiterMax = isProduction ? 5 : 20;
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://gpubenchmark.jon-dev.fr';
const DEFAULT_TITLE = 'GPU LLM Benchmark 2026';
const DEFAULT_DESCRIPTION = 'Benchmark GPU pour LLM open source : comparez les cartes graphiques, les vendeurs et les performances mesurées pour choisir le bon matériel IA.';
const DEFAULT_OG_IMAGE = `${PUBLIC_SITE_URL}/og-image.svg`;

const scriptSrc = ["'self'"];
const styleSrc = ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"];
const connectSrc = ["'self'"];

if (!isProduction) {
  scriptSrc.push("'unsafe-inline'", "http://localhost:5173");
  styleSrc.push("http://localhost:5173");
  connectSrc.push("http://localhost:5173", "ws://localhost:5173");
}

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc,
      styleSrc,
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc,
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.'
    });
  }
});

const authLimiter = rateLimit({
  windowMs: authLimiterWindowMs,
  max: authLimiterMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.max(1, Math.ceil((req.rateLimit.resetTime - new Date()) / 1000));

    res.status(options.statusCode).json({
      error: isProduction
        ? 'Too many login attempts from this IP, please try again later.'
        : 'Too many login attempts. Please wait a moment and try again.',
      retry_after_seconds: retryAfterSeconds
    });
  }
});

app.use('/api/', limiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

function slugifyGpuName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value) {
  return new Intl.NumberFormat('fr-FR').format(Number(value) || 0);
}

function formatPrice(value) {
  const amount = Number(value) || 0;
  if (amount <= 0) {
    return 'Non disponible';
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getHtmlTemplate() {
  const sourcePath = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT_DIR, 'index.html');
  return fs.readFileSync(sourcePath, 'utf8');
}

function injectStaticContent(html, staticContent) {
  return html.replace(
    /<div id="seo-static-content"><\/div>/,
    `<div id="seo-static-content">${staticContent || ''}</div>`
  );
}

function renderSeoHtml({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl = `${PUBLIC_SITE_URL}/`,
  ogImage = DEFAULT_OG_IMAGE,
  robots = 'index, follow',
  jsonLd,
  staticContent = '',
}) {
  let html = getHtmlTemplate();

  html = html.replace(/<title>.*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta name="robots"[\s\S]*?\/>/, `<meta name="robots" content="${escapeHtml(robots)}" />`);
  html = html.replace(/<link rel="canonical"[\s\S]*?>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  html = html.replace(/<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  html = html.replace(/<meta property="og:image"[\s\S]*?\/>/, `<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
  html = html.replace(/<meta name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta name="twitter:image"[\s\S]*?\/>/, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`
  );
  html = injectStaticContent(html, staticContent);

  return html;
}

function buildHomeStaticContent() {
  return `
    <section>
      <h1>GPU LLM Benchmark</h1>
      <p>Comparez les GPU pour l'inference LLM open source, visualisez les benchmarks disponibles, le catalogue public, le calculateur et le suivi des prix.</p>
    </section>
    <section>
      <h2>Ce que propose le site</h2>
      <ul>
        <li>Catalogue GPU par vendor avec filtres</li>
        <li>Benchmarks reels par modele LLM</li>
        <li>Historique des prix neuf et occasion</li>
        <li>Calculateur analytique pour l'inference locale</li>
      </ul>
    </section>
  `;
}

function buildGpuStaticContent(gpu) {
  const benchmarks = (gpu.benchmark_results || [])
    .sort((left, right) => right.tokens_per_second - left.tokens_per_second)
    .slice(0, 6)
    .map((benchmark) => `
      <li>
        <strong>${escapeHtml(benchmark.model_name)}</strong> :
        ${escapeHtml(formatNumber(benchmark.tokens_per_second))} t/s
        ${benchmark.precision ? ` en ${escapeHtml(benchmark.precision)}` : ''}
        ${benchmark.context_size ? ` avec contexte ${escapeHtml(formatNumber(benchmark.context_size))}` : ''}
      </li>
    `)
    .join('');

  return `
    <section>
      <h1>${escapeHtml(gpu.name)}</h1>
      <p>${escapeHtml(gpu.vendor)} ${escapeHtml(gpu.architecture)} avec ${escapeHtml(formatNumber(gpu.vram))} Go de VRAM, ${escapeHtml(formatNumber(gpu.bandwidth))} Go/s de bande passante et un score catalogue de ${escapeHtml(formatNumber(gpu.score))}/100.</p>
    </section>
    <section>
      <h2>Repères rapides</h2>
      <ul>
        <li>Vendor : ${escapeHtml(gpu.vendor)}</li>
        <li>Architecture : ${escapeHtml(gpu.architecture)}</li>
        <li>VRAM : ${escapeHtml(formatNumber(gpu.vram))} Go</li>
        <li>Bande passante : ${escapeHtml(formatNumber(gpu.bandwidth))} Go/s</li>
        <li>Prix neuf : ${escapeHtml(formatPrice(gpu.price_new_value))}</li>
        <li>Prix occasion : ${escapeHtml(formatPrice(gpu.price_used_value))}</li>
      </ul>
    </section>
    <section>
      <h2>Benchmarks LLM disponibles</h2>
      ${benchmarks ? `<ul>${benchmarks}</ul>` : '<p>Aucun benchmark LLM n&apos;est encore disponible pour cette carte.</p>'}
    </section>
    <section>
      <p><a href="/">Retour au benchmark GPU LLM</a></p>
    </section>
  `;
}

function getHomeJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'GPU LLM Benchmark',
    url: `${PUBLIC_SITE_URL}/`,
    description: DEFAULT_DESCRIPTION,
    inLanguage: 'fr',
    publisher: {
      '@type': 'Organization',
      name: 'jon-dev',
      url: 'https://portfolio.jon-dev.fr/',
    },
  };
}

function getGpuJsonLd(gpu, pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: gpu.name,
    brand: gpu.vendor,
    description: `${gpu.name} : benchmarks LLM, repères techniques et suivi des prix sur GPU LLM Benchmark.`,
    url: `${PUBLIC_SITE_URL}${pathName}`,
    image: DEFAULT_OG_IMAGE,
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'VRAM',
        value: `${gpu.vram} Go`,
      },
      {
        '@type': 'PropertyValue',
        name: 'Architecture',
        value: gpu.architecture,
      },
      {
        '@type': 'PropertyValue',
        name: 'Bande passante',
        value: `${gpu.bandwidth} Go/s`,
      },
    ],
  };
}

app.get('/sitemap.xml', (req, res) => {
  try {
    const db = require('./config/database');
    const gpus = db.prepare(`
      SELECT name
      FROM gpu_benchmarks
      ORDER BY name ASC
    `).all();

    const urls = [
      {
        loc: `${PUBLIC_SITE_URL}/`,
        changefreq: 'weekly',
        priority: '1.0',
      },
      ...gpus.map((gpu) => ({
        loc: `${PUBLIC_SITE_URL}/gpu/${slugifyGpuName(gpu.name)}`,
        changefreq: 'weekly',
        priority: '0.8',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>
    <loc>${entry.loc}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.type('application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap.xml:', error);
    res.status(500).type('application/xml').send('<?xml version="1.0" encoding="UTF-8"?><error />');
  }
});

if (HAS_DIST) {
  app.use(express.static(DIST_DIR, { index: false }));
}

app.get(['/admin', '/admin/*'], (req, res) => {
  const adminEntry = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT_DIR, 'index.html');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  res.sendFile(adminEntry);
});

app.get(['/gpu/:slug', '/gpu/:slug/*'], (req, res) => {
  try {
    const db = require('./config/database');
    const gpus = db.prepare(`
      SELECT *
      FROM gpu_benchmarks
      ORDER BY score DESC, name ASC
    `).all();
    const gpu = gpus.find((entry) => slugifyGpuName(entry.name) === req.params.slug);

    if (!gpu) {
      res.status(404).send(renderSeoHtml({
        title: 'GPU introuvable | GPU LLM Benchmark',
        description: 'La fiche GPU demandée est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>GPU introuvable</h1>
            <p>La carte graphique demandée n'existe pas ou n'est plus disponible.</p>
            <p><a href="/">Retour au catalogue public</a></p>
          </section>
        `,
      }));
      return;
    }

    const benchmarkResults = db.prepare(`
      SELECT br.*, lm.name AS model_name
      FROM benchmark_results br
      JOIN llm_models lm ON lm.id = br.llm_model_id
      WHERE br.gpu_id = ?
      ORDER BY br.tokens_per_second DESC
    `).all(gpu.id);

    res.send(renderSeoHtml({
      title: `${gpu.name} | Benchmark GPU LLM`,
      description: `${gpu.name} (${gpu.vendor}) : VRAM, bande passante, score, benchmarks LLM et historique de prix neuf et occasion.`,
      canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
      jsonLd: getGpuJsonLd(gpu, req.path),
      staticContent: buildGpuStaticContent({
        ...gpu,
        benchmark_results: benchmarkResults,
      }),
    }));
  } catch (error) {
    console.error('Error serving GPU SEO page:', error);
    res.status(500).send(renderSeoHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${PUBLIC_SITE_URL}/`,
      jsonLd: getHomeJsonLd(),
      staticContent: buildHomeStaticContent(),
    }));
  }
});

app.get('/', (req, res) => {
  res.send(renderSeoHtml({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    canonicalUrl: `${PUBLIC_SITE_URL}/`,
    jsonLd: getHomeJsonLd(),
    staticContent: buildHomeStaticContent(),
  }));
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/gpu', gpuRoutes);
app.use('/api/v1/models', modelsRoutes);
app.use('/api/v1/insights', insightsRoutes);
app.use('/api/v1/backups', backupsRoutes);

app.get('/api/v1/stats', (req, res) => {
  try {
    const db = require('./config/database');

    const totalGPUs = db.prepare('SELECT COUNT(*) as count FROM gpu_benchmarks').get().count;
    const vendors = db.prepare('SELECT DISTINCT vendor FROM gpu_benchmarks').all().map(v => v.vendor);
    const topScore = db.prepare('SELECT name, score FROM gpu_benchmarks ORDER BY score DESC LIMIT 1').get();
    const avgScore = db.prepare('SELECT AVG(score) as avg_score FROM gpu_benchmarks').get();

    res.json({
      total_gpus: totalGPUs,
      vendors: vendors,
      top_gpu: topScore,
      average_score: Math.round(avgScore.avg_score || 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

let server = null;

function startServer() {
  if (server) {
    return server;
  }

  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Public frontend: http://localhost:${PORT}/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`API health: http://localhost:${PORT}/api/v1/health`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
};
