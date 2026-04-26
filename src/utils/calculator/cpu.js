import { CPU_PENALTY_CEILING, CPU_PENALTY_FLOOR, DEFAULT_CPU } from "./constants.js";

export function computeCpuPenalty(cpu = DEFAULT_CPU) {
  const cpuBaseScore = DEFAULT_CPU.threads * DEFAULT_CPU.frequency;
  const cpuScore = Math.max(cpu.threads, cpu.cores) * cpu.frequency;

  return Math.max(CPU_PENALTY_FLOOR, Math.min(CPU_PENALTY_CEILING, cpuScore / cpuBaseScore));
}
