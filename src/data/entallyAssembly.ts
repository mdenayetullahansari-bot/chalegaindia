export const ENTALLY_ASSEMBLY = {
  assemblyNumber: 163,
  name: 'Entally',
  state: 'West Bengal',
  type: 'Legislative Assembly' as const,
  boundaryVersion: 'current_assembly_reference_2026',
  boundaryStatus: 'reference_only' as const,
  wardStatus: 'pending_final_kmc_2026_delimitation' as const,
  legacyKmcWards: [54, 55, 56, 58, 59] as const,
  pilotLabel: 'Entally Assembly Community',
  copy: {
    title: 'Chalega India — Entally',
    subtitle: 'Walk together. Get healthier. Build a stronger community.',
    wardNotice: 'Your 2026 KMC ward is being verified against the final delimitation.',
  },
} as const;

export type EntallyAssembly = typeof ENTALLY_ASSEMBLY;

/**
 * Important:
 * The legacy ward list is historical/reference data only.
 * It must not be used as a 2026 KMC ward assignment.
 * Final 2026 ward assignment will come from validated KMC boundary geometry.
 */
export const ENTALLY_LEGACY_WARDS = [...ENTALLY_ASSEMBLY.legacyKmcWards];
