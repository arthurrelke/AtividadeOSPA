/**
 * Composable para análise de parcels (lotes) e valorização imobiliária
 * 
 * CORE DO PROJETO: Real Estate Feasibility Analysis
 * 
 * Responsabilidades:
 * - Fetch de parcel sob demanda (click no mapa)
 * - Cálculo de distância até parque mais próximo
 * - Aplicação da metodologia DePaul (correlação distância → valorização)
 * - Simulação financeira (valor base → valor valorizado)
 * 
 * Metodologia DePaul University - The 606 Trail Impact Study
 */

import { ref } from 'vue';
import type { Ref } from 'vue';
import type { Park } from '@/types';
import { fetchParcelByLocation } from '@/api/chicago';
import { VALUATION_CONFIG } from './useValuationBuffers';
import * as turf from '@turf/turf';

export interface ParcelAnalysisResult {
  parcel: any; // Dados brutos do parcel
  isInValuationZone: boolean;
  nearestAsset: {
    type: 'park';
    name: string;
    distanceMiles: number;
  } | null;
  valuation: {
    premium: number; // % (ex: 14.6)
    baseValue: number; // Valor fictício base
    valuatedValue: number; // Valor após valorização
  } | null;
}

export function useParcelAnalysis() {
  const loading = ref(false);
  const currentAnalysis = ref<ParcelAnalysisResult | null>(null) as Ref<ParcelAnalysisResult | null>;
  const error = ref<string | null>(null);

  /**
   * Calcula distância do parcel até o perímetro do parque mais próximo
   * 
   * @param parcelGeometry - Geometria do parcel (point ou polygon)
   * @param assets - Array de Parks
   * @returns Distância em milhas e nome do ativo
   */
  function getDistanceToNearestAsset(
    parcelGeometry: GeoJSON.Point | GeoJSON.Polygon,
    assets: Park[],
    assetType: 'park'
  ): { name: string; distanceMiles: number } | null {
    if (assets.length === 0) return null;

    // Converter parcel para point (usar centroid se for polygon)
    const parcelPoint = parcelGeometry.type === 'Point'
      ? turf.point(parcelGeometry.coordinates as [number, number])
      : turf.centroid(parcelGeometry as any);

    let minDistance = Infinity;
    let nearestAssetName = '';

    assets.forEach((asset) => {
      if (!asset.the_geom) return;

      try {
        // Suportar Polygon e MultiPolygon (Chicago Parks costuma vir como MultiPolygon)
        // Calcular distância até o PERÍMETRO (não centroid)
        // Usar pointToLineDistance com o boundary do polygon
        const boundary = turf.polygonToLine(asset.the_geom as any);
        const distance = turf.pointToLineDistance(parcelPoint as any, boundary as any, { units: 'miles' });

        if (distance < minDistance) {
          minDistance = distance;
          nearestAssetName = (asset as Park).park_name;
        }
      } catch (err) {
        console.warn(`Erro ao calcular distância para ${assetType}:`, err);
      }
    });

    return minDistance === Infinity
      ? null
      : { name: nearestAssetName, distanceMiles: minDistance };
  }

  /**
   * Aplica a tabela DePaul para calcular prêmio de valorização
   * 
   * @param distanceMiles - Distância em milhas
   * @returns Prêmio em % ou 0 se fora da zona
   */
  function calculatePremium(distanceMiles: number): number {
    return distanceMiles <= VALUATION_CONFIG.distance ? VALUATION_CONFIG.premium : 0;
  }

  /**
   * Analisa parcel clicado no mapa
   * 
   * FLUXO:
   * 1. Fetch parcel via API (lat/lng)
   * 2. Calcular distância até parque mais próximo
   * 3. Aplicar metodologia DePaul
   * 4. Simular valorização financeira
   * 
   * @param lat - Latitude do click
   * @param lng - Longitude do click
   * @param parks - Array de parques
   */
  async function analyzeParcel(
    lat: number,
    lng: number,
    parks: Park[]
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    currentAnalysis.value = null;

    try {
      // 1. Fetch parcel
      console.log('Fetching parcel data...');
      const parcelData = await fetchParcelByLocation(lat, lng);

      if (!parcelData) {
        error.value = 'No parcel found at this location';
        loading.value = false;
        return;
      }

      // 2. Criar ponto do parcel
      const parcelPoint: GeoJSON.Point = {
        type: 'Point',
        coordinates: [lng, lat],
      };

      // 3. Calcular distância até parque mais próximo
      const nearestPark = getDistanceToNearestAsset(parcelPoint, parks, 'park');

      console.log('Nearest park:', nearestPark);

      // 4. Verificar se está dentro da zona de valorização
      if (!nearestPark || nearestPark.distanceMiles > 0.8) {
        // Fora da zona (> 0.8 mi)
        currentAnalysis.value = {
          parcel: parcelData,
          isInValuationZone: false,
          nearestAsset: null,
          valuation: null,
        };
        loading.value = false;
        return;
      }

      // 5. Calcular prêmio de valorização (metodologia DePaul)
      const premium = calculatePremium(nearestPark.distanceMiles);

      // 6. Simular valorização financeira
      const baseValue = 1000; // Valor fictício base
      const valuatedValue = baseValue * (1 + premium / 100);

      // 7. Retornar análise completa
      currentAnalysis.value = {
        parcel: parcelData,
        isInValuationZone: true,
        nearestAsset: {
          type: 'park',
          name: nearestPark.name,
          distanceMiles: nearestPark.distanceMiles,
        },
        valuation: {
          premium,
          baseValue,
          valuatedValue,
        },
      };

      console.log('Analysis complete:', currentAnalysis.value);
    } catch (err) {
      console.error('Error analyzing parcel:', err);
      error.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading.value = false;
    }
  }

  /**
   * Limpa análise atual
   */
  function clearAnalysis(): void {
    currentAnalysis.value = null;
    error.value = null;
  }

  return {
    // Estado
    loading,
    currentAnalysis,
    error,

    // Métodos
    analyzeParcel,
    clearAnalysis,
  };
}
