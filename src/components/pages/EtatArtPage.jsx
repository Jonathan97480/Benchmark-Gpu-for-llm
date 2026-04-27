import { useEffect } from "react";
import { applyPublicSeo } from "../../utils/seo.js";
import { Breadcrumbs } from "../common/Breadcrumbs.jsx";
import { PublicPageShell } from "../common/PublicSiteChrome.jsx";

const breadcrumbs = [
  { href: "/", label: "Accueil" },
  { href: "/guides/etat-art-llm-code", label: "État de l'art LLM Code" },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GPU LLM Benchmark",
    url: "https://gpubenchmark.jon-dev.fr",
    description:
      "Benchmark GPU pour LLM open source : comparez les cartes graphiques, les vendeurs et les performances mesurées pour choisir le bon matériel IA.",
    inLanguage: "fr",
    publisher: {
      "@type": "Organization",
      name: "jon-dev",
      url: "https://portfolio.jon-dev.fr/",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `https://gpubenchmark.jon-dev.fr${item.href}`,
    })),
  },
];

const models = [
  {
    name: "Qwen 3.6-27B",
    tier: "Medium",
    arch: "Dense",
    context: "128k – 512k",
    strengths:
      "Le nouveau roi du code local. Succède au Qwen 2.5 avec un raisonnement amélioré de 40 %. Optimisé pour Python, TypeScript, Go et les langages de script.",
  },
  {
    name: "Gemma 4 (31B)",
    tier: "Medium",
    arch: "Dense",
    context: "256k",
    strengths:
      "La meilleure précision syntaxique du panel. Sa densité de paramètres réels (31B) lui donne un avantage structurel sur les architectures Rust, C++ et bas niveau.",
  },
  {
    name: "DeepSeek-V4 Flash",
    tier: "Small–Medium",
    arch: "MoE (13B actifs / 284B total)",
    context: "1M",
    strengths:
      "Le rapport performance/VRAM le plus intéressant du panel. 13B de paramètres activés offrent la puissance d'un Medium pour le coût mémoire d'un Small. Contexte quasiment illimité.",
  },
  {
    name: "GLM-5.1",
    tier: "Large",
    arch: "MoE (40B actifs)",
    context: "200k",
    strengths:
      "Spécialisé dans l'ingénierie logicielle complexe et la résolution de bugs multi-fichiers. Niveau senior pour l'architecture et le refactoring.",
  },
];

const vramRows = [
  { model: "Qwen 3.6-27B", weights: "~18 Go", kvQ8: "~24 Go", kvQ4: "~12 Go", total: "30 – 42 Go" },
  { model: "Gemma 4 (31B)", weights: "~21 Go", kvQ8: "~26 Go", kvQ4: "~13 Go", total: "34 – 47 Go" },
  { model: "DeepSeek-V4 Flash", weights: "~10 Go", kvQ8: "~14 Go", kvQ4: "~7 Go", total: "17 – 24 Go" },
  { model: "GLM-5.1 (MoE)", weights: "~28 Go", kvQ8: "~32 Go", kvQ4: "~16 Go", total: "44 – 60 Go" },
];

const quantLevels = [
  {
    level: "FP16 (sans quantification)",
    desc: "Précision maximale, VRAM maximale. Sur Qwen 3.6-27B, 256k tokens de contexte consomment seuls ~48 Go. Inexploitable hors serveur professionnel multi-GPU.",
    verdict: "Inadapté au poste local",
  },
  {
    level: "Q8_0",
    desc: "Quasiment aucune perte mesurable par rapport à FP16 sur les tâches de code. Réduit la taille des poids d'un facteur ~2. Le réglage de précision le plus sûr.",
    verdict: "Idéal quand la VRAM le permet",
  },
  {
    level: "Q6_K / Q6_K_M",
    desc: "Bon compromis intermédiaire. Qualité très proche de Q8 avec un gain VRAM supplémentaire de ~25 %. Pertes imperceptibles sur la plupart des tâches code.",
    verdict: "Excellent si Q4_K_M est trop agressif",
  },
  {
    level: "Q5_K_M",
    desc: "Léger recul de qualité par rapport à Q6, mais VRAM réduite de ~35 % vs Q8. Peu de perte sensible sur l'autocomplétion et le raisonnement code courant.",
    verdict: "Bon choix milieu de gamme",
  },
  {
    level: "Q4_K_M",
    desc: "Le point d'équilibre pour le code local. Réduction de VRAM de ~4x vs FP16. Le code, plus structuré et prévisible que le langage naturel, résiste mieux à la compression 4-bit que les tâches conversationnelles. Pertes mesurées autour de 3–5 % sur les benchmarks SWE-bench et HumanEval.",
    verdict: "Le meilleur rapport qualité/VRAM pour le code",
  },
  {
    level: "Q3_K_M",
    desc: "Compression agressive. Pertes de qualité visibles sur le raisonnement logique complexe et les cas limites. Utile uniquement pour faire tenir un modèle trop gros sur une carte trop petite.",
    verdict: "Dernier recours, pertes significatives",
  },
  {
    level: "Q2_K",
    desc: "Compression extrême. Faisable pour du test rapide ou du prototypage, mais inadapté à un usage sérieux de génération de code.",
    verdict: "Non recommandé pour le code",
  },
];

const glossaryItems = [
  {
    term: "Agentic Coding",
    def: "Capacité du modèle à ne pas se contenter de générer du code, mais à utiliser des outils (LSP, compilateurs, terminal) pour vérifier, corriger et itérer sur ses réponses.",
  },
  {
    term: "MoE (Mixture of Experts)",
    def: "Architecture où seule une fraction des paramètres est activée pour chaque token. Permet d'atteindre l'intelligence d'un modèle très large avec le coût mémoire et la vitesse d'un modèle plus petit.",
  },
  {
    term: "GQA (Grouped Query Attention)",
    def: "Technique qui réduit la mémoire du mécanisme d'attention en regroupant les clés et valeurs. Standard sur les modèles 2025–2026.",
  },
  {
    term: "Flash Attention 3",
    def: "Algorithme de calcul d'attention optimisé pour réduire la consommation mémoire du contexte long. Permet de gérer des fenêtres de 256k+ tokens plus efficacement.",
  },
  {
    term: "RoPE Scaling",
    def: "Technique mathématique (Scaling Linéaire ou Dynamique) qui étend la fenêtre de contexte native d'un modèle entraîné sur 32k tokens jusqu'à plusieurs centaines de milliers, sans perte de cohérence.",
  },
  {
    term: "KV Cache",
    def: "Stockage en mémoire des états d'attention déjà calculés pour chaque token du contexte. C'est le principal poste de consommation VRAM quand on augmente la longueur du contexte.",
  },
  {
    term: "Vibe Coding",
    def: "Développement ultra-rapide piloté par IA, où un contexte massif (256k+) permet au modèle de comprendre l'intégralité du projet en une seule passe.",
  },
];

const editorials = [
  {
    kicker: "Tendance 2025–2026",
    title: "Des généralistes aux modèles spécialisés code",
    body: "Les modèles purement généralistes laissent place à des architectures optimisées pour le code : capacité à naviguer dans un dépôt entier, à utiliser des outils (LSP, compilateurs) et à raisonner sur des bugs multi-fichiers. Les quatre modèles retenus ici incarnent cette évolution.",
  },
  {
    kicker: "Qwen 3.6 vs Gemma 4",
    title: "Scripts web ou architectures bas niveau",
    body: "Qwen 3.6 excelle sur les langages de script (Python, TypeScript, Go) et les instructions mal définies. Gemma 4 est plus rigoureux : sa densité de 31B paramètres réels lui donne un avantage sur les structures complexes, le typage strict et les systèmes bas niveau.",
  },
  {
    kicker: "DeepSeek-V4 Flash",
    title: "Le rapport performance/VRAM le plus intéressant",
    body: "Seuls 10 Go de VRAM pour les poids en Q4_K_M, grâce à son architecture MoE qui n'active que 13B paramètres sur 284B au total. 256k de contexte tiennent sur une carte de 24 Go avec du KV Cache en Q8. C'est le choix naturel pour un poste local mono-GPU.",
  },
  {
    kicker: "KV Cache",
    title: "Pourquoi quantifier le contexte est indispensable",
    body: "En FP16, 256k tokens sur Qwen 3.6 consomment ~48 Go rien pour le contexte. En Q8, on tombe à ~24 Go sans perte détectable sur le code. En Q4, ~12 Go au prix d'une légère dégradation. Ne pas quantifier le KV Cache rend les longs contextes inexploitables sur un poste local.",
  },
];

export function EtatArtPage() {
  useEffect(() => {
    applyPublicSeo({
      title: "État de l'art des LLM open source pour le code (2025–2026)",
      description:
        "Panorama des meilleurs modèles open source pour le code en 2025–2026 : Qwen 3.6, Gemma 4, DeepSeek-V4 Flash, GLM-5.1. VRAM, quantification Q4_K_M et recommandations par configuration.",
      path: "/guides/etat-art-llm-code",
      jsonLd,
    });
  }, []);

  return (
    <PublicPageShell>
      <main className="main-content gpu-detail-shell" id="main-content" tabIndex="-1">
        <section className="section reveal visible">
          <div className="card glass gpu-detail-hero">
            <div className="gpu-detail-copy">
              <Breadcrumbs items={breadcrumbs} />
              <span className="section-kicker">Guide</span>
              <h1>État de l'art des LLM open source pour le code</h1>
              <p>
                Panorama des modèles de génération de code les plus performants en 2025–2026,
                avec les chiffres VRAM concrets et une explication détaillée des niveaux de quantification
                pour choisir la configuration adaptée à chaque poste.
              </p>
              <div className="hero-actions">
                <a className="btn btn-primary" href="/">
                  Retour au benchmark
                </a>
                <a className="btn btn-secondary" href="/calculateur-llm">
                  Ouvrir le calculateur
                </a>
              </div>
            </div>

            <div className="gpu-detail-stats">
              <div className="metric-box">
                <span>Fenêtre</span>
                <strong>Jusqu'à 1M</strong>
                <span>tokens de contexte</span>
              </div>
              <div className="metric-box">
                <span>VRAM min</span>
                <strong>17 Go</strong>
                <span>DeepSeek-V4 Flash Q4</span>
              </div>
              <div className="metric-box">
                <span>Quantification</span>
                <strong>Q4_K_M</strong>
                <span>meilleur rapport qualité/VRAM</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="editorial-grid">
            {editorials.map((section) => (
              <article className="card glass editorial-card" key={section.title}>
                <span className="card-kicker">{section.kicker}</span>
                <h3>{section.title}</h3>
                <p>{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">SOTA 2025–2026</span>
                <h2>Les quatre modèles de référence pour le code</h2>
              </div>
            </div>
            <div className="table-wrap">
              <table className="benchmark-details-table">
                <caption className="sr-only">Modèles LLM open source pour le code, 2025–2026</caption>
                <thead>
                  <tr>
                    <th scope="col">Modèle</th>
                    <th scope="col">Classe</th>
                    <th scope="col">Architecture</th>
                    <th scope="col">Contexte</th>
                    <th scope="col">Points forts</th>
                  </tr>
                </thead>
                <tbody>
                  {models.map((m) => (
                    <tr key={m.name}>
                      <th scope="row">{m.name}</th>
                      <td>{m.tier}</td>
                      <td>{m.arch}</td>
                      <td>{m.context}</td>
                      <td>{m.strengths}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">VRAM</span>
                <h2>Besoins mémoire pour 256k tokens de contexte</h2>
              </div>
            </div>
            <p className="page-intro">
              Poids du modèle en Q4_K_M + KV Cache. Les colonnes Q8 et Q4 montrent l'impact de la quantification
              du cache sur la VRAM totale. Flash Attention 3 et GQA réduisent ces chiffres par rapport à 2024,
              mais le contexte reste le premier poste de consommation.
            </p>
            <div className="table-wrap">
              <table className="benchmark-details-table">
                <caption className="sr-only">VRAM nécessaire par modèle et niveau de quantification KV Cache pour 256k tokens</caption>
                <thead>
                  <tr>
                    <th scope="col">Modèle (Q4_K_M)</th>
                    <th scope="col">Poids modèle</th>
                    <th scope="col">KV Cache Q8</th>
                    <th scope="col">KV Cache Q4</th>
                    <th scope="col">Total recommandé</th>
                  </tr>
                </thead>
                <tbody>
                  {vramRows.map((row) => (
                    <tr key={row.model}>
                      <th scope="row">{row.model}</th>
                      <td>{row.weights}</td>
                      <td>{row.kvQ8}</td>
                      <td>{row.kvQ4}</td>
                      <td>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Quantification</span>
                <h2>Pourquoi Q4_K_M et pas autre chose</h2>
              </div>
            </div>
            <p className="page-intro">
              La quantification réduit la précision des poids et du KV Cache pour diminuer la VRAM nécessaire.
              Le choix du niveau dépend du compromis entre qualité de génération et capacité mémoire disponible.
              Le tableau ci-dessous couvre l'ensemble des niveaux courants, du plus précis au plus compressé.
            </p>
            <div className="table-wrap">
              <table className="benchmark-details-table">
                <caption className="sr-only">Niveaux de quantification LLM, du plus précis au plus compressé</caption>
                <thead>
                  <tr>
                    <th scope="col">Niveau</th>
                    <th scope="col">Description</th>
                    <th scope="col">Verdict pour le code local</th>
                  </tr>
                </thead>
                <tbody>
                  {quantLevels.map((q) => (
                    <tr key={q.level}>
                      <th scope="row">{q.level}</th>
                      <td>{q.desc}</td>
                      <td>{q.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Recommandations</span>
                <h2>Choisir selon la VRAM disponible</h2>
              </div>
            </div>
            <div className="editorial-grid" style={{ marginTop: "1rem" }}>
              <article className="card glass editorial-card">
                <span className="card-kicker">24 Go</span>
                <h3>RTX 3090 / 4090 / 5080</h3>
                <p>
                  DeepSeek-V4 Flash en Q4_K_M avec KV Cache Q8. 256k tokens de contexte tiennent confortablement.
                  Pour un usage de code au quotidien avec un projet de taille moyenne, c'est le setup le plus
                  efficace rapport qualité/VRAM.
                </p>
              </article>
              <article className="card glass editorial-card">
                <span className="card-kicker">64 Go+</span>
                <h3>Mac Studio ou Multi-GPU</h3>
                <p>
                  Qwen 3.6-27B ou GLM-5.1 pour un niveau d'intelligence équivalent ingénieur senior.
                  Q5_K_M ou Q6_K sur les poids si la VRAM le permet, avec KV Cache Q8 pour un contexte
                  long sans compromis.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Glossaire</span>
                <h2>Termes techniques 2025–2026</h2>
              </div>
            </div>
            <div className="faq-list">
              {glossaryItems.map((item) => (
                <article className="card glass faq-card" key={item.term}>
                  <h2>{item.term}</h2>
                  <p>{item.def}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section reveal visible">
          <div className="card glass">
            <div className="card-header">
              <div>
                <span className="card-kicker">Continuer</span>
                <h2>Aller plus loin sur le site</h2>
              </div>
            </div>
            <div className="content-link-grid">
              <a className="content-link-card" href="/guides/choisir-gpu-llm">
                Guide : choisir un GPU pour LLM
              </a>
              <a className="content-link-card" href="/calculateur-llm">
                Calculateur analytique GPU LLM
              </a>
              <a className="content-link-card" href="/vendor/nvidia">
                Explorer les GPU NVIDIA
              </a>
              <a className="content-link-card" href="/vendor/amd">
                Explorer les GPU AMD
              </a>
              <a className="content-link-card" href="/faq">
                FAQ benchmark GPU LLM
              </a>
            </div>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}
