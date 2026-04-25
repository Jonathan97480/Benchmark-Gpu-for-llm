import { getGpuPath, slugifyGpuName } from "../../utils/data.js";

function buildContentCards(gpuData) {
  const cards = [
    {
      href: "/guides/choisir-gpu-llm",
      kicker: "Guide",
      title: "Choisir un GPU pour LLM",
      description:
        "Une page éditoriale pour lire le benchmark correctement: VRAM, débit mesuré, prix neuf et occasion.",
    },
    {
      href: "/faq",
      kicker: "FAQ",
      title: "Questions fréquentes",
      description:
        "Une FAQ indexable pour expliquer la logique du benchmark, du calculateur et du suivi de prix.",
    },
  ];

  const testedGpus = gpuData
    .filter((gpu) => gpu.coverageCount > 0)
    .sort((left, right) => right.score - left.score || right.coverageCount - left.coverageCount);

  const pair = testedGpus.length >= 2 ? [testedGpus[0], testedGpus[1]] : null;
  if (pair) {
    cards.push({
      href: `/comparatifs/gpu/${slugifyGpuName(pair[0].name)}-vs-${slugifyGpuName(pair[1].name)}`,
      kicker: "Comparatif",
      title: `${pair[0].name} vs ${pair[1].name}`,
      description:
        "Un comparatif généré à partir des cartes réellement présentes dans la base et des benchmarks actuellement disponibles.",
    });
  }

  const vramGroups = gpuData.reduce((map, gpu) => {
    if (gpu.coverageCount <= 0) {
      return map;
    }

    const key = String(gpu.vram);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(gpu);
    return map;
  }, new Map());

  const bestVramGroup = [...vramGroups.entries()]
    .filter(([, gpus]) => gpus.length >= 2)
    .sort((left, right) => right[1].length - left[1].length || Number(right[0]) - Number(left[0]))[0];

  if (bestVramGroup) {
    const [vram] = bestVramGroup;
    cards.push({
      href: `/comparatifs/vram/${vram}go`,
      kicker: "Comparatif",
      title: `Quel GPU ${vram} Go choisir`,
      description:
        "Une comparaison dynamique entre les cartes de même capacité mémoire présentes dans la base.",
    });
  }

  const topVendorGpu = testedGpus[0];
  if (topVendorGpu) {
    cards.push({
      href: getGpuPath(topVendorGpu),
      kicker: "Fiche",
      title: topVendorGpu.name,
      description:
        "Ouvrez directement la fiche de la carte la mieux placée parmi les références actuellement benchmarkées.",
    });
  }

  cards.push(
    {
      href: "/usages/local-ai",
      kicker: "Usage",
      title: "GPU pour local AI",
      description:
        "Une sélection dynamique des cartes les plus pertinentes pour monter une machine locale crédible.",
    },
    {
      href: "/usages/budget",
      kicker: "Usage",
      title: "GPU avec budget serré",
      description:
        "Une page utile pour repérer les cartes dont le prix est connu et qui gardent un usage LLM plausible.",
    }
  );

  return cards;
}

export function ContentHubSection({ gpuData }) {
  const contentCards = buildContentCards(gpuData);
  return (
    <section className="section reveal" id="guides">
      <div className="section-heading">
        <span className="section-kicker">Guides</span>
        <h2>Guides, comparatifs et FAQ</h2>
        <p>
          Cette zone rassemble les pages utiles quand vous ne voulez pas seulement regarder un tableau brut,
          mais comprendre quelle carte choisir selon votre budget, votre modèle et votre usage réel.
        </p>
      </div>

      <div className="content-link-grid">
        {contentCards.map((card) => (
          <a key={card.href} className="content-link-card glass" href={card.href}>
            <span className="card-kicker">{card.kicker}</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
