<script setup lang="ts">
/**
 * CityMap.vue
 * 
 * Componente principal do mapa usando Mapbox GL JS
 * 
 * Responsabilidades:
 * - Inicializar Mapbox com token do .env
 * - Renderizar camadas (Community Areas, Parks)
 * - Detectar click em Community Area e emitir evento
 * - Consumir dados prontos dos composables (NÃO faz fetch)
 * 
 * O mapa é contexto espacial - a sidebar é o produto
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import mapboxgl from 'mapbox-gl';
import type { Map } from 'mapbox-gl';
import type { Park, CommunityArea } from '@/types';
import type { ValuationBuffer } from '@/composables/useValuationBuffers';
import { VALUATION_CONFIG } from '@/composables/useValuationBuffers';
import * as turf from '@turf/turf';
import { useI18n } from '@/i18n';
import { useIsochroneAnalysis } from '@/composables/useIsochroneAnalysis';

// Props
interface Props {
  parks?: Park[];
  communityAreas?: CommunityArea[];
  valuationBuffers?: ValuationBuffer[];
  selectedArea?: string | null;
  layerVisibility?: Record<string, boolean>;
}

const props = withDefaults(defineProps<Props>(), {
  parks: () => [],
  communityAreas: () => [],
  valuationBuffers: () => [],
  selectedArea: null,
  layerVisibility: () => ({}),
});

// Emits
const emit = defineEmits<{
  areaClick: [areaNumber: string];
}>();

// Estado local
const mapContainer = ref<HTMLDivElement | null>(null);
let map: Map | null = null;

// Tooltip de hover (status dentro/fora do buffer)
let hoverPopup: mapboxgl.Popup | null = null;
let onMapMouseMove: ((e: mapboxgl.MapMouseEvent) => void) | null = null;
let onMapMouseOut: (() => void) | null = null;

const { t } = useI18n();
const { analyzeIsochrone } = useIsochroneAnalysis();

let criticalStatesComputed = false;
let criticalComputationInProgress = false;

async function ensureCriticalAreaStates(): Promise<void> {
  if (!map) return;
  if (criticalStatesComputed || criticalComputationInProgress) return;
  if (!map.getSource('community-areas')) return;
  if (!props.communityAreas.length || !props.valuationBuffers.length) return;

  criticalComputationInProgress = true;
  try {
    // Marca todas as áreas como critical true/false (para ser determinístico)
    for (let i = 0; i < props.communityAreas.length; i++) {
      const area = props.communityAreas[i];
      const analysis = analyzeIsochrone(area, props.valuationBuffers);
      const outside = parseFloat(analysis?.lowPercentage ?? '0');
      const isCritical = Number.isFinite(outside) ? outside >= 30 : false;

      map.setFeatureState(
        { source: 'community-areas', id: area.area_numbe as any },
        { critical: isCritical }
      );

      // Yield para não travar a UI
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    criticalStatesComputed = true;
  } finally {
    criticalComputationInProgress = false;
  }
}

type ParkBoundaryEntry = {
  bbox: [number, number, number, number];
  boundaries: any[];
};

let parkBoundaryIndex: ParkBoundaryEntry[] = [];
let parkBoundaryIndexCount = 0;

function buildParkBoundaryIndex(): void {
  if (!props.parks.length) {
    parkBoundaryIndex = [];
    parkBoundaryIndexCount = 0;
    return;
  }

  const result: ParkBoundaryEntry[] = [];
  props.parks.forEach((park) => {
    if (!park.the_geom) return;
    try {
      const geom = park.the_geom as any;
      const feature = turf.feature(geom);
      const bbox = turf.bbox(feature) as [number, number, number, number];
      const boundary = turf.polygonToLine(feature as any);
      if (!boundary) return;

      const boundaries = (boundary as any).type === 'FeatureCollection'
        ? (boundary as any).features
        : [boundary];

      if (!boundaries?.length) return;
      result.push({ bbox, boundaries });
    } catch {
      // ignorar geometrias inválidas
    }
  });

  parkBoundaryIndex = result;
  parkBoundaryIndexCount = props.parks.length;
}

function getDistanceToNearestParkBoundaryMiles(lng: number, lat: number, maxMiles: number): number | null {
  if (!parkBoundaryIndex.length) return null;

  const point = turf.point([lng, lat]);

  // Filtro rápido por bbox expandida (aproximação em graus)
  const deltaLat = maxMiles / 69;
  const deltaLng = maxMiles / (69 * Math.cos((lat * Math.PI) / 180));
  const pointBbox: [number, number, number, number] = [
    lng - deltaLng,
    lat - deltaLat,
    lng + deltaLng,
    lat + deltaLat,
  ];

  let minDistance = Infinity;
  for (const entry of parkBoundaryIndex) {
    const b = entry.bbox;
    const overlaps = pointBbox[0] <= b[2] && pointBbox[2] >= b[0] && pointBbox[1] <= b[3] && pointBbox[3] >= b[1];
    if (!overlaps) continue;

    for (const line of entry.boundaries) {
      try {
        const d = turf.pointToLineDistance(point, line, { units: 'miles' });
        if (d < minDistance) minDistance = d;
      } catch {
        // ignore
      }
    }
  }

  return minDistance === Infinity ? null : minDistance;
}

// Bounding Box para o Condadod de Cook

const COOK_COUNTY_BOUNDS: [[number, number], [number, number]] = [
  [-87.9401, 41.6445],
  [-87.5237, 42.0230],
];


/**
 * Inicializa o mapa Mapbox
 */
onMounted(() => {
  if (!mapContainer.value) return;

  // Token do Mapbox vem do .env.local
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  mapboxgl.accessToken = token;

  // Inicializa mapa focado em Chicago
  map = new mapboxgl.Map({
    container: mapContainer.value!,
    style: 'mapbox://styles/arthursilva/cmldsn4t600d901qqcnibgdft?fresh=true',
    center: [-87.62, 41.88], // Chicago
    zoom: 16,
    pitch: 90,
    bearing: 0,
    antialias: true,
    maxBounds: COOK_COUNTY_BOUNDS
  });

  // Adiciona controles de navegação (zoom, rotação)
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right');

  map.scrollZoom.enable();
  map.scrollZoom.setWheelZoomRate(1 / 1000);
  map.scrollZoom.setZoomRate(1 / 100);

  const isMapReady = ref(false);


  // Aguarda carregamento do mapa antes de adicionar camadas
  map.on('load', () => {
    if (!map) return;
   setupLayers();
   isMapReady.value = true;
      map.flyTo({
      center: [-87.6298, 41.8781], // Chicago
      zoom: 11,
      pitch: 0,
      bearing: -20,
      speed: 0.1,
      curve: 4,
      easing: (t) => t,
      essential: true
      });
      // TODO: Adicionar camadas na Fase 2
      setupLayers();

      // Hover tooltip (independente de Community Area)
      if (!hoverPopup) {
        hoverPopup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '320px',
          className: 'chi-hover-tooltip',
          offset: 14,
        });
      }

      if (!onMapMouseMove) {
        onMapMouseMove = (e: mapboxgl.MapMouseEvent) => {
          if (!map || !hoverPopup) return;

          // Tooltip só pode aparecer quando a layer Park Valuation Buffers estiver ligada
          if (!props.layerVisibility['park-buffers']) {
            hoverPopup.remove();
            return;
          }

          // Regra: tooltip só aparece dentro do perímetro das Community Areas
          // Usa uma layer de query invisível (sempre visible) para não depender do toggle.
          if (!map.getSource('community-areas') || !map.getLayer('community-areas-query-layer')) {
            hoverPopup.remove();
            return;
          }

          const insideCommunityArea = map.queryRenderedFeatures(e.point, {
            layers: ['community-areas-query-layer'],
          }).length > 0;

          if (!insideCommunityArea) {
            hoverPopup.remove();
            return;
          }

          // Só ativar quando o source do buffer estiver disponível
          if (!map.getSource('park-buffer') || !map.getLayer('park-buffer-query-layer')) {
            hoverPopup.remove();
            return;
          }

          const hits = map.queryRenderedFeatures(e.point, {
            layers: ['park-buffer-query-layer'],
          });

          const inside = hits.length > 0;

          const maxPremium = 22.3;
          const outsideBars = [
            { miles: 0.3, premium: 18 },
            { miles: 0.4, premium: 15 },
            { miles: 0.5, premium: 11 },
            { miles: 0.6, premium: 8 },
          ];

          // Se estiver fora do buffer imediato, checar se é > 0.6mi (nesse caso não pode ter barrinhas)
          const distanceMiles = inside
            ? 0
            : getDistanceToNearestParkBoundaryMiles(e.lngLat.lng, e.lngLat.lat, 0.6);
          const isBeyond06 = !inside && (distanceMiles === null || distanceMiles > 0.6);

          // Emoji só em dois estados:
          // - Dentro do buffer imediato: 👍
          // - 0.6+ mi: 👎
          // No estado intermediário: sem emoji
          const emoji = inside ? '👍' : (isBeyond06 ? '👎' : '');
          const emojiHtml = emoji
            ? `<div class="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl leading-none">${emoji}</div>`
            : '';

          const content = inside
            ? `<div class="space-y-2">
                <div class="text-center">
                  <div class="text-xs text-gray-400">${t('map.tooltip.immediate')}</div>
                  <div class="text-lg font-semibold text-chi-action">+22%</div>
                </div>
                <div class="h-2 w-full bg-white/10 rounded overflow-hidden">
                  <div class="h-full bg-chi-action" style="width:100%"></div>
                </div>
              </div>`
            : isBeyond06
            ? `<div class="space-y-2">
                <div class="text-center">
                  <div class="text-xs text-gray-400">${t('map.tooltip.nearestPark')}</div>
                  <div class="text-lg font-semibold text-gray-100">${t('map.tooltip.none')}</div>
                  <div class="text-sm font-semibold text-chi-action"></div>
                </div>
              </div>`
            : `<div class="space-y-2">
                <div class="text-center">
                  <div class="text-xs text-gray-400">${t('map.tooltip.byDistance')}</div>
                </div>
                <div class="flex items-end justify-center gap-2 pt-1">
                  ${outsideBars
                    .map((b, idx) => {
                      const heightPx = Math.max(10, Math.round((b.premium / maxPremium) * 46));
                      const opacity = [0.9, 0.75, 0.6, 0.45][idx] ?? 0.6;
                      return `
                        <div class="flex flex-col items-center gap-1">
                          <div class="w-5 bg-chi-action rounded" style="height:${heightPx}px; opacity:${opacity}"></div>
                          <div class="text-[10px] text-gray-300">${b.miles.toFixed(1)} mi</div>
                          <div class="text-[10px] text-chi-action font-semibold">+${b.premium}%</div>
                        </div>`;
                    })
                    .join('')}
                </div>
              </div>`;

          hoverPopup
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="relative w-72">
                ${emojiHtml}
                <div class="bg-chi-sidebar border border-white/10 rounded-lg shadow-2xl px-4 py-3 pt-6 text-center">
                  ${content}
                  <div class="mt-2 text-[10px] text-gray-400">${t('map.tooltip.methodology')}</div>
                </div>
              </div>`
            )
            .addTo(map);
        };
        map.on('mousemove', onMapMouseMove);
      }

      if (!onMapMouseOut) {
        onMapMouseOut = () => {
          if (hoverPopup) hoverPopup.remove();
        };
        map.getCanvas().addEventListener('mouseout', onMapMouseOut);
      }
  });

  // Error handler para problemas no Mapbox
  map.on('error', (e) => {
    console.error('Mapbox error:', e.error);
  });

  // Click handler para Community Areas
  map.on('click', 'community-areas-fill', (e) => {
    if (e.features && e.features[0]) {
      const areaNumber = e.features[0].properties?.area_numbe;
      if (areaNumber) {
        emit('areaClick', areaNumber);
      }
    }
  });

  // Click handler para Critical Areas (deve abrir a mesma análise)
  map.on('click', 'critical-areas-fill', (e) => {
    if (e.features && e.features[0]) {
      const areaNumber = e.features[0].properties?.area_numbe;
      if (areaNumber) {
        emit('areaClick', areaNumber);
      }
    }
  });

  // Cursor pointer ao hover em Community Areas
  map.on('mouseenter', 'community-areas-fill', () => {
    if (map) map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'community-areas-fill', () => {
    if (map) map.getCanvas().style.cursor = '';
  });

  map.on('mouseenter', 'critical-areas-fill', () => {
    if (map) map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'critical-areas-fill', () => {
    if (map) map.getCanvas().style.cursor = '';
  });
});

onUnmounted(() => {
  if (!map) return;
  if (onMapMouseMove) {
    map.off('mousemove', onMapMouseMove);
    onMapMouseMove = null;
  }
  if (onMapMouseOut) {
    map.getCanvas().removeEventListener('mouseout', onMapMouseOut);
    onMapMouseOut = null;
  }
  if (hoverPopup) {
    hoverPopup.remove();
    hoverPopup = null;
  }
});

/**
 * Configura camadas do mapa com dados GeoJSON reais
 * 
 * Camadas criadas:
 * 1. Community Areas - contorno sutil (line)
 * 2. Community Areas - fill transparente para click (fill)
 * 3. Parks - polígonos verdes (fill)
 * 4. Valuation Buffers (Parks) - 4 zonas de distância (fill)
 */
function setupLayers(): void {
  if (!map) {
    console.warn('setupLayers: map not initialized');
    return;
  }

  console.log('=== SETUP LAYERS ===');
  console.log('Community Areas:', props.communityAreas.length);
  console.log('Parks:', props.parks.length);
  console.log('Valuation Buffers:', props.valuationBuffers.length);

  // Aguardar dados serem carregados
  if (props.communityAreas.length === 0 && props.parks.length === 0) {
    console.log('Waiting for data to load...');
    return;
  }

  console.log('Setting up map layers with real data...');

  // 1. COMMUNITY AREAS
  if (props.communityAreas.length > 0) {
    // Converter para FeatureCollection GeoJSON
    const communityAreasGeoJSON = {
      type: 'FeatureCollection' as const,
      features: props.communityAreas.map((area) => ({
        type: 'Feature' as const,
        id: area.area_numbe,
        properties: {
          area_numbe: area.area_numbe,
          community: area.community,
        },
        geometry: area.the_geom || { type: 'Polygon', coordinates: [] },
      })),
    };

    // Source
    if (!map.getSource('community-areas')) {
      map.addSource('community-areas', {
        type: 'geojson',
        data: communityAreasGeoJSON as any,
      });
    }

    // Layer invisível para limitar tooltip ao perímetro das Community Areas
    // (sempre visível para não depender do toggle)
    if (!map.getLayer('community-areas-query-layer')) {
      map.addLayer({
        id: 'community-areas-query-layer',
        type: 'fill',
        source: 'community-areas',
        layout: {
          visibility: 'visible',
        },
        paint: {
          'fill-color': '#ffffff',
          'fill-opacity': 0.001,
        },
      });
    }

    // Layer - Fill (transparente, para click)
    if (!map.getLayer('community-areas-fill')) {
      map.addLayer({
        id: 'community-areas-fill',
        type: 'fill',
        source: 'community-areas',
        layout: {
          visibility: props.layerVisibility['community-areas'] ? 'visible' : 'none',
        },
        paint: {
          'fill-color': '#FF69B4',
          'fill-opacity': 0.5, // Quase invisível, apenas para capturar clicks
        },
      });
    }

    // Layer - Line (contorno sutil)
    if (!map.getLayer('community-areas-line')) {
      map.addLayer({
        id: 'community-areas-line',
        type: 'line',
        source: 'community-areas',
        layout: {
          visibility: props.layerVisibility['community-areas'] ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#FF69B4',
          'line-width': 1,
          'line-opacity': 1,
        },
      });
    }

    // Layer - Critical Areas (subset via feature-state)
    if (!map.getLayer('critical-areas-fill')) {
      map.addLayer({
        id: 'critical-areas-fill',
        type: 'fill',
        source: 'community-areas',
        layout: {
          visibility: props.layerVisibility['critical-areas'] ? 'visible' : 'none',
        },
        paint: {
          'fill-color': '#DCA498',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'critical'], false],
            0.35,
            0,
          ],
        },
      });
    }

    if (!map.getLayer('critical-areas-line')) {
      map.addLayer({
        id: 'critical-areas-line',
        type: 'line',
        source: 'community-areas',
        layout: {
          visibility: props.layerVisibility['critical-areas'] ? 'visible' : 'none',
        },
        paint: {
          'line-color': '#DCA498',
          'line-width': 2,
          'line-opacity': [
            'case',
            ['boolean', ['feature-state', 'critical'], false],
            0.9,
            0,
          ],
        },
      });
    }
  }

  // 2. PARKS
  if (props.parks.length > 0) {
    if (parkBoundaryIndexCount !== props.parks.length) {
      buildParkBoundaryIndex();
    }

    const parksGeoJSON = {
      type: 'FeatureCollection' as const,
      features: props.parks.map((park) => ({
        type: 'Feature' as const,
        properties: {
          park_no: park.park_no,
          park_name: park.park_name,
          acres: park.acres || 0,
        },
        geometry: park.the_geom || { type: 'Polygon', coordinates: [] },
      })),
    };

    if (!map.getSource('parks')) {
      map.addSource('parks', {
        type: 'geojson',
        data: parksGeoJSON as any,
      });
    }

    if (!map.getLayer('parks')) {
      map.addLayer({
        id: 'parks',
        type: 'fill',
        source: 'parks',        layout: {
          visibility: props.layerVisibility['parks'] ? 'visible' : 'none',
        },        paint: {
          'fill-color': '#10b981', // Verde vibrante para dark mode
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9,  0.35,
            12, 0.55,
            15, 0.75
          ],
          'fill-outline-color': 'rgba(255,255,255,0.2)',
        },
      });
    }
  }
  
  // 3. HEATMAP LAYER (Visualização de longe - Zoom 9-14)
  if (props.parks.length > 0) {
    console.log('🔥 Creating heatmap for overview');
    
    const parkPoints = {
      type: 'FeatureCollection' as const,
      features: props.parks
        .filter(park => park.the_geom)
        .map((park) => {
          try {
            const center = turf.centroid(park.the_geom as any);
            return {
              type: 'Feature' as const,
              properties: {
                weight: park.acres || 1,
              },
              geometry: center.geometry,
            };
          } catch (err) {
            return null;
          }
        })
        .filter(f => f !== null),
    };

    if (!map.getSource('parks-heatmap')) {
      map.addSource('parks-heatmap', {
        type: 'geojson',
        data: parkPoints as any,
      });
    }

    if (!map.getLayer('parks-heatmap-layer')) {
      map.addLayer({
        id: 'parks-heatmap-layer',
        type: 'heatmap',
        source: 'parks-heatmap',
        layout: {
          visibility: props.layerVisibility['park-buffers'] ? 'visible' : 'none',
        },
        paint: {
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 15,
            13, 40,
            15, 60,  // Mantém tamanho razoável
            16, 70   // Continua até bem de perto
          ],
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'weight'],
            0, 0,
            50, 1
          ],
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0.6,
            13, 1.0,
            15, 1.2,  // Mantém forte
            16, 0.8   // Começa a reduzir só muito perto
          ],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255, 255, 255, 0)',
            0.2, '#D8E4F4',
            0.4, '#BCD1E8',
            0.6, '#A1BDDC',
            0.8, '#87ABD0',
            1, '#6B97C2'
          ],
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0.7,   // Visível de longe
            12, 0.8,  // Médio
            13, 0.6,  // Começa a reduzir
            14, 0     // Desaparece completamente
          ]
        },
      }, 'parks');
      console.log('✅ Heatmap layer (zoom 9-13)');
    }
  }

  // 4. VALUATION BUFFER (Simplificado: 1 buffer de 0.2 milhas - Zoom 14+)
  if (props.valuationBuffers.length > 0) {
    const parkBuffers = props.valuationBuffers.filter(b => b.sourceType === 'park');

    console.log('📊 Creating simplified buffer (0.2mi) for close view');

    const sourceId = 'park-buffer';
    const layerId = 'park-buffer-layer';

    const bufferGeoJSON = {
      type: 'FeatureCollection' as const,
      features: parkBuffers.map(b => b.geometry),
    };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: bufferGeoJSON,
      });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        layout: {
          visibility: props.layerVisibility['park-buffers'] ? 'visible' : 'none',
        },
        paint: {
          'fill-color': VALUATION_CONFIG.color,
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 0,
            13, 0,
            14, VALUATION_CONFIG.opacity * 0.5,
            15, VALUATION_CONFIG.opacity * 0.8,
            16, VALUATION_CONFIG.opacity,
          ],
        },
      }, 'parks');
    }

    // Layer invisível para queryRenderedFeatures no hover (sempre ativa)
    // Mantém opacidade mínima para garantir renderização/consulta sem poluir o mapa.
    const queryLayerId = 'park-buffer-query-layer';
    if (!map.getLayer(queryLayerId)) {
      map.addLayer({
        id: queryLayerId,
        type: 'fill',
        source: sourceId,
        layout: {
          visibility: 'visible',
        },
        paint: {
          'fill-color': VALUATION_CONFIG.color,
          'fill-opacity': 0.001,
        },
      }, 'parks');
    }

    console.log('✅ Simplified buffer layer ready');
  }

  console.log('Map layers configured (hybrid: heatmap far, buffers near)');
}

/**
 * Watch para atualizar highlight da área selecionada
 */
watch(() => props.selectedArea, (newArea, oldArea) => {
  if (!map) return;
  
  // Remover highlight anterior
  if (oldArea && map.getLayer('community-areas-fill')) {
    map.setPaintProperty('community-areas-fill', 'fill-color', '#ffffff');
  }

  // Adicionar highlight na nova área
  if (newArea && map.getLayer('community-areas-fill')) {
    map.setPaintProperty('community-areas-fill', 'fill-color', [
      'case',
      ['==', ['get', 'area_numbe'], newArea],
      '#DCA498', // chi-accent
      '#ffffff'
    ]);
    map.setPaintProperty('community-areas-fill', 'fill-opacity', [
      'case',
      ['==', ['get', 'area_numbe'], newArea],
      0.2,
      0.01
    ]);
  }
});

/**
 * Watch para atualizar camadas quando dados chegarem
 */
watch(
  () => [props.communityAreas.length, props.parks.length, props.valuationBuffers.length],
  ([areas, parks, buffers]) => {
    if (map && map.isStyleLoaded() && (areas > 0 || parks > 0 || buffers > 0)) {
      console.log(`Data changed - updating layers. Areas: ${areas}, Parks: ${parks}, Buffers: ${buffers}`);
      setupLayers();
    }
  }
);

/**
 * Watch para controlar visibilidade de camadas
 */
watch(
  () => props.layerVisibility,
  (visibility) => {
    if (!map) return;

    // Community Areas
    if (visibility['community-areas'] !== undefined) {
      const vis = visibility['community-areas'] ? 'visible' : 'none';
      if (map.getLayer('community-areas-line')) {
        map.setLayoutProperty('community-areas-line', 'visibility', vis);
      }
      if (map.getLayer('community-areas-fill')) {
        map.setLayoutProperty('community-areas-fill', 'visibility', vis);
      }
    }

    // Critical Areas
    if (visibility['critical-areas'] !== undefined) {
      const vis = visibility['critical-areas'] ? 'visible' : 'none';
      if (map.getLayer('critical-areas-fill')) {
        map.setLayoutProperty('critical-areas-fill', 'visibility', vis);
      }
      if (map.getLayer('critical-areas-line')) {
        map.setLayoutProperty('critical-areas-line', 'visibility', vis);
      }

      if (visibility['critical-areas']) {
        // Computa só quando o usuário ligar
        void ensureCriticalAreaStates();
      }
    }

    // Parks
    if (visibility['parks'] !== undefined && map.getLayer('parks')) {
      const vis = visibility['parks'] ? 'visible' : 'none';
      map.setLayoutProperty('parks', 'visibility', vis);
    }

    // Park Valuation Buffers (Híbrido: heatmap + buffers)
    if (visibility['park-buffers'] !== undefined) {
      const vis = visibility['park-buffers'] ? 'visible' : 'none';

      // Se desligar, esconder tooltip imediatamente
      if (!visibility['park-buffers'] && hoverPopup) {
        hoverPopup.remove();
      }
      
      // Limitar pitch quando buffers estão ativos (melhor visualização 2D)
      if (visibility['park-buffers']) {
        map.setMaxPitch(50);
        // Suavemente ajustar pitch se estiver muito inclinado
        if (map.getPitch() > 50) {
          map.easeTo({ pitch: 50, duration: 1000 });
        }
      } else {
        map.setMaxPitch(85); // Restaurar limite padrão
      }
      
      // Heatmap (longe)
      if (map.getLayer('parks-heatmap-layer')) {
        map.setLayoutProperty('parks-heatmap-layer', 'visibility', vis);
      }
      
      // Buffer simplificado (perto)
      if (map.getLayer('park-buffer-layer')) {
        map.setLayoutProperty('park-buffer-layer', 'visibility', vis);
      }
    }
  },
  { deep: true }
);
</script>

<template>
  <div 
    ref="mapContainer" 
    class="w-full h-full bg-chi-map"
    aria-label="Interactive map of Chicago parks and community areas"
  />
</template>

<style scoped>
/* Estilos específicos do componente de mapa */
/* Mapbox canvas já é estilizado globalmente no style.css */
</style>
