const SITE_URL = "https://gpubenchmark.jon-dev.fr";
const DEFAULT_TITLE = "GPU LLM Benchmark 2026";
const DEFAULT_DESCRIPTION =
  "Benchmark GPU pour LLM open source : comparez les cartes graphiques, les vendeurs et les performances mesurées pour choisir le bon matériel IA.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

function normalizeJsonLdEntries(jsonLd, description) {
  const defaultWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GPU LLM Benchmark",
    url: SITE_URL,
    description,
    inLanguage: "fr",
    publisher: {
      "@type": "Organization",
      name: "jon-dev",
      url: "https://portfolio.jon-dev.fr/",
    },
  };

  if (!jsonLd) {
    return [defaultWebsite];
  }

  return Array.isArray(jsonLd) ? jsonLd : [jsonLd];
}

function ensureMeta(selector, attributeName, attributeValue) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  return element;
}

function ensureLink(selector, relValue) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", relValue);
    document.head.appendChild(element);
  }

  return element;
}

function replaceJsonLdScripts(entries) {
  document.head.querySelectorAll('script[data-seo-json-ld]').forEach((element) => element.remove());

  entries.forEach((entry, index) => {
    const element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.seoJsonLd = String(index);
    element.textContent = JSON.stringify(entry, null, 2);
    document.head.appendChild(element);
  });
}

export function applyPublicSeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  jsonLd,
} = {}) {
  const canonicalUrl = new URL(path, SITE_URL).toString();

  document.title = title;

  ensureMeta('meta[name="description"]', "name", "description").setAttribute("content", description);
  ensureMeta('meta[name="robots"]', "name", "robots").setAttribute("content", "index, follow");
  ensureMeta('meta[property="og:title"]', "property", "og:title").setAttribute("content", title);
  ensureMeta('meta[property="og:description"]', "property", "og:description").setAttribute("content", description);
  ensureMeta('meta[property="og:url"]', "property", "og:url").setAttribute("content", canonicalUrl);
  ensureMeta('meta[property="og:type"]', "property", "og:type").setAttribute("content", "website");
  ensureMeta('meta[property="og:site_name"]', "property", "og:site_name").setAttribute("content", "GPU LLM Benchmark");
  ensureMeta('meta[property="og:image"]', "property", "og:image").setAttribute("content", image);
  ensureMeta('meta[name="twitter:card"]', "name", "twitter:card").setAttribute("content", "summary_large_image");
  ensureMeta('meta[name="twitter:title"]', "name", "twitter:title").setAttribute("content", title);
  ensureMeta('meta[name="twitter:description"]', "name", "twitter:description").setAttribute("content", description);
  ensureMeta('meta[name="twitter:image"]', "name", "twitter:image").setAttribute("content", image);
  ensureLink('link[rel="canonical"]', "canonical").setAttribute("href", canonicalUrl);

  replaceJsonLdScripts(normalizeJsonLdEntries(jsonLd, description));
}

export function applyAdminSeo() {
  document.title = "Admin | GPU LLM Benchmark";

  ensureMeta('meta[name="robots"]', "name", "robots").setAttribute(
    "content",
    "noindex, nofollow, noarchive, nosnippet"
  );
  ensureMeta('meta[name="description"]', "name", "description").setAttribute(
    "content",
    "Interface d’administration privée de GPU LLM Benchmark."
  );
  ensureLink('link[rel="canonical"]', "canonical").setAttribute("href", `${SITE_URL}/admin`);

  document.head.querySelectorAll('script[data-seo-json-ld]').forEach((element) => element.remove());
}

export const seoDefaults = {
  description: DEFAULT_DESCRIPTION,
  siteUrl: SITE_URL,
  title: DEFAULT_TITLE,
};
