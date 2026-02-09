/**
 * API Connection Validator
 * 
 * Testa conectividade com Chicago Data Portal antes do carregamento principal
 * Previne rate limiting e garante que o app está production-ready
 */

import { API_CONFIG, getChicagoHeaders } from './config';

export interface APIStatus {
  connected: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Valida conexão com a API do Chicago usando uma query mínima
 * Usa $limit=1 para economizar bandwidth
 */
export async function validateAPIConnection(): Promise<APIStatus> {
  const startTime = performance.now();
  
  try {
    const testUrl = `${API_CONFIG.BASE_URL}/resource/${API_CONFIG.ENDPOINTS.COMMUNITY_AREAS}.json?$limit=1`;
    
    const response = await fetch(testUrl, {
      headers: getChicagoHeaders(),
      signal: AbortSignal.timeout(5000), // Timeout de 5s
    });

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    if (!response.ok) {
      return {
        connected: false,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Verificar se retornou JSON válido
    const data = await response.json();
    
    if (!Array.isArray(data)) {
      return {
        connected: false,
        responseTime,
        error: 'Invalid API response format',
      };
    }

    console.log(`✅ API OK - Response time: ${responseTime}ms`);
    
    return {
      connected: true,
      responseTime,
    };
  } catch (error) {
    const endTime = performance.now();
    return {
      connected: false,
      responseTime: Math.round(endTime - startTime),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
