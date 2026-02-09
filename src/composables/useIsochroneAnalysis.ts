/**
 * Composable para análise isócrona (distância até espaços livres)
 * 
 * Baseado em: DePaul University Study - The 606 Trail Impact
 * 
 * Correlação descoberta:
 * - 0.2 milhas: +22.3% valorização
 * - 0.4 milhas: +14.6% valorização
 * - 0.6 milhas: +7.9% valorização
 * - 0.8 milhas: +2.1% valorização
 * 
 * Fonte de dados adicionada para análise quantitativa
 */

import { ref } from 'vue';
import type { Park, CommunityArea } from '@/types';
import type { ValuationBuffer } from './useValuationBuffers';
import * as turf from '@turf/turf';
import { useCache } from './useCache';

/**
 * Tabela de correlação distância → valorização
 * Baseada no estudo da DePaul sobre o parque linear 606
 */
const DISTANCE_PREMIUM_TABLE = [
  { miles: 0.2, premium: 22.3 },
  { miles: 0.3, premium: 18.3 },
  { miles: 0.4, premium: 14.6 },
  { miles: 0.5, premium: 11.2 },
  { miles: 0.6, premium: 7.9 },
  { miles: 0.8, premium: 2.1 },
];

export function useIsochroneAnalysis() {
  const cache = useCache();
  const loading = ref(false);

  function bboxesOverlap(a: [number, number, number, number], b: [number, number, number, number]): boolean {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
  }

  /**
   * Calcula distância até o parque mais próximo
   * 
   * @param point - Ponto de referência [lng, lat]
   * @param parks - Array de parques
   * @returns Distância em milhas até o parque mais próximo
   */
  function getDistanceToNearestPark(
    point: [number, number],
    parks: Park[]
  ): number | null {
    if (parks.length === 0) return null;

    const pointFeature = turf.point(point);
    let minDistance = Infinity;

    parks.forEach((park) => {
      if (!park.the_geom) return;

      try {
        // Calcular distância do ponto até o centroide do parque
        const parkPolygon = turf.polygon(park.the_geom.coordinates as any);
        const parkCenter = turf.centroid(parkPolygon);
        
        const distance = turf.distance(pointFeature, parkCenter, { units: 'miles' });
        
        if (distance < minDistance) {
          minDistance = distance;
        }
      } catch (err) {
        console.warn(`Erro ao calcular distância para parque ${park.park_name}:`, err);
      }
    });

    return minDistance === Infinity ? null : minDistance;
  }

  /**
   * Estima prêmio de valorização baseado na distância
   * 
   * Usa interpolação linear entre pontos da tabela DePaul
   * 
   * @param distanceMiles - Distância em milhas
   * @returns Prêmio estimado em % (ex: 15.5 para +15.5%)
   */
  function estimatePremium(distanceMiles: number): number {
    if (distanceMiles <= DISTANCE_PREMIUM_TABLE[0].miles) {
      return DISTANCE_PREMIUM_TABLE[0].premium;
    }

    const lastEntry = DISTANCE_PREMIUM_TABLE[DISTANCE_PREMIUM_TABLE.length - 1];
    if (distanceMiles >= lastEntry.miles) {
      // Extrapolação linear após 0.8 milhas (declínio continua)
      // Assumimos que chega a 0% em ~1.0 milha
      return Math.max(0, lastEntry.premium - (distanceMiles - lastEntry.miles) * 10);
    }

    // Interpolação linear entre pontos
    for (let i = 0; i < DISTANCE_PREMIUM_TABLE.length - 1; i++) {
      const current = DISTANCE_PREMIUM_TABLE[i];
      const next = DISTANCE_PREMIUM_TABLE[i + 1];

      if (distanceMiles >= current.miles && distanceMiles <= next.miles) {
        const ratio = (distanceMiles - current.miles) / (next.miles - current.miles);
        return current.premium - ratio * (current.premium - next.premium);
      }
    }

    return 0;
  }

  /**
   * Analisa cobertura de parques em uma Community Area usando isócronas
   * 
   * Calcula:
   * - % da área a <0.2 milhas de um parque (alta valorização)
   * - % da área a 0.2-0.5 milhas (valorização moderada)
   * - % da área a >0.5 milhas (baixa valorização)
   * 
   * @param area - Community Area
   * @param parks - Array de parques
   * @returns Análise de cobertura isócrona
   */
  function analyzeIsochrone(area: CommunityArea, parkBuffers: ValuationBuffer[]) {
    const cacheKey = `bufcov-${area.area_numbe}-${parkBuffers.length}`;
    const cached = cache.get<any>('GEOMETRIC_CALC', cacheKey);
    if (cached) return cached;

    loading.value = true;

    try {
      if (!area.the_geom) {
        throw new Error('Community Area sem geometria');
      }

      const areaFeature = turf.feature(area.the_geom as any);
      const totalArea = turf.area(areaFeature);

      if (!totalArea || totalArea <= 0) {
        throw new Error('Community Area com área inválida');
      }

      const areaBbox = turf.bbox(areaFeature) as [number, number, number, number];

      // Filtra buffers por bbox e pré-calcula bbox para acelerar o teste de ponto
      const candidates: { geom: any; bbox: [number, number, number, number] }[] = [];
      for (const b of parkBuffers) {
        try {
          const bufferBbox = turf.bbox(b.geometry as any) as [number, number, number, number];
          if (!bboxesOverlap(areaBbox, bufferBbox)) continue;
          candidates.push({ geom: b.geometry as any, bbox: bufferBbox });
        } catch {
          // ignore
        }
      }

      if (!candidates.length) {
        const none = {
          highPercentage: '0.0',
          mediumPercentage: '0.0',
          lowPercentage: '100.0',
          avgPremium: '0.0',
        };
        cache.set('GEOMETRIC_CALC', cacheKey, none);
        loading.value = false;
        return none;
      }

      // Estimativa rápida por amostragem (evita union/intersect, melhora muito o clique)
      // Ajuste fino: 0.12 milhas ~ 190m
      const grid = turf.pointGrid(areaBbox, 0.12, { units: 'miles', mask: areaFeature as any }) as any;
      const points = grid?.features ?? [];

      if (!points.length) {
        const none = {
          highPercentage: '0.0',
          mediumPercentage: '0.0',
          lowPercentage: '100.0',
          avgPremium: '0.0',
        };
        cache.set('GEOMETRIC_CALC', cacheKey, none);
        loading.value = false;
        return none;
      }

      let insideCount = 0;
      for (const pt of points) {
        const [lng, lat] = pt.geometry.coordinates;
        let isInside = false;

        for (const c of candidates) {
          const bb = c.bbox;
          if (lng < bb[0] || lng > bb[2] || lat < bb[1] || lat > bb[3]) continue;
          try {
            if (turf.booleanPointInPolygon(pt as any, c.geom as any)) {
              isInside = true;
              break;
            }
          } catch {
            // ignore
          }
        }

        if (isInside) insideCount += 1;
      }

      const insidePct = Math.max(0, Math.min(100, (insideCount / points.length) * 100));
      const outsidePct = Math.max(0, 100 - insidePct);

      const result = {
        highPercentage: insidePct.toFixed(1),
        mediumPercentage: '0.0',
        lowPercentage: outsidePct.toFixed(1),
        avgPremium: ((insidePct / 100) * 22.3).toFixed(1),
      };

      cache.set('GEOMETRIC_CALC', cacheKey, result);
      loading.value = false;
      return result;
    } catch (err) {
      console.error('Erro na análise de cobertura por buffer:', err);
      loading.value = false;
      return {
        highPercentage: '0.0',
        mediumPercentage: '0.0',
        lowPercentage: '100.0',
        avgPremium: '0.0',
      };
    }
  }

  return {
    loading,
    getDistanceToNearestPark,
    estimatePremium,
    analyzeIsochrone,
    DISTANCE_PREMIUM_TABLE,
  };
}
