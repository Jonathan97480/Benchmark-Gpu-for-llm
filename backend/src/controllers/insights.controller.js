const insights = [
  {
    title: 'Le meilleur choix home lab',
    text: "La RTX 3090 reste la carte la plus rationnelle pour maximiser la VRAM sans exploser le budget. Elle garde un excellent équilibre pour les modèles 70B quantifiés."
  },
  {
    title: 'La reine de la perf locale',
    text: "La RTX 5090 domine le segment consumer grâce à sa GDDR7, sa bande passante énorme et son très bon comportement sur les modèles 8B à 32B."
  },
  {
    title: 'La surprise budget 2026',
    text: "L'Intel Arc B580 s'impose comme un point d'entrée intelligent, avec un coût bas et un débit suffisant pour des modèles 7B à 8B."
  },
  {
    title: 'AMD devient crédible',
    text: "Avec ROCm, Vulkan et des cartes comme la R9700 ou la 7900 XTX, AMD devient une alternative sérieuse pour l'inférence locale sous Linux."
  },
  {
    title: 'Le vrai nerf de la guerre',
    text: "Pour les LLM, la bande passante mémoire pèse souvent plus que la puissance brute. Le dataset le montre très clairement dans les écarts prefill et decode."
  },
  {
    title: 'Enterprise, une autre planète',
    text: "Les H100, MI300X et B200 jouent dans une catégorie à part, surtout pour les gros MoE et les modèles comme DeepSeek R1 671B."
  }
];

const getAllInsights = (req, res) => {
  res.json({
    insights,
    total: insights.length
  });
};

module.exports = {
  getAllInsights
};