import { formatNumber } from "../formatters.js";

export function getEstimateWarnings({ model, ramGb, requestedContextSize, gpuVramGb, memory }) {
  const warnings = [];

  if (model.max_context_size && requestedContextSize > model.max_context_size) {
    warnings.push(
      `Le contexte demandé dépasse le maximum déclaré du modèle (${formatNumber(model.max_context_size)} tokens).`
    );
  }

  if (gpuVramGb > 0 && memory.totalMemoryGb > gpuVramGb) {
    warnings.push(
      `La VRAM disponible semble insuffisante: besoin estimé ≈ ${formatNumber(memory.totalMemoryGb)} Go pour ${formatNumber(gpuVramGb)} Go disponibles.`
    );
  }

  if (ramGb < Math.max(16, memory.totalMemoryGb * 1.15)) {
    warnings.push(`La RAM système risque d'être limitante avec ${formatNumber(ramGb)} Go.`);
  }

  return warnings;
}
