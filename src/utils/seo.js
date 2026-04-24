const SITE_URL = "https://gpubenchmark.jon-dev.fr";
const DEFAULT_TITLE = "GPU LLM Benchmark 2026";
const DEFAULT_DESCRIPTION =
  "Benchmark GPU pour LLM open source : comparez les cartes graphiques, les vendeurs et les performances mesurées pour choisir le bon matériel IA.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.svg`;

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

function ensureJsonLdScript() {
  let element = document.head.querySelector('script[data-seo-json-ld="website"]');

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.seoJsonLd = "website";
    document.head.appendChild(element);
  }

  return element;
}

export function applyPublicSeo({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
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

  ensureJsonLdScript().textContent = JSON.stringify(
    {
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
    },
    null,
    2
  );
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

  const jsonLd = document.head.querySelector('script[data-seo-json-ld="website"]');
  if (jsonLd) {
    jsonLd.remove();
  }
}

export const seoDefaults = {
  description: DEFAULT_DESCRIPTION,
  siteUrl: SITE_URL,
  title: DEFAULT_TITLE,
};
