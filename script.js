const gpuData = [
  {
    name: 'RTX 5090', vendor: 'NVIDIA', architecture: 'Blackwell', vram: 32, bandwidth: 1792,
    tokens: 213, price: 'premium', priceValue: 2300, tier: 'prosumer', score: 98
  },
  {
    name: 'RTX 5080', vendor: 'NVIDIA', architecture: 'Blackwell', vram: 16, bandwidth: 960,
    tokens: 132, price: 'haut de gamme', priceValue: 1300, tier: 'prosumer', score: 83
  },
  {
    name: 'RTX 4090', vendor: 'NVIDIA', architecture: 'Ada Lovelace', vram: 24, bandwidth: 1008,
    tokens: 128, price: 'occasion premium', priceValue: 1800, tier: 'prosumer', score: 82
  },
  {
    name: 'RTX 3090', vendor: 'NVIDIA', architecture: 'Ampere', vram: 24, bandwidth: 936,
    tokens: 112, price: 'occasion', priceValue: 850, tier: 'prosumer', score: 88
  },
  {
    name: 'RTX 4060 Ti', vendor: 'NVIDIA', architecture: 'Ada Lovelace', vram: 16, bandwidth: 288,
    tokens: 48, price: 'accessible', priceValue: 450, tier: 'budget', score: 61
  },
  {
    name: 'Radeon AI PRO R9700', vendor: 'AMD', architecture: 'RDNA 4', vram: 32, bandwidth: 0,
    tokens: 127.4, price: 'agressif', priceValue: 1100, tier: 'prosumer', score: 84
  },
  {
    name: 'Radeon RX 7900 XTX', vendor: 'AMD', architecture: 'RDNA 3', vram: 24, bandwidth: 960,
    tokens: 167, price: 'occasion', priceValue: 800, tier: 'prosumer', score: 86
  },
  {
    name: 'Arc A770', vendor: 'Intel', architecture: 'Alchemist', vram: 16, bandwidth: 512,
    tokens: 40, price: 'très budget', priceValue: 200, tier: 'budget', score: 72
  },
  {
    name: 'Arc B580', vendor: 'Intel', architecture: 'Battlemage', vram: 12, bandwidth: 0,
    tokens: 62, price: 'budget', priceValue: 249, tier: 'budget', score: 79
  },
  {
    name: 'A100 PCIe', vendor: 'NVIDIA', architecture: 'Ampere', vram: 80, bandwidth: 2000,
    tokens: 0, price: 'datacenter', priceValue: 5000, tier: 'enterprise', score: 91
  },
  {
    name: 'H100 PCIe', vendor: 'NVIDIA', architecture: 'Hopper', vram: 80, bandwidth: 3000,
    tokens: 0, price: 'datacenter', priceValue: 13000, tier: 'enterprise', score: 95
  },
  {
    name: 'MI300X', vendor: 'AMD', architecture: 'CDNA 3', vram: 192, bandwidth: 5300,
    tokens: 0, price: 'datacenter', priceValue: 18000, tier: 'enterprise', score: 97
  },
  {
    name: 'B200', vendor: 'NVIDIA', architecture: 'Blackwell', vram: 192, bandwidth: 8000,
    tokens: 0, price: 'ultra datacenter', priceValue: 30000, tier: 'enterprise', score: 100
  }
];

const insights = [
  {
    title: 'Le meilleur choix home lab',
    text: 'La RTX 3090 reste la carte la plus rationnelle pour maximiser la VRAM sans exploser le budget. Elle garde un excellent équilibre pour les modèles 70B quantifiés.'
  },
  {
    title: 'La reine de la perf locale',
    text: 'La RTX 5090 domine le segment consumer grâce à sa GDDR7, sa bande passante énorme et son très bon comportement sur les modèles 8B à 32B.'
  },
  {
    title: 'La surprise budget 2026',
    text: 'L’Intel Arc B580 s’impose comme un point d’entrée intelligent, avec un coût bas et un débit suffisant pour des modèles 7B à 8B.'
  },
  {
    title: 'AMD devient crédible',
    text: 'Avec ROCm, Vulkan et des cartes comme la R9700 ou la 7900 XTX, AMD devient une alternative sérieuse pour l’inférence locale sous Linux.'
  },
  {
    title: 'Le vrai nerf de la guerre',
    text: 'Pour les LLM, la bande passante mémoire pèse souvent plus que la puissance brute. Le dataset le montre très clairement dans les écarts prefill et decode.'
  },
  {
    title: 'Enterprise, une autre planète',
    text: 'Les H100, MI300X et B200 jouent dans une catégorie à part, surtout pour les gros MoE et les modèles comme DeepSeek R1 671B.'
  }
];

let filteredData = [...gpuData];
let currentSort = { key: 'score', direction: 'desc' };

const formatPrice = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const formatNumber = (value) => Number.isFinite(value) && value > 0 ? value.toLocaleString('fr-FR') : '—';

function renderHeroMetrics() {
  const topPerf = gpuData.reduce((a, b) => (a.tokens > b.tokens ? a : b));
  const topVram = gpuData.reduce((a, b) => (a.vram > b.vram ? a : b));
  const bestBudget = gpuData.filter((item) => item.tier === 'budget').sort((a, b) => b.score - a.score)[0];

  document.getElementById('hero-metrics').innerHTML = `
    <div class="metric-box">
      <span>Leader 8B</span>
      <strong>${topPerf.name}</strong>
      <span>${formatNumber(topPerf.tokens)} tokens/s</span>
    </div>
    <div class="metric-box">
      <span>Max VRAM</span>
      <strong>${topVram.name}</strong>
      <span>${formatNumber(topVram.vram)} Go</span>
    </div>
    <div class="metric-box">
      <span>Meilleur budget</span>
      <strong>${bestBudget.name}</strong>
      <span>${formatPrice(bestBudget.priceValue)}</span>
    </div>
  `;
}

function renderStats() {
  const cards = [
    { label: 'Cartes indexées', value: gpuData.length, note: 'consumer + enterprise' },
    { label: 'Meilleur débit 8B', value: `${formatNumber(Math.max(...gpuData.map((g) => g.tokens)))} t/s`, note: 'RTX 5090' },
    { label: 'VRAM max', value: `${formatNumber(Math.max(...gpuData.map((g) => g.vram)))} Go`, note: 'MI300X / B200' },
    { label: 'Budget d’entrée', value: formatPrice(Math.min(...gpuData.map((g) => g.priceValue))), note: 'segment budget' }
  ];

  document.getElementById('stats-grid').innerHTML = cards
    .map((card) => `
      <article class="card stat-card glass reveal visible">
        <span class="card-kicker">${card.label}</span>
        <strong>${card.value}</strong>
        <p>${card.note}</p>
      </article>
    `)
    .join('');
}

function renderBarChart() {
  const data = gpuData.filter((item) => item.tokens > 0).sort((a, b) => b.tokens - a.tokens).slice(0, 8);
  const max = Math.max(...data.map((item) => item.tokens));

  document.getElementById('tokens-chart').innerHTML = data
    .map((item) => `
      <div class="bar-row">
        <div class="bar-meta">
          <strong>${item.name}</strong>
          <span>${formatNumber(item.tokens)} t/s</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(item.tokens / max) * 100}%"></div>
        </div>
      </div>
    `)
    .join('');
}

function renderScatter() {
  const data = gpuData.filter((item) => item.bandwidth > 0).sort((a, b) => b.bandwidth - a.bandwidth).slice(0, 8);
  const max = Math.max(...data.map((item) => item.bandwidth));

  document.getElementById('scatter-list').innerHTML = data
    .map((item) => `
      <div class="scatter-item">
        <div class="scatter-item-header">
          <strong>${item.name}</strong>
          <span>${formatNumber(item.vram)} Go</span>
        </div>
        <div class="scatter-viz">
          <div class="scatter-dot" style="left:${(item.bandwidth / max) * 100}%"></div>
        </div>
        <div class="scatter-item-footer">
          <span>${item.architecture}</span>
          <strong>${formatNumber(item.bandwidth)} Go/s</strong>
        </div>
      </div>
    `)
    .join('');
}

function renderInsights() {
  document.getElementById('insight-grid').innerHTML = insights
    .map((item) => `
      <article class="card insight-card glass reveal visible">
        <span class="card-kicker">Insight</span>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </article>
    `)
    .join('');
}

function sortData(data) {
  const { key, direction } = currentSort;
  const order = direction === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (typeof aVal === 'string') return aVal.localeCompare(bVal) * order;
    return ((aVal ?? 0) - (bVal ?? 0)) * order;
  });
}

function renderTable() {
  const tbody = document.querySelector('#gpuTable tbody');
  const rows = sortData(filteredData)
    .map((item) => `
      <tr>
        <td>
          <strong>${item.name}</strong><br />
          <span class="badge ${item.tier}">${item.tier}</span>
        </td>
        <td>${item.vendor}</td>
        <td>${item.architecture}</td>
        <td>${formatNumber(item.vram)} Go</td>
        <td>${formatNumber(item.bandwidth)} Go/s</td>
        <td>${formatNumber(item.tokens)}</td>
        <td>${formatPrice(item.priceValue)}</td>
        <td><span class="score-pill">${item.score}/100</span></td>
      </tr>
    `)
    .join('');

  tbody.innerHTML = rows;
}

function populateFilters() {
  const vendors = [...new Set(gpuData.map((item) => item.vendor))];
  const select = document.getElementById('vendorFilter');
  select.innerHTML += vendors.map((vendor) => `<option value="${vendor}">${vendor}</option>`).join('');
}

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const vendor = document.getElementById('vendorFilter').value;
  const tier = document.getElementById('tierFilter').value;

  filteredData = gpuData.filter((item) => {
    const matchesSearch = [item.name, item.vendor, item.architecture, item.tier]
      .join(' ')
      .toLowerCase()
      .includes(search);
    const matchesVendor = vendor === 'all' || item.vendor === vendor;
    const matchesTier = tier === 'all' || item.tier === tier;
    return matchesSearch && matchesVendor && matchesTier;
  });

  renderTable();
}

function bindEvents() {
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('vendorFilter').addEventListener('change', applyFilters);
  document.getElementById('tierFilter').addEventListener('change', applyFilters);

  document.querySelectorAll('#gpuTable th').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (currentSort.key === key) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort = { key, direction: 'desc' };
      }
      renderTable();
    });
  });
}

function revealOnScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.12 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

renderHeroMetrics();
renderStats();
renderBarChart();
renderScatter();
renderInsights();
populateFilters();
renderTable();
bindEvents();
revealOnScroll();
