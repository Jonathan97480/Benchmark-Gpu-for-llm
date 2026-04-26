export function computeMultiGpuScaling(gpuCount) {
  if (gpuCount <= 1) {
    return 1;
  }

  return 1 + (gpuCount - 1) * 0.82;
}
