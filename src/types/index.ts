/**
 * Interfaces TypeScript para os datasets da City of Chicago API (Socrata)
 * 
 * Tipos base para Community Areas, Parks, Waterways e Property Data
 * Todos os tipos são estritamente definidos para evitar uso de 'any'
 */

/**
 * Representa uma Community Area da cidade de Chicago
 * Base territorial para agregação de dados
 */
export interface CommunityArea {
  area_numbe: string;        // Número da Community Area (1-77)
  community: string;          // Nome da Community Area
  shape_area: string;         // Área em unidades geográficas
  shape_len: string;          // Perímetro
  the_geom?: GeoJSONGeometry; // Geometria (polygon)
}

/**
 * Representa um parque do Chicago Park District
 * Dataset principal para análise de espaços livres
 */
export interface Park {
  park_no: number;            // ID único do parque
  park_name: string;          // Nome do parque
  location?: string;          // Endereço/descrição da localização
  acres?: number;             // Área em acres
  the_geom?: GeoJSONGeometry; // Geometria (polygon/multipolygon)
}

/**
 * Representa waterways (corpos d'água) de Chicago
 * Usado para análise de espaços livres complementares
 */
export interface Waterway {
  objectid: number;           // ID único
  name?: string;              // Nome do corpo d'água
  type?: string;              // Tipo (river, lake, canal, etc)
  the_geom?: GeoJSONGeometry; // Geometria (polygon/multipolygon)
}

/**
 * Representa dados agregados de valor de propriedade por Community Area
 * Fonte: Cook County Assessor's Office
 * Agregado para performance (não usar dataset completo)
 */
export interface PropertyData {
  community_area: string;     // Número da Community Area
  avg_property_value: number; // Valor médio agregado
  median_value: number;       // Mediana
  total_parcels: number;      // Total de parcelas na área
}

/**
 * GeoJSON Geometry padrão
 * Suporta Polygon e MultiPolygon (geometrias mais comuns)
 */
export interface GeoJSONGeometry {
  type: 'Polygon' | 'MultiPolygon' | 'Point' | 'LineString' | 'MultiLineString';
  coordinates: number[][] | number[][][] | number[][][][];
}

/**
 * Resposta genérica da API Socrata
 * Todas as respostas seguem esse padrão
 */
export interface SocrataResponse<T> {
  data: T[];
  meta?: {
    view: {
      id: string;
      name: string;
      attribution: string;
    };
  };
}

/**
 * Estado de uma Community Area selecionada
 * Inclui dados agregados para exibição no painel de análise
 */
export interface SelectedAreaData {
  area: CommunityArea;
  parks: Park[];
  totalParkAcres: number;
  parkCount: number;
  propertyValue?: PropertyData;
  nearbyWaterways: Waterway[];
  isochroneAnalysis?: IsochroneAnalysis; // Análise de cobertura por distância
}

/**
 * Análise isócrona de cobertura de parques
 * Baseada no estudo da DePaul University sobre The 606 Trail
 */
export interface IsochroneAnalysis {
  highPercentage: string;    // % da área a <0.2 milhas de parque (+22.3% valorização)
  mediumPercentage: string;  // % da área a 0.2-0.5 milhas (+11.2% valorização média)
  lowPercentage: string;     // % da área a >0.5 milhas (+2.1% valorização ou menos)
  avgPremium: string;        // Prêmio médio estimado de valorização (%)
}

/**
 * Configuração de camadas do mapa
 * Usado para toggle de visibilidade
 * 
 * ATUALIZADO: Suporta hierarquia (layers filhas via parent)
 */
export interface LayerConfig {
  id: string;
  name: string;
  visible: boolean;
  color: string;
  type: 'fill' | 'line' | 'symbol';
  parent?: string; // Para layers hierárquicas (ex: buffers são filhos de parks)
}

/**
 * Estado de loading da aplicação
 * Usado para skeleton loading e feedback visual
 */
export interface LoadingState {
  communityAreas: boolean;
  parks: boolean;
  waterways: boolean;
  propertyData: boolean;
}
