# AtividadeOSPA — Chicago Valuation Analysis

Plataforma web (Vue + Mapbox) orientada à decisão para **gestores públicos**: transforma dados abertos de Chicago em leitura rápida de **cobertura de parques** e **potencial de valorização** por proximidade.

## Objetivo
- Visualizar dados geográficos de forma clara (overview)
- Entrar no detalhe de uma área específica (detail)
- Identificar padrões e comparar áreas (insights) usando camadas e métricas consistentes

## Como usar
1. Abra o mapa e ative/desative camadas na sidebar (**visão de listagem**: Map Layers).
2. Clique em uma **Community Area** para abrir o painel de análise (**visão de detalhe**).
3. Ative **Park Valuation Buffers** e use o hover no mapa para ver o tooltip por distância.

## Formas de apresentação (o que a UI entrega)
- **Mapa (overview):** contexto espacial + camadas (áreas, parques, buffers)
- **Lista (listagem):** toggles de camadas com hierarquia, para “fatiar” a leitura do mapa
- **Detalhe (detail):** painel lateral com métricas e resumo estratégico da Community Area selecionada

## Metodologia (distância → prêmio)
A valorização estimada segue a correlação do estudo do The 606 (DePaul / IHS Measuring the Impact of The 606). Referência aplicada no tooltip e no raciocínio do painel.

| Distância ao parque | Prêmio |
|---:|---:|
| ≤ 0.2 mi | +22.3% |
| 0.3 mi | +18.3% |
| 0.4 mi | +14.6% |
| 0.5 mi | +11.2% |
| 0.6 mi | +7.9% |
| 0.8 mi | +2.1% |
| > 0.8 mi | 0% |

Observações de implementação (para manter o app responsivo):
- O **buffer visual** no mapa é simplificado (0.2 mi), porque é o impacto máximo e o que melhor comunica “zona imediata”.
- Fora do buffer de 0.2 mi, o tooltip estima o prêmio usando a **distância até o perímetro do parque mais próximo**, até o limite de 0.8 mi.

## Dados (requisições HTTP)
Consumo via HTTP (Socrata) com um API client isolado em `src/api/`.

Datasets usados:
- Community Areas: `igwz-8jzy`
- Parks: `ejsh-fztr`

## Decisões de UX (resumo)
- **Sidebar**
- **Camadas** toggles permitem comparar padrões (ex.: ligar/desligar buffers e áreas críticas).
- **Feedback rápido:** tooltip no hover e estados visuais no mapa reduzem clique/tempo para insight.

## Performance e confiabilidade
- Cache em `localStorage` com TTL para dados e cálculos geométricos.
- Cálculos geoespaciais (Turf.js) evitam dependência de chaves estrangeiras inexistentes nos datasets.

## Limitações

- Integrar os dados de parcel
- Construir uma backend para os cálculos, afim de obter melhor performance e não depender do cliente
- Tornar a visualização dos dados mais dinâmicas

## Rodando localmente
### Pré-requisitos
- Node.js 20+
- npm

### Setup
```bash
git clone <repo-url>
cd AtividadeOSPA
npm install
```

### Variáveis de ambiente
Crie `.env.local` na raiz (nunca commitar):
```dotenv
VITE_MAPBOX_TOKEN=pk.seu_token_publico
VITE_CHICAGO_APP_TOKEN=seu_app_token_socrata
```

### Dev / build
```bash
npm run dev
npm run build
```
