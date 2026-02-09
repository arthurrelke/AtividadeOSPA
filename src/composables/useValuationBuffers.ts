/**
 * Composable para criação e gerenciamento de buffers de valorização
 *
 * METODOLOGIA SIMPLIFICADA: DePaul University - The 606 Trail Impact Study
 *
 * Buffer único de 0.2 milhas do perímetro do parque
 * Valorização: +22.3%
 */

import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import type { Park } from '@/types'
import * as turf from '@turf/turf'

/**
 * Configuração simplificada: apenas 1 buffer de 0.2 milhas
 */
export const VALUATION_CONFIG = {
  distance: 0.2,        // 0.2 milhas do perímetro
  premium: 22.3,        // +22.3% valorização
  label: '0-0.2 mi',
  color: '#6B97C2',     // Azul da paleta
  opacity: 0.6,
} as const

export interface ValuationBuffer {
  id: string
  sourceType: 'park'
  sourceId: string | number
  sourceName: string
  distanceZone: string
  premium: number
  geometry: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
}

export function useValuationBuffers() {
  /* ------------------------------------------------------------------ */
  /* STATE                                                              */
  /* ------------------------------------------------------------------ */

  const buffers: Ref<ValuationBuffer[]> = ref([])
  const loading = ref(false)

  /* ------------------------------------------------------------------ */
  /* VALIDATION                                                         */
  /* ------------------------------------------------------------------ */

  function isValidGeometry(geometry: any): boolean {
    if (!geometry || !geometry.type || !geometry.coordinates) return false

    if (geometry.type === 'Polygon') {
      const ring = geometry.coordinates[0]
      return Array.isArray(ring) && ring.length >= 4
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.every(
        (poly: any) => Array.isArray(poly[0]) && poly[0].length >= 4
      )
    }

    return false
  }

  /* ------------------------------------------------------------------ */
  /* BUFFER GENERATION (SIMPLIFICADO)                                   */
  /* ------------------------------------------------------------------ */

  function generateParkBuffers(park: Park): ValuationBuffer[] {
    if (!park.the_geom || !isValidGeometry(park.the_geom)) {
      return []
    }

    try {
      // Criar buffer único de 0.2 milhas
      const buffered = turf.buffer(park.the_geom as any, VALUATION_CONFIG.distance, { units: 'miles' })

      if (!buffered) return []

      return [{
        id: `park-${park.park_no}-buffer`,
        sourceType: 'park',
        sourceId: park.park_no,
        sourceName: park.park_name,
        distanceZone: VALUATION_CONFIG.label,
        premium: VALUATION_CONFIG.premium,
        geometry: buffered as any,
      }]
    } catch (err) {
      console.warn(`Erro ao gerar buffer do parque ${park.park_name}`, err)
      return []
    }
  }

  function generateAllBuffers(parks: Park[]): void {
    loading.value = true

    const all: ValuationBuffer[] = []

    parks.forEach((park) => {
      const parkBuffers = generateParkBuffers(park)
      if (parkBuffers.length) {
        all.push(...parkBuffers)
      }
    })

    buffers.value = all
    loading.value = false
  }

  /* ------------------------------------------------------------------ */
  /* MAPBOX READY COLLECTION (SIMPLIFICADO)                            */
  /* ------------------------------------------------------------------ */

  const bufferCollection = computed(() => ({
    type: 'FeatureCollection' as const,
    features: buffers.value.map(b => b.geometry as any),
  }))

  /* ------------------------------------------------------------------ */
  /* PUBLIC API                                                         */
  /* ------------------------------------------------------------------ */

  return {
    buffers,
    loading,
    bufferCollection,
    generateAllBuffers,
    generateParkBuffers,
    isValidGeometry,
    VALUATION_CONFIG,
  }
}
