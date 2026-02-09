/**
 * API Client para consumo dos datasets da City of Chicago
 * 
 * Todas as chamadas HTTP isoladas aqui
 * Zero lógica de visualização - apenas fetch + parse + tipagem
 */

import type { Park, Waterway, CommunityArea } from '@/types';
import { buildSocrataQuery, API_CONFIG, getChicagoHeaders, getCookCountyHeaders } from './config';

/**
 * Busca Community Areas (77 divisões territoriais de Chicago)
 * 
 * Endpoint: igwz-8jzy (Boundaries - Community Areas)
 * Retorna geometria GeoJSON (MultiPolygon) para cada área
 * 
 * @returns Array de Community Areas com geometria
 */
export async function fetchCommunityAreas(): Promise<CommunityArea[]> {
  try {
    console.log('🏛️ [COMMUNITY AREAS] Starting fetch...');
    const url = buildSocrataQuery(API_CONFIG.ENDPOINTS.COMMUNITY_AREAS, {
      limit: API_CONFIG.LIMITS.DEFAULT,
    });

    const response = await fetch(url, {
      headers: getChicagoHeaders(), // City of Chicago domain
    });
    
    console.log('🏛️ [COMMUNITY AREAS] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🏛️ [COMMUNITY AREAS] Error response:', errorText);
      throw new Error(`Failed to fetch community areas: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🏛️ [COMMUNITY AREAS] ✅ Fetched', data.length, 'areas');
    
    // Endpoint /resource/ retorna array direto
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('🏛️ [COMMUNITY AREAS] ❌ Error:', error);
    throw error;
  }
}

/**
 * Busca lista de parques (Parks - Chicago Park District)
 * 
 * @returns Array de parques com geometria GeoJSON
 */
export async function fetchParks(): Promise<Park[]> {
  try {
    console.log('🌳 [PARKS] Starting fetch...');
    const url = buildSocrataQuery(API_CONFIG.ENDPOINTS.PARKS, {
      limit: API_CONFIG.LIMITS.DEFAULT,
    });

    const response = await fetch(url, {
      headers: getChicagoHeaders(), // City of Chicago domain
    });
    
    console.log('🌳 [PARKS] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🌳 [PARKS] Error response:', errorText);
      throw new Error(`Failed to fetch parks: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('🌳 [PARKS] ✅ Fetched', data.length, 'parks');
    
    // Endpoint /resource/ retorna array direto
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('🌳 [PARKS] ❌ Error:', error);
    throw error;
  }
}

/**
 * Busca parcel (lote) específico por coordenadas (lat/lng)
 * 
 * IMPORTANTE: Fetch sob demanda (não carregar todos os lotes)
 * Usa spatial query para encontrar lote no ponto clicado
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Dados do parcel ou null se não encontrado
 */
export async function fetchParcelByLocation(lat: number, lng: number): Promise<any | null> {
  try {
    console.log(`📍 [PARCEL] Fetching at (${lat}, ${lng})...`);
    
    // Cook County GIS - endpoint público
    const url = buildSocrataQuery(API_CONFIG.ENDPOINTS.PARCELS_GIS, {
      limit: 1,
      where: `within_circle(the_geom,${lat},${lng},50)`, // 50 metros de raio
    });
    
    console.log('📍 [PARCEL] URL:', url);
    
    const response = await fetch(url, {
      headers: getCookCountyHeaders(), // CRÍTICO: Cook County domain!
    });
    
    console.log('📍 [PARCEL] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.warn('📍 [PARCEL] Error response:', errorText);
      return null;
    }

    const data = await response.json();
    const parcels = Array.isArray(data) ? data : [];
    
    if (parcels.length === 0) {
      console.log('📍 [PARCEL] No parcel found at this location');
      return null;
    }

    console.log('📍 [PARCEL] ✅ Parcel found:', parcels[0]);
    return parcels[0];
  } catch (error) {
    console.error('📍 [PARCEL] ❌ Error:', error);
    return null;
  }
}

/**
 * Busca dados de propriedades do Cook County Assessor
 * 
 * OBSOLETO: Substituído pela metodologia DePaul University
 * Não usar property value real - usar simulação baseada em proximidade
 * 
 * @returns Array vazio
 */
export async function fetchPropertyData(): Promise<any[]> {
  console.warn('Property Data fetch DEPRECATED - using DePaul methodology instead');
  return [];
}
