/**
 * Composable para gerenciamento de camadas do mapa
 * 
 * Responsabilidades:
 * - Controle de visibilidade de camadas
 * - Toggle layers (Parks, Community Areas, Buffers)
 * - Estado de configuração do mapa
 * 
 * ATUALIZADO: Inclui buffers de valorização hierárquicos
 */

import { ref } from 'vue';
import type { Ref } from 'vue';
import type { LayerConfig } from '@/types';

export function useMapLayers() {
  /**
   * Configuração inicial das camadas do mapa
   * 
   * Estrutura hierárquica:
   * - Community Areas (base)
   * - Parks (base)
   *   └─ Park Valuation Buffers (filho)
   */
  const layers = ref<LayerConfig[]>([
    {
      id: 'community-areas',
      name: 'Community Areas',
      visible: false,
      color: '#ffffff',  // Contorno sutil branco/transparente
      type: 'line',
    },
    {
      id: 'critical-areas',
      name: 'Critical Areas',
      visible: false,
      color: '#DCA498',
      type: 'fill',
      parent: 'community-areas',
    },
    {
      id: 'parks',
      name: 'Parks',
      visible: false,
      color: '#4ade80',  // Verde suave
      type: 'fill',
    },
    {
      id: 'park-buffers',
      name: 'Park Valuation Buffers',
      visible: false,
      color: '#4ade80',  // Verde (mesma cor dos parques, mas com opacidade)
      type: 'fill',
      parent: 'parks',  // Hierarquia
    },
  ]) as Ref<LayerConfig[]>;

  /**
   * Toggle visibilidade de uma camada específica
   * 
   * @param layerId - ID da camada a ser toggleada
   */
  function toggleLayer(layerId: string): void {
    const layer = layers.value.find((l) => l.id === layerId);
    if (layer) {
      layer.visible = !layer.visible;
    }
  }

  /**
   * Define visibilidade de uma camada
   * 
   * @param layerId - ID da camada
   * @param visible - Estado de visibilidade
   */
  function setLayerVisibility(layerId: string, visible: boolean): void {
    const layer = layers.value.find((l) => l.id === layerId);
    if (layer) {
      layer.visible = visible;
    }
  }

  /**
   * Retorna configuração de uma camada específica
   */
  function getLayer(layerId: string): LayerConfig | undefined {
    return layers.value.find((l) => l.id === layerId);
  }

  return {
    // Estado
    layers,

    // Métodos
    toggleLayer,
    setLayerVisibility,
    getLayer,
  };
}
