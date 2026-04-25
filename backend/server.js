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
const DEFAULT_LASTMOD = new Date().toISOString().split('T')[0];

const scriptSrc = ["'self'"];
const styleSrc = ["'self'", "'unsafe-inline'"];
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
      fontSrc: ["'self'", "data:"],
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

function buildJsonLdScripts(jsonLd) {
  const entries = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
  return entries
    .filter(Boolean)
    .map((entry) => `<script type="application/ld+json">\n${JSON.stringify(entry, null, 2)}\n</script>`)
    .join('\n');
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
  html = html.replace(/<meta[^>]*name="description"[^>]*>/, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta[^>]*name="robots"[^>]*>/, `<meta name="robots" content="${escapeHtml(robots)}" />`);
  html = html.replace(/<link[^>]*rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`);
  html = html.replace(/<meta[^>]*property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta[^>]*property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta[^>]*property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`);
  html = html.replace(/<meta[^>]*property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeHtml(ogImage)}" />`);
  html = html.replace(/<meta[^>]*name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = html.replace(/<meta[^>]*name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  html = html.replace(/<meta[^>]*name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeHtml(ogImage)}" />`);
  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    buildJsonLdScripts(jsonLd)
  );
  html = injectStaticContent(html, staticContent);

  return html;
}

function buildHomeStaticContent() {
  return `
    <section>
      <h1>GPU LLM Benchmark</h1>
      <p>Choisissez plus facilement un GPU pour vos usages LLM en comparant les performances mesurées, la mémoire disponible et l'écart entre prix neuf et occasion.</p>
    </section>
    <section>
      <h2>Ce que vous pouvez faire ici</h2>
      <ul>
        <li>Comparer les cartes par vendor, VRAM, bande passante et score</li>
        <li>Voir les benchmarks reels par modele LLM</li>
        <li>Suivre l'evolution des prix neuf et occasion</li>
        <li>Estimer un usage local avec le calculateur analytique</li>
      </ul>
    </section>
    <section>
      <h2>Commencer selon votre besoin</h2>
      <ul>
        <li><a href="/guides/choisir-gpu-llm">Lire le guide pour choisir un GPU</a></li>
        <li><a href="/faq">Consulter la FAQ</a></li>
        <li><a href="/vendor/nvidia">Voir les cartes NVIDIA</a></li>
        <li><a href="/vendor/amd">Voir les cartes AMD</a></li>
        <li><a href="/vendor/intel">Voir les cartes Intel</a></li>
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
      <p>${escapeHtml(gpu.vendor)} ${escapeHtml(gpu.architecture)} avec ${escapeHtml(formatNumber(gpu.vram))} Go de VRAM et ${escapeHtml(formatNumber(gpu.bandwidth))} Go/s de bande passante. Cette fiche vous aide a voir rapidement si la carte est credibile pour vos modeles, votre budget et votre type d'usage.</p>
    </section>
    <section>
      <h2>Repères utiles avant d'acheter</h2>
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
      <p><a href="/vendor/${slugifyGpuName(gpu.vendor)}">Comparer avec les autres cartes ${escapeHtml(gpu.vendor)}</a></p>
    </section>
  `;
}

function buildVendorStaticContent(vendor, vendorGpus) {
  const items = vendorGpus
    .slice(0, 10)
    .map((gpu) => `
      <li>
        <a href="/gpu/${slugifyGpuName(gpu.name)}">${escapeHtml(gpu.name)}</a>
        · ${escapeHtml(gpu.architecture)}
        · ${escapeHtml(formatNumber(gpu.vram))} Go VRAM
        · ${escapeHtml(formatNumber(gpu.coverageCount || 0))} benchmark(s)
      </li>
    `)
    .join('');

  return `
    <section>
      <h1>${escapeHtml(vendor)}</h1>
      <p>Retrouvez ici les cartes ${escapeHtml(vendor)} presentes dans le catalogue avec leurs caracteristiques, leurs benchmarks LLM et des repères de prix pour comparer les references les plus interessantes.</p>
    </section>
    <section>
      <h2>Cartes ${escapeHtml(vendor)} dans le catalogue</h2>
      ${items ? `<ul>${items}</ul>` : '<p>Aucune carte disponible pour ce vendor.</p>'}
    </section>
    <section>
      <p><a href="/guides/choisir-gpu-llm">Lire le guide pour savoir quelle carte ${escapeHtml(vendor)} choisir</a></p>
    </section>
  `;
}

function buildModelStaticContent(model, benchmarks) {
  const items = benchmarks
    .slice(0, 10)
    .map((benchmark) => `
      <li>
        ${escapeHtml(benchmark.gpu_name)}
        · ${escapeHtml(formatNumber(benchmark.tokens_per_second))} t/s
        ${benchmark.precision ? ` en ${escapeHtml(benchmark.precision)}` : ''}
        ${benchmark.context_size ? ` · contexte ${escapeHtml(formatNumber(benchmark.context_size))}` : ''}
      </li>
    `)
    .join('');

  return `
    <section>
      <h1>${escapeHtml(model.name)}</h1>
      <p>Cette page rassemble les resultats observes pour ${escapeHtml(model.name)} afin de voir quelles cartes s'en sortent le mieux, a quel debit, et dans quelles conditions de test.</p>
    </section>
    <section>
      <h2>Ce qu'il faut regarder pour ce modele</h2>
      <ul>
        <li>Paramètres actifs : ${escapeHtml(formatNumber(model.params_billions || 0))}B</li>
        <li>Paramètres totaux : ${escapeHtml(formatNumber(model.total_params_billions || model.params_billions || 0))}B</li>
        <li>Contexte max : ${model.max_context_size ? `${escapeHtml(formatNumber(model.max_context_size))} tokens` : 'Non précisé'}</li>
      </ul>
    </section>
    <section>
      <h2>Benchmarks GPU disponibles</h2>
      ${items ? `<ul>${items}</ul>` : '<p>Aucun benchmark GPU n&apos;est encore disponible pour ce modèle.</p>'}
    </section>
    <section>
      <p><a href="/guides/choisir-gpu-llm">Voir comment choisir une carte adaptee a ce modele</a></p>
    </section>
  `;
}

function buildGuideStaticContent() {
  return `
    <section>
      <h1>Comment choisir un GPU pour LLM</h1>
      <p>Ce guide vous aide a arbitrer entre VRAM, débit reel et budget pour eviter d'acheter une carte mal dimensionnee pour vos modèles et votre usage.</p>
    </section>
    <section>
      <h2>Les critères à prioriser</h2>
      <ul>
        <li>VRAM disponible pour charger le modèle et la taille de contexte visée</li>
        <li>Débit observé en tokens par seconde sur des benchmarks comparables</li>
        <li>Prix neuf et prix occasion analysés séparément</li>
        <li>Différence entre usage local, workstation et déploiement plus lourd</li>
      </ul>
    </section>
    <section>
      <h2>Ou aller ensuite</h2>
      <ul>
        <li><a href="/faq">Lire la FAQ si vous debutez</a></li>
        <li><a href="/vendor/nvidia">Comparer les cartes NVIDIA</a></li>
        <li><a href="/vendor/amd">Comparer les cartes AMD</a></li>
        <li><a href="/vendor/intel">Comparer les cartes Intel</a></li>
      </ul>
    </section>
  `;
}

function buildFaqStaticContent() {
  return `
    <section>
      <h1>FAQ GPU LLM Benchmark</h1>
      <p>Retrouvez ici les réponses aux questions qui reviennent le plus souvent quand on compare des cartes pour faire tourner des LLM en local ou en workstation.</p>
    </section>
    <section>
      <h2>Questions fréquentes</h2>
      <dl>
        <dt>Comment choisir un GPU pour un LLM ?</dt>
        <dd>Il faut d'abord dimensionner la VRAM, puis comparer les benchmarks mesurés et enfin arbitrer avec l'historique de prix.</dd>
        <dt>Le calculateur remplace-t-il un benchmark ?</dt>
        <dd>Non. Le calculateur fournit une estimation analytique, alors que le catalogue affiche des mesures stockées en base.</dd>
        <dt>Pourquoi séparer prix neuf et prix occasion ?</dt>
        <dd>Parce que la compétitivité d'une même carte peut changer fortement selon le marché observé.</dd>
      </dl>
    </section>
    <section>
      <p><a href="/guides/choisir-gpu-llm">Lire le guide si vous hesitez entre plusieurs cartes</a></p>
    </section>
  `;
}

function parseVramComparisonSlug(slug) {
  const match = String(slug || '').match(/^(\d+)go$/i);
  return match ? Number(match[1]) : null;
}

function buildGpuPairComparisonStaticContent(leftGpu, rightGpu, leftBenchmark, rightBenchmark) {
  const throughputGain = leftBenchmark && rightBenchmark
    ? Math.round(((rightBenchmark.tokens_per_second - leftBenchmark.tokens_per_second) / leftBenchmark.tokens_per_second) * 100)
    : null;

  return `
    <section>
      <h1>${escapeHtml(leftGpu.name)} vs ${escapeHtml(rightGpu.name)} pour LLM</h1>
      <p>Ce comparatif est genere a partir des cartes presentes dans la base et des benchmarks disponibles au moment de la visite. Le but est de voir ce que vous gagnez vraiment en memoire, en debit et en souplesse d'usage avant d'arbitrer un achat.</p>
    </section>
    <section>
      <h2>Ce qu'il faut retenir</h2>
      <ul>
        <li>${escapeHtml(leftGpu.name)} : ${escapeHtml(formatNumber(leftGpu.vram))} Go de VRAM, ${escapeHtml(formatNumber(leftGpu.bandwidth))} Go/s, score ${escapeHtml(formatNumber(leftGpu.score))}/100</li>
        <li>${escapeHtml(rightGpu.name)} : ${escapeHtml(formatNumber(rightGpu.vram))} Go de VRAM, ${escapeHtml(formatNumber(rightGpu.bandwidth))} Go/s, score ${escapeHtml(formatNumber(rightGpu.score))}/100</li>
        <li>Benchmark commun : ${leftBenchmark ? escapeHtml(leftBenchmark.model_name) : 'Aucun'} · ${leftBenchmark ? `${escapeHtml(formatNumber(leftBenchmark.tokens_per_second))} t/s` : '—'} vs ${rightBenchmark ? `${escapeHtml(formatNumber(rightBenchmark.tokens_per_second))} t/s` : '—'}</li>
      </ul>
      ${throughputGain !== null ? `<p>Sur le benchmark commun disponible, ${escapeHtml(rightGpu.name)} apporte environ ${escapeHtml(formatNumber(throughputGain))} % de debit supplementaire face a ${escapeHtml(leftGpu.name)}.</p>` : ''}
    </section>
    <section>
      <h2>Quel choix selon votre usage</h2>
      <p>Le bon choix depend du type de modele vise, du niveau de marge memoire souhaite et du prix reel auquel vous trouvez chaque carte. S'il n'existe qu'un faible nombre de benchmarks communs, utilisez aussi les fiches detaillees pour verifier les modeles deja mesures sur chacune.</p>
    </section>
    <section>
      <p><a href="/gpu/${slugifyGpuName(leftGpu.name)}">Voir la fiche ${escapeHtml(leftGpu.name)}</a> · <a href="/gpu/${slugifyGpuName(rightGpu.name)}">Voir la fiche ${escapeHtml(rightGpu.name)}</a></p>
    </section>
  `;
}

function buildVramComparisonStaticContent(targetVram, candidates) {
  const items = candidates
    .map((gpu) => `
      <li>
        <a href="/gpu/${slugifyGpuName(gpu.name)}">${escapeHtml(gpu.name)}</a>
        · ${escapeHtml(formatNumber(gpu.bandwidth))} Go/s
        · ${gpu.price_new_value || gpu.price_used_value || gpu.price_value ? escapeHtml(formatPrice(gpu.price_new_value || gpu.price_used_value || gpu.price_value)) : 'prix non renseigne'}
        · ${escapeHtml(formatNumber(gpu.coverageCount || 0))} benchmark(s)
      </li>
    `)
    .join('');

  return `
    <section>
      <h1>Quel GPU ${escapeHtml(formatNumber(targetVram))} Go choisir pour LLM</h1>
      <p>Cette page regroupe automatiquement les cartes de ${escapeHtml(formatNumber(targetVram))} Go presentes dans la base. C'est utile quand vous voulez comparer des references qui jouent dans la meme categorie memoire, sans melanger des cartes trop differentes.</p>
    </section>
    <section>
      <h2>Cartes ${escapeHtml(formatNumber(targetVram))} Go a comparer</h2>
      <ul>${items}</ul>
    </section>
    <section>
      <h2>Comment choisir entre elles</h2>
      <p>Commencez par repérer les cartes qui ont à la fois un prix renseigné et une couverture benchmark suffisante. Ensuite, ouvrez leurs fiches pour verifier les modeles testes, la precision utilisee et le debit observe avant de decider laquelle correspond le mieux a votre usage.</p>
    </section>
    <section>
      <p><a href="/guides/choisir-gpu-llm">Lire le guide pour choisir une carte ${escapeHtml(formatNumber(targetVram))} Go</a></p>
    </section>
  `;
}

function getKnownGpuPrice(gpu) {
  return Number(gpu.price_used_value) || Number(gpu.price_new_value) || Number(gpu.price_value) || 0;
}

function getSitemapComparisonPairs(gpus) {
  const uniquePairs = new Map();
  const vendors = ['NVIDIA', 'AMD', 'Intel'];

  vendors.forEach((vendor) => {
    const candidates = gpus
      .filter((gpu) => gpu.vendor === vendor && Number(gpu.coverageCount) > 0)
      .sort((left, right) =>
        Number(right.coverageCount) - Number(left.coverageCount) ||
        Number(right.score) - Number(left.score) ||
        left.name.localeCompare(right.name)
      )
      .slice(0, 3);

    for (let index = 0; index < candidates.length - 1; index += 1) {
      const left = candidates[index];
      const right = candidates[index + 1];
      const slug = `${slugifyGpuName(left.name)}-vs-${slugifyGpuName(right.name)}`;

      if (!uniquePairs.has(slug)) {
        uniquePairs.set(slug, slug);
      }
    }
  });

  return [...uniquePairs.values()];
}

function getSitemapUsageSlugs() {
  return ['local-ai', 'budget', 'entreprise'];
}

function buildUsageStaticContent(title, intro, cards, helpText, guideLabel) {
  const items = cards
    .map((gpu) => `
      <li>
        <a href="/gpu/${slugifyGpuName(gpu.name)}">${escapeHtml(gpu.name)}</a>
        · ${escapeHtml(formatNumber(gpu.vram))} Go VRAM
        · ${escapeHtml(formatNumber(gpu.bandwidth))} Go/s
        · ${escapeHtml(formatNumber(gpu.coverageCount || 0))} benchmark(s)
        ${getKnownGpuPrice(gpu) > 0 ? `· ${escapeHtml(formatPrice(getKnownGpuPrice(gpu)))}` : ''}
      </li>
    `)
    .join('');

  return `
    <section>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(intro)}</p>
    </section>
    <section>
      <h2>Cartes a regarder</h2>
      <ul>${items}</ul>
    </section>
    <section>
      <h2>Comment lire cette selection</h2>
      <p>${escapeHtml(helpText)}</p>
    </section>
    <section>
      <p><a href="/guides/choisir-gpu-llm">${escapeHtml(guideLabel)}</a></p>
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

function getVendorJsonLd(vendor, pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${vendor} | GPU LLM Benchmark`,
    url: `${PUBLIC_SITE_URL}${pathName}`,
    description: `Catalogue public ${vendor} : GPU, benchmarks LLM et repères de prix sur GPU LLM Benchmark.`,
    inLanguage: 'fr',
  };
}

function getModelJsonLd(model, pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${model.name} | Benchmark LLM`,
    name: model.name,
    url: `${PUBLIC_SITE_URL}${pathName}`,
    description: `${model.name} : benchmarks GPU disponibles, débit mesuré, contexte max et cartes compatibles sur GPU LLM Benchmark.`,
    inLanguage: 'fr',
  };
}

function getGuideJsonLd(pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Comment choisir un GPU pour LLM',
    name: 'Guide GPU LLM',
    url: `${PUBLIC_SITE_URL}${pathName}`,
    description: "Guide pratique pour choisir un GPU pour l'inference LLM : VRAM, débit mesuré, prix neuf et occasion.",
    inLanguage: 'fr',
  };
}

function getFaqJsonLd(pathName) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${PUBLIC_SITE_URL}${pathName}`,
    inLanguage: 'fr',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Comment choisir un GPU pour un LLM ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Il faut d'abord dimensionner la VRAM, puis comparer les benchmarks mesurés et enfin arbitrer avec l'historique de prix.",
        },
      },
      {
        '@type': 'Question',
        name: 'Le calculateur remplace-t-il un benchmark ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Non. Le calculateur fournit une estimation analytique, alors que le catalogue affiche des mesures stockées en base.",
        },
      },
      {
        '@type': 'Question',
        name: 'Pourquoi séparer prix neuf et prix occasion ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: "Parce que la compétitivité d'une même carte peut changer fortement selon le marché observé.",
        },
      },
    ],
  };
}

function getComparisonJsonLd(title, pathName, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    name: title,
    url: `${PUBLIC_SITE_URL}${pathName}`,
    description,
    inLanguage: 'fr',
  };
}

function getUsageJsonLd(title, pathName, description) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    name: title,
    url: `${PUBLIC_SITE_URL}${pathName}`,
    description,
    inLanguage: 'fr',
  };
}

function getCanonicalRedirectTarget(pathname) {
  if (!pathname || pathname === '/' || !pathname.endsWith('/')) {
    return null;
  }

  const normalizedPath = pathname.replace(/\/+$/, '');
  const redirectablePrefixes = [
    '/gpu/',
    '/vendor/',
    '/model/',
    '/comparatifs/',
    '/usages/',
  ];

  if (
    normalizedPath === '/faq' ||
    normalizedPath === '/guides/choisir-gpu-llm' ||
    redirectablePrefixes.some((prefix) => normalizedPath.startsWith(prefix))
  ) {
    return normalizedPath;
  }

  return null;
}

app.use((req, res, next) => {
  const redirectTarget = getCanonicalRedirectTarget(req.path);

  if (!redirectTarget) {
    next();
    return;
  }

  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(301, `${redirectTarget}${query}`);
});

app.get('/sitemap.xml', (req, res) => {
  try {
    const db = require('./config/database');
    const gpus = db.prepare(`
      SELECT
        name,
        vendor,
        vram,
        score,
        (SELECT COUNT(*) FROM benchmark_results br WHERE br.gpu_id = gpu_benchmarks.id) AS coverageCount
      FROM gpu_benchmarks
      ORDER BY name ASC
    `).all();
    const models = db.prepare(`
      SELECT name
      FROM llm_models
      ORDER BY name ASC
    `).all();
    const vramComparisonPages = db.prepare(`
      SELECT vram, COUNT(*) AS gpuCount
      FROM gpu_benchmarks
      GROUP BY vram
      HAVING COUNT(*) >= 2
      ORDER BY vram ASC
    `).all();
    const gpuComparisonPairs = getSitemapComparisonPairs(gpus);
    const usagePages = getSitemapUsageSlugs();

    const urls = [
      {
        loc: `${PUBLIC_SITE_URL}/`,
        changefreq: 'weekly',
        priority: '1.0',
        lastmod: DEFAULT_LASTMOD,
      },
      {
        loc: `${PUBLIC_SITE_URL}/guides/choisir-gpu-llm`,
        changefreq: 'monthly',
        priority: '0.8',
        lastmod: DEFAULT_LASTMOD,
      },
      {
        loc: `${PUBLIC_SITE_URL}/faq`,
        changefreq: 'monthly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      },
      ...['NVIDIA', 'AMD', 'Intel'].map((vendor) => ({
        loc: `${PUBLIC_SITE_URL}/vendor/${slugifyGpuName(vendor)}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      })),
      ...models.map((model) => ({
        loc: `${PUBLIC_SITE_URL}/model/${slugifyGpuName(model.name)}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      })),
      ...gpus.map((gpu) => ({
        loc: `${PUBLIC_SITE_URL}/gpu/${slugifyGpuName(gpu.name)}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: DEFAULT_LASTMOD,
      })),
      ...vramComparisonPages.map((entry) => ({
        loc: `${PUBLIC_SITE_URL}/comparatifs/vram/${Number(entry.vram)}go`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      })),
      ...gpuComparisonPairs.map((slug) => ({
        loc: `${PUBLIC_SITE_URL}/comparatifs/gpu/${slug}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      })),
      ...usagePages.map((slug) => ({
        loc: `${PUBLIC_SITE_URL}/usages/${slug}`,
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: DEFAULT_LASTMOD,
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${entry.lastmod}</lastmod>
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

app.get(['/vendor/:slug', '/vendor/:slug/*'], (req, res) => {
  try {
    const db = require('./config/database');
    const gpus = db.prepare(`
      SELECT *,
        (SELECT COUNT(*) FROM benchmark_results br WHERE br.gpu_id = gpu_benchmarks.id) AS coverageCount
      FROM gpu_benchmarks
      ORDER BY score DESC, name ASC
    `).all();
    const vendor = ['NVIDIA', 'AMD', 'Intel'].find((entry) => slugifyGpuName(entry) === req.params.slug);

    if (!vendor) {
      res.status(404).send(renderSeoHtml({
        title: 'Vendor introuvable | GPU LLM Benchmark',
        description: 'Le constructeur demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Vendor introuvable</h1>
            <p>Le constructeur demandé n'existe pas dans le catalogue public.</p>
            <p><a href="/">Retour au catalogue public</a></p>
          </section>
        `,
      }));
      return;
    }

    const vendorGpus = gpus.filter((gpu) => gpu.vendor === vendor);

    res.send(renderSeoHtml({
      title: `${vendor} | Catalogue GPU LLM`,
      description: `Catalogue public ${vendor} : cartes graphiques, benchmarks LLM, scores et repères de prix sur GPU LLM Benchmark.`,
      canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
      jsonLd: getVendorJsonLd(vendor, req.path),
      staticContent: buildVendorStaticContent(vendor, vendorGpus),
    }));
  } catch (error) {
    console.error('Error serving vendor SEO page:', error);
    res.status(500).send(renderSeoHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${PUBLIC_SITE_URL}/`,
      jsonLd: getHomeJsonLd(),
      staticContent: buildHomeStaticContent(),
    }));
  }
});

app.get(['/model/:slug', '/model/:slug/*'], (req, res) => {
  try {
    const db = require('./config/database');
    const models = db.prepare(`
      SELECT *
      FROM llm_models
      ORDER BY name ASC
    `).all();
    const model = models.find((entry) => slugifyGpuName(entry.name) === req.params.slug);

    if (!model) {
      res.status(404).send(renderSeoHtml({
        title: 'Modèle introuvable | GPU LLM Benchmark',
        description: 'Le modèle LLM demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Modèle introuvable</h1>
            <p>Le modèle demandé n'existe pas dans le catalogue public.</p>
            <p><a href="/">Retour au catalogue public</a></p>
          </section>
        `,
      }));
      return;
    }

    const benchmarks = db.prepare(`
      SELECT
        br.*,
        g.name AS gpu_name
      FROM benchmark_results br
      JOIN gpu_benchmarks g ON g.id = br.gpu_id
      WHERE br.llm_model_id = ?
      ORDER BY br.tokens_per_second DESC
    `).all(model.id);

    res.send(renderSeoHtml({
      title: `${model.name} | Benchmark LLM`,
      description: `${model.name} : benchmarks GPU disponibles, débit mesuré, contexte max et cartes compatibles sur GPU LLM Benchmark.`,
      canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
      jsonLd: getModelJsonLd(model, req.path),
      staticContent: buildModelStaticContent(model, benchmarks),
    }));
  } catch (error) {
    console.error('Error serving model SEO page:', error);
    res.status(500).send(renderSeoHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${PUBLIC_SITE_URL}/`,
      jsonLd: getHomeJsonLd(),
      staticContent: buildHomeStaticContent(),
    }));
  }
});

app.get(['/guides/choisir-gpu-llm', '/guides/choisir-gpu-llm/'], (req, res) => {
  res.send(renderSeoHtml({
    title: 'Choisir un GPU pour LLM | Guide d\'achat',
    description: "Guide pratique pour choisir un GPU pour l'inference LLM : VRAM, débit mesuré, prix neuf, occasion et lecture du benchmark public.",
    canonicalUrl: `${PUBLIC_SITE_URL}/guides/choisir-gpu-llm`,
    jsonLd: getGuideJsonLd('/guides/choisir-gpu-llm'),
    staticContent: buildGuideStaticContent(),
  }));
});

app.get(['/faq', '/faq/'], (req, res) => {
  res.send(renderSeoHtml({
    title: 'FAQ GPU LLM Benchmark',
    description: 'Questions fréquentes sur le benchmark GPU LLM : choix d’une carte graphique, lecture des benchmarks, prix neuf et occasion, calculateur et pages publiques.',
    canonicalUrl: `${PUBLIC_SITE_URL}/faq`,
    jsonLd: getFaqJsonLd('/faq'),
    staticContent: buildFaqStaticContent(),
  }));
});

app.get(['/comparatifs/gpu/:slug', '/comparatifs/gpu/:slug/'], (req, res) => {
  try {
    const db = require('./config/database');
    const slug = req.params.slug;
    const [leftSlug, rightSlug] = String(slug || '').split('-vs-');

    if (!leftSlug || !rightSlug) {
      res.status(404).send(renderSeoHtml({
        title: 'Comparatif introuvable | GPU LLM Benchmark',
        description: 'Le comparatif demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Comparatif introuvable</h1>
            <p>Le comparatif demandé n'est pas disponible.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    const gpus = db.prepare(`
      SELECT *
      FROM gpu_benchmarks
      ORDER BY name ASC
    `).all();
    const leftGpu = gpus.find((gpu) => slugifyGpuName(gpu.name) === leftSlug);
    const rightGpu = gpus.find((gpu) => slugifyGpuName(gpu.name) === rightSlug);

    if (!leftGpu || !rightGpu) {
      res.status(404).send(renderSeoHtml({
        title: 'Comparatif introuvable | GPU LLM Benchmark',
        description: 'Le comparatif demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Comparatif introuvable</h1>
            <p>Le comparatif demandé n'est pas disponible.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    const benchmarks = db.prepare(`
      SELECT br.*, lm.name AS model_name
      FROM benchmark_results br
      JOIN llm_models lm ON lm.id = br.llm_model_id
      WHERE br.gpu_id IN (?, ?)
      ORDER BY br.tokens_per_second DESC
    `).all(leftGpu.id, rightGpu.id);

    const leftBenchmarks = benchmarks.filter((entry) => entry.gpu_id === leftGpu.id);
    const rightBenchmarks = benchmarks.filter((entry) => entry.gpu_id === rightGpu.id);
    const leftBenchmark = leftBenchmarks.find((entry) =>
      rightBenchmarks.some((candidate) => candidate.model_name === entry.model_name && candidate.precision === entry.precision)
    ) || null;
    const rightBenchmark = leftBenchmark
      ? rightBenchmarks.find((entry) => entry.model_name === leftBenchmark.model_name && entry.precision === leftBenchmark.precision) || null
      : null;

    res.send(renderSeoHtml({
      title: `${leftGpu.name} vs ${rightGpu.name} pour LLM`,
      description: `Comparatif entre ${leftGpu.name} et ${rightGpu.name} pour LLM : VRAM, bande passante, prix et benchmarks réellement disponibles dans la base.`,
      canonicalUrl: `${PUBLIC_SITE_URL}/comparatifs/gpu/${slug}`,
      jsonLd: getComparisonJsonLd(
        `${leftGpu.name} vs ${rightGpu.name} pour LLM`,
        `/comparatifs/gpu/${slug}`,
        `Comparatif entre ${leftGpu.name} et ${rightGpu.name} pour LLM : VRAM, bande passante, prix et benchmarks réellement disponibles dans la base.`
      ),
      staticContent: buildGpuPairComparisonStaticContent(leftGpu, rightGpu, leftBenchmark, rightBenchmark),
    }));
  } catch (error) {
    console.error('Error serving comparison SEO page:', error);
    res.status(500).send(renderSeoHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${PUBLIC_SITE_URL}/`,
      jsonLd: getHomeJsonLd(),
      staticContent: buildHomeStaticContent(),
    }));
  }
});

app.get(['/comparatifs/vram/:slug', '/comparatifs/vram/:slug/'], (req, res) => {
  try {
    const db = require('./config/database');
    const slug = req.params.slug;
    const targetVram = parseVramComparisonSlug(slug);

    if (!targetVram) {
      res.status(404).send(renderSeoHtml({
        title: 'Comparatif introuvable | GPU LLM Benchmark',
        description: 'Le comparatif demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Comparatif introuvable</h1>
            <p>Le comparatif demandé n'est pas disponible.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    const candidates = db.prepare(`
      SELECT *,
        (SELECT COUNT(*) FROM benchmark_results br WHERE br.gpu_id = gpu_benchmarks.id) AS coverageCount
      FROM gpu_benchmarks
      WHERE vram = ?
      ORDER BY score DESC, name ASC
    `).all(targetVram);

    if (candidates.length === 0) {
      res.status(404).send(renderSeoHtml({
        title: 'Comparatif introuvable | GPU LLM Benchmark',
        description: 'Le comparatif demandé est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Comparatif introuvable</h1>
            <p>Le comparatif demandé n'est pas disponible.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    res.send(renderSeoHtml({
      title: `Quel GPU ${targetVram} Go choisir pour LLM`,
      description: `Comparatif des GPU ${targetVram} Go présents dans la base : VRAM, prix, bande passante et benchmarks disponibles pour mieux choisir une carte LLM.`,
      canonicalUrl: `${PUBLIC_SITE_URL}/comparatifs/vram/${slug}`,
      jsonLd: getComparisonJsonLd(
        `Quel GPU ${targetVram} Go choisir pour LLM`,
        `/comparatifs/vram/${slug}`,
        `Comparatif des GPU ${targetVram} Go présents dans la base : VRAM, prix, bande passante et benchmarks disponibles pour mieux choisir une carte LLM.`
      ),
      staticContent: buildVramComparisonStaticContent(targetVram, candidates),
    }));
  } catch (error) {
    console.error('Error serving VRAM comparison SEO page:', error);
    res.status(500).send(renderSeoHtml({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonicalUrl: `${PUBLIC_SITE_URL}/`,
      jsonLd: getHomeJsonLd(),
      staticContent: buildHomeStaticContent(),
    }));
  }
});

app.get(['/usages/:slug', '/usages/:slug/'], (req, res) => {
  try {
    const db = require('./config/database');
    const slug = req.params.slug;

    const allGpus = db.prepare(`
      SELECT *,
        (SELECT COUNT(*) FROM benchmark_results br WHERE br.gpu_id = gpu_benchmarks.id) AS coverageCount
      FROM gpu_benchmarks
      ORDER BY score DESC, name ASC
    `).all();
    const tested = allGpus.filter((gpu) => Number(gpu.coverageCount) > 0);

    let title = '';
    let description = '';
    let selected = [];
    let intro = '';
    let helpText = '';
    let guideLabel = '';

    if (slug === 'local-ai') {
      selected = [...tested]
        .filter((gpu) => Number(gpu.vram) >= 16)
        .sort((left, right) => Number(right.coverageCount) - Number(left.coverageCount) || Number(right.score) - Number(left.score));
      title = 'Quels GPU regarder pour du local AI';
      description = 'Sélection dynamique des GPU pertinents pour le local AI à partir des cartes réellement benchmarkées dans la base : VRAM, prix et couverture benchmark.';
      intro = "Cette page met en avant les cartes les plus pertinentes pour une machine locale sérieuse, en s'appuyant uniquement sur les GPU réellement présents dans la base et sur leur couverture benchmark.";
      helpText = "Commencez par les cartes qui cumulent assez de VRAM et plusieurs benchmarks. Ensuite, vérifiez leur prix observé et ouvrez les fiches pour voir les modèles testés et les débits réellement mesurés.";
      guideLabel = "Lire le guide pour choisir un GPU de local AI";
    } else if (slug === 'budget') {
      selected = [...tested]
        .filter((gpu) => getKnownGpuPrice(gpu) > 0)
        .sort((left, right) => getKnownGpuPrice(left) - getKnownGpuPrice(right) || Number(right.coverageCount) - Number(left.coverageCount));
      title = 'Quels GPU regarder avec un budget serré';
      description = 'Sélection dynamique des GPU avec prix renseigné et benchmarks disponibles pour repérer les cartes les plus intéressantes quand le budget compte vraiment.';
      intro = "Cette page isole les cartes dont le prix est réellement renseigné dans la base pour vous aider à comparer les options les plus accessibles sans sortir du concret.";
      helpText = "Ne regardez pas seulement le prix. Une carte un peu plus chère mais mieux couverte par les benchmarks peut être plus sûre qu'une carte bon marché dont on sait encore très peu de choses en usage LLM.";
      guideLabel = "Lire le guide pour choisir un GPU avec budget serré";
    } else if (slug === 'entreprise') {
      selected = [...tested]
        .filter((gpu) => gpu.tier === 'enterprise' || Number(gpu.vram) >= 80)
        .sort((left, right) => Number(right.vram) - Number(left.vram) || Number(right.bandwidth) - Number(left.bandwidth));
      title = 'Quels GPU regarder pour un usage entreprise';
      description = 'Sélection dynamique des GPU orientés entreprise ou très haute capacité mémoire, à partir des cartes réellement présentes dans la base.';
      intro = "Cette sélection vise les cartes qui deviennent pertinentes dès qu'on dépasse le poste local classique et qu'on cherche davantage de marge mémoire ou une catégorie matérielle plus lourde.";
      helpText = "Dans cette catégorie, la VRAM reste le premier filtre, mais elle ne suffit pas. Regardez aussi la bande passante, les benchmarks déjà disponibles et le type d'usage réel avant d'arbitrer.";
      guideLabel = "Lire le guide pour choisir un GPU orienté entreprise";
    } else {
      res.status(404).send(renderSeoHtml({
        title: 'Page usage introuvable | GPU LLM Benchmark',
        description: 'La page usage demandée est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Page usage introuvable</h1>
            <p>La page demandée n'est pas disponible.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    if (selected.length === 0) {
      res.status(404).send(renderSeoHtml({
        title: 'Page usage introuvable | GPU LLM Benchmark',
        description: 'La page usage demandée est introuvable sur GPU LLM Benchmark.',
        canonicalUrl: `${PUBLIC_SITE_URL}${req.path}`,
        robots: 'noindex, follow',
        jsonLd: getHomeJsonLd(),
        staticContent: `
          <section>
            <h1>Page usage introuvable</h1>
            <p>Les données actuelles ne permettent pas encore de construire cette page.</p>
            <p><a href="/">Retour au benchmark</a></p>
          </section>
        `,
      }));
      return;
    }

    res.send(renderSeoHtml({
      title,
      description,
      canonicalUrl: `${PUBLIC_SITE_URL}/usages/${slug}`,
      jsonLd: getUsageJsonLd(title, `/usages/${slug}`, description),
      staticContent: buildUsageStaticContent(title, intro, selected.slice(0, 8), helpText, guideLabel),
    }));
  } catch (error) {
    console.error('Error serving usage SEO page:', error);
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
