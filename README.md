# AtividadeOSPA

# Chicago Valuation Analysis

> **Valuation Analysis Platform**  
> Evidence-based property valuation using proximity to green spaces

---

## 📊 O Problema

Órgãos públicos disponibilizam grandes volumes de dados abertos, mas raramente esses dados são apresentados de forma que facilite a tomada de decisão. O portal oficial [data.cityofchicago.org](https://data.cityofchicago.org/) é tecnicamente robusto, mas apresenta limitações críticas:

### Análise do Portal Oficial

**Fragmentação de plataformas:**
- Múltiplos sites sem integração clara (data portal, chicago.gov, Open Grid, CHI311)
- Usuário é dispersado entre diferentes domínios
- Métricas de uso prejudicadas

**Experiência de usuário:**
- Tutorial não destacado (seção `#about` sem destaque visual)
- Navegação não intuitiva (filtros sem hierarquia clara)
- Slider com informações importantes competindo com banners não relacionados ao funcionamento
- FAQ textual em vez de guia interativo

**Falta de narrativa espacial:**
- Dados são repositórios, não ferramentas de análise
- Ausência de contextualização geográfica unificada
- Não demonstra correlações ou insights (apenas presenta dados brutos)

**Oportunidade identificada:**  
Criar uma interface **orientada à decisão**, onde o mapa é contexto e a **análise é o produto**.

---

## 🎯 A Solução: Chicago Valuation Analysis

Esta plataforma propõe uma **análise de viabilidade imobiliária**, baseada em:

> **"A proximidade de parques e waterways gera um prêmio mensurável no valor das propriedades"**

### Metodologia DePaul University - The 606 Trail Impact Study

**Correlação empiricamente comprovada:**

| Distância ao Parque | Prêmio de Valorização |
|---------------------|----------------------|
| ≤ 0,2 milhas | **+22,3%** |
| ≤ 0,4 milhas | **+14,6%** |
| ≤ 0,6 milhas | **+7,9%** |
| ≤ 0,8 milhas | **+2,1%** |
| > 0,8 milhas | 0% (fora da zona) |

**Fonte:** [DePaul University Housing Studies](https://housingstudies.org/releases/measuring-impact-606/)

### Conceito Central

Ao clicar em qualquer lote (parcel) no mapa, o sistema:
1. Calcula distância até parque/waterway mais próximo
2. Aplica metodologia DePaul (correlação distância → valorização)
3. Exibe simulação financeira (valor base → valor valorizado)
4. Justifica investimento com evidência científica

**Gestores públicos e investidores podem:**
- Identificar lotes com alto potencial de valorização
- Quantificar impacto econômico de novos parques (+22% nas propriedades próximas)
- Priorizar investimentos com ROI mensurável
- Justificar orçamento com evidência científica (DePaul University)

### Valor para o Negócio

Este projeto demonstra **visão de mercado** e entendimento de Real Estate Tech:

1. **Análise de viabilidade** → consultoria para investidores imobiliários
2. **Verticalização** → projetos de parques/praças como solução
3. **SaaS escalável** → plataforma para múltiplas cidades
4. **Dados acionáveis** → não apenas visualização, mas recomendações quantificadas

---

## 🗺️ Funcionamento

### Fluxo de Interação Principal

1. **Visão Geral (Mapa)**
   - Mapa interativo de Chicago (Mapbox GL JS)
   - Camadas: Community Areas, Parks, Waterways
   - **Buffers de valorização visuais** (4 zonas de 0-0.8 milhas)

2. **Click em Lote (Core Feature)**
   - Usuário clica em qualquer parcel no mapa
   - Sistema busca dados do lote via API (Cook County GIS)
   - Calcula distância até parque/waterway mais próximo
   - Aplica metodologia DePaul

3. **Popup de Análise (Resultado)**
   - **Dentro da zona:** 👍
     - Distância exata até o ativo mais próximo
     - Prêmio de valorização estimado (+X%)
     - Simulação financeira (gráfico de barras CSS)
     - Link para metodologia DePaul
   - **Fora da zona:** 👎
     - Mensagem informativa
     - Incentivo para clicar em áreas dentro dos buffers

4. **Toggle de Camadas**
   - Controle de visibilidade (Parks, Waterways, Community Areas)
   - Facilita análise visual focada

---

## 🏗️ Stack Técnica

### Tecnologias

| Tecnologia | Justificativa |
|------------|---------------|
| **Vue 3** (Composition API) | Reatividade moderna, TypeScript nativo, performance |
| **TypeScript** | Type safety, zero `any`, interfaces para APIs |
| **Tailwind CSS** | Utility-first, design system consistente |
| **Mapbox GL JS** | Renderização WebGL, buffers visuais, interações com parcels |
| **Vite** | Build rápido, HMR, otimização automática |
| **Turf.js** | Cálculos geoespaciais críticos (buffers, distance, point-to-line) |

### Por que Turf.js é OBRIGATÓRIO?

**Problema identificado:**  
Os datasets da City of Chicago **NÃO incluem** referências diretas entre entidades:
- Parks não possuem `community_area_id`
- Waterways não possuem relacionamento com áreas
- **Parcels não possuem distância pré-calculada até parques**

**Solução:**  
Implementar **cálculos geométricos em tempo real**:
```typescript
// 1. Criar buffers de valorização (4 zonas: 0-0.2, 0.2-0.4, 0.4-0.6, 0.6-0.8 mi)
const buffer02 = turf.buffer(parkPolygon, 0.2, { units: 'miles' });
const buffer04 = turf.buffer(parkPolygon, 0.4, { units: 'miles' });

// 2. Calcular distância do parcel até perímetro do parque (não centroid!)
const parcelPoint = turf.point([lng, lat]);
const parkBoundary = turf.polygonToLine(parkPolygon);
const distance = turf.pointToLineDistance(parcelPoint, parkBoundary, { units: 'miles' });

// 3. Aplicar metodologia DePaul
const premium = distance <= 0.2 ? 22.3 : distance <= 0.4 ? 14.6 : ...;
```

**Alternativas consideradas:**
1. ❌ **Cálculo manual** (haversine, point-in-polygon) - complexo, edge cases (multipolygons)
2. ❌ **Pré-processar no backend** - perde flexibilidade, exige infraestrutura
3. ✅ **Turf.js** - biblioteca robusta (~300kb), cálculos precisos, amplamente testada

**Trade-off aceito:**  
Bundle aumenta ~300kb, mas ganhamos:
- Precisão em cálculos complexos (multipolygons, buffers, distances)
- Manutenibilidade (código declarativo)
- Confiabilidade (biblioteca amplamente usada)
- **Análise isócrona** (correlação distância-valorização)

### Arquitetura

```
src/
 ├── api/              # Chamadas HTTP isoladas (fetch + parse + tipagem)
 │   ├── config.ts     # Endpoints Socrata, query builders
 │   └── chicago.ts    # Fetch parks, waterways, community areas
 │
 ├── composables/      # Lógica reutilizável (Composition API)
 │   ├── useParks.ts
 │   ├── useWaterways.ts
 │   ├── useCommunityAreas.ts
 │   └── useMapLayers.ts
 │
 ├── components/
 │   ├── Map/
 │   │   └── CityMap.vue       # Mapbox (recebe dados prontos)
 │   ├── Sidebar/
 │   │   ├── Sidebar.vue       # Painel principal (O PRODUTO)
 │   │   └── LayerToggle.vue   # Controle de camadas
 │   └── Analysis/
 │       └── AreaAnalysis.vue  # Análise detalhada + texto gerado
 │
 ├── types/            # Interfaces TypeScript (zero any)
 │   └── index.ts      # CommunityArea, Park, Waterway, PropertyData
 │
 ├── assets/
 │   └── style.css     # Tailwind + customizações globais
 │
 ├── App.vue           # Orquestrador (composables + componentes)
 └── main.ts           # Entry point
```

### Princípios Arquiteturais

✅ **Separação de responsabilidades**
- API client não sabe de Vue
- Mapbox não faz fetch (apenas renderiza)
- Composables encapsulam lógica de negócio

✅ **Type safety estrito**
- Todas as respostas de API tipadas
- Interfaces para cada dataset
- Nenhum uso de `any`

✅ **Reatividade bem estruturada**
- Estado gerenciado por composables
- Props/emits tipados
- Computed properties para dados derivados

---

## 🎨 Design System

### Paleta de Cores (Tailwind Custom)

```js
colors: {
  'chi-map': '#1e1e1e',      // Background do mapa (discreto)
  'chi-sidebar': '#252525',   // Sidebar (ligeiramente mais clara)
  'chi-accent': '#DCA498',    // Navegação/contexto (terracota)
  'chi-action': '#0097D1',    // Ações/CTAs (azul Chicago)
}
```

### Hierarquia Visual

**Sidebar (esquerda) > Mapa (restante)**  
A sidebar está posicionada à **esquerda** (leitura natural) e é o elemento visualmente dominante. O mapa fornece contexto espacial, mas a **decisão acontece no painel**.

- Sidebar com `shadow-2xl`, `border-r`, backdrop blur
- Mapa com opacidade reduzida nos controles
- Texto com alto contraste (gray-100/200)
- CTAs em azul Chicago (#0097D1)
- Navegação em terracota (#DCA498)

### Responsividade

- Desktop: Sidebar fixa à esquerda (28rem), mapa preenche restante
- Tablet: Sidebar à esquerda (24rem)
- Mobile: Sidebar em **overlay** (cobre o mapa), colapsável com botão toggle
- Touch-friendly (botões com padding adequado)

---

## 📡 Datasets (City of Chicago Open Data)

### APIs Consumidas

| Dataset | Endpoint | Status | Uso |
|---------|----------|--------|-----|
| **Community Areas** | `igwz-8jzy` | ✅ Implementado | 77 divisões territoriais (contexto espacial) |
| **Parks** | `ejsh-fztr` | ✅ Implementado | Polígonos de parques (GeoJSON) + buffers de valorização |
| **Waterways** | `knfe-65pw` | ✅ Implementado | Corpos d'água (GeoJSON) + buffers de valorização |
| **Parcels (Lotes)** | `77tz-riq7` (Cook County GIS) | ✅ Implementado | Fetch sob demanda (click no mapa) |
| ~~Property Data~~ | ~~`pabr-t5kh`~~ | ❌ Substituído | Metodologia DePaul elimina necessidade |

### Estratégia de Performance

**Limitações da API Socrata:**
- Limite padrão: 1000 registros por request
- Throttling sem app token

**Nossa abordagem:**
```typescript
// Queries limitadas + agregação
$limit=1000&pageNumber=1

// Property data: PULADO na Fase 2
// Foco em análise de espaços livres (Parks + Waterways)
// Dataset completo tem milhares de registros - impraticável no frontend
```

**Por que isso é importante:**
- Demonstra **maturidade técnica** (não apenas "faz funcionar")
- Priorização consciente (espaços livres > dados imobiliários)
- Evita requests desnecessários
- Performance percebida alta (skeleton loading)

### Limitação: Falta de Relacionamento entre Datasets

**Problema crítico identificado:**  
Os datasets da Socrata **não possuem chaves estrangeiras**:
- Parks não incluem `community_area_id`
- Waterways não possuem relacionamento com áreas
- **Dados de propriedades não estão pré-agregados por Community Area**
- Necessário calcular relações **espacialmente**

**Solução implementada:**  
Uso de **Turf.js** para cálculos geométricos:
```typescript
// Verificar se parque está dentro de Community Area
const areaPolygon = turf.polygon(communityArea.the_geom.coordinates);
const parkGeometry = turf.polygon(park.the_geom.coordinates);
const isInside = turf.booleanIntersects(parkGeometry, areaPolygon);

// Calcular distância até parque mais próximo (análise isócrona)
const distance = turf.distance(point, parkCenter, { units: 'miles' });
```

**Por que não fazer manualmente?**
- Point-in-polygon é complexo (ray casting, edge cases)
- MultiPolygons exigem algoritmos robustos
- Cálculos de distância geodésica (Haversine) são trabalhosos
- Turf.js é bem testado e mantido
- Trade-off: +300kb bundle vs. precisão e confiabilidade

### Análise Isócrona: Estudo DePaul University

**Embasamento Científico:**  
Implementamos análise baseada no estudo da **DePaul University** sobre o impacto do parque linear **The 606** na valorização imobiliária.

**Correlação Distância → Valorização:**

| Distância ao Parque | Prêmio de Valorização |
|---------------------|------------------------|
| < 0,2 milhas | **+22,3%** |
| 0,3 milhas | +18,3% |
| 0,4 milhas | +14,6% |
| 0,5 milhas | +11,2% |
| 0,6 milhas | +7,9% |
| 0,8 milhas | +2,1% |

**Implementação:**
```typescript
// Calcular distância de cada ponto da Community Area ao parque mais próximo
const distance = getDistanceToNearestPark(point, parks);

// Estimar prêmio baseado na tabela DePaul (interpolação linear)
const premium = estimatePremium(distance); // Ex: 15.2% para 0.35 milhas

// Classificar área por cobertura isócrona
// - Alta: % da área a <0.2 milhas (prêmio alto)
// - Média: % da área a 0.2-0.5 milhas (prêmio moderado)
// - Baixa: % da área a >0.5 milhas (prêmio baixo/zero)
```

**Valor para a Análise:**
- Transforma dados geoespaciais em **insights financeiros**
- Justifica investimento público com **evidência quantitativa**
- Identifica áreas prioritárias (baixa cobertura = alto potencial)

### Sistema de Cache

**Problema:**  
Cálculos Turf.js (point-in-polygon, distance) são **custosos** computacionalmente. Dados da API Socrata mudam **raramente**.

**Solução implementada:**  
Composable `useCache()` com localStorage:

```typescript
// Exemplo de uso
const cached = cache.get<Park[]>('GEOMETRIC_CALC', 'parks-area-23');
if (cached) return cached;

const result = calculateParksInArea(area);
cache.set('GEOMETRIC_CALC', 'parks-area-23', result);
```

**Estratégia:**
- **TTL (Time To Live)** configurável por tipo de dado:
  - Community Areas: 7 dias (dados estáveis)
  - Parks/Waterways: 7 dias
  - Cálculos geométricos: 1 dia
  - Property data: 1 dia
- **Limpeza automática** de entradas expiradas
- **Quota management** (limpa cache antigo se localStorage cheio)
- **Estatísticas** (cache hits/misses, hit rate)

**Benefícios:**
- **Performance:** Cálculos executados apenas 1x
- **UX:** Navegação instantânea após primeira carga
- **API:** Reduz requests desnecessários
- **Desenvolvimento:** Fácil invalidar cache manualmente

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

- Node.js 18+ 
- npm ou pnpm

### Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd chicago-parks-analysis

# Instale dependências
npm install

# Configure o token do Mapbox
# Crie arquivo .env.local na raiz do projeto:
echo "VITE_MAPBOX_TOKEN=seu_token_aqui" > .env.local

# Execute em desenvolvimento
npm run dev

# Build para produção
npm run build
```

### Estrutura de .env.local

```bash
# ⚠️ NUNCA COMMITAR ESTE ARQUIVO
# Use o token PÚBLICO (pk.*) do Mapbox, não o secret (sk.*)
VITE_MAPBOX_TOKEN=pk.seu_token_publico_aqui
```

**Importante:** Tokens que começam com `sk.*` são **Secret Keys** e NÃO devem ser usados no frontend. Sempre use tokens públicos `pk.*` em aplicações client-side.

---

## ⚙️ Decisões Técnicas

### Por que Vue 3 + Composition API?

- **Reatividade granular** ideal para dados geoespaciais
- **TypeScript nativo** (melhor que Vue 2 + TS)
- **Composables** permitem reuso limpo de lógica complexa
- **Performance** superior em re-renders (Proxy-based reactivity)

### Por que Tailwind CSS?

- **Utility-first** elimina CSS tradicional
- **Design system** via `tailwind.config.js`
- **Purge automático** (bundle pequeno em produção)
- **Consistência** garantida (sem estilos ad-hoc)

### Por que Mapbox e não Leaflet?

- **WebGL rendering** (performance com polígonos complexos)
- **3D terrain** (futuro: visualização 3D de Chicago)
- **Estilo customizável** (dark mode nativo)
- **Ecossistema robusto** (plugins, expressões, clustering)

### Por que separar API client dos composables?

```
❌ Errado: Composable faz fetch + gerencia estado + renderiza
✅ Certo:  API → Composable → Componente
```

**Benefícios:**
- **Testabilidade** (mock API sem tocar composables)
- **Reutilização** (mesma API em diferentes contextos)
- **Manutenção** (mudança de endpoint não afeta lógica de negócio)

---

## 🎯 O Que NÃO Foi Implementado (Propositalmente)

### Limitações Assumidas

✅ **Backend próprio**  
Não é necessário - consumo direto da API pública demonstra capacidade de integração.

✅ **Autenticação**  
Fora do escopo - foco em visualização e análise.

✅ **Cobertura completa de datasets**  
Escolhemos **Parks & Recreation** por coerência narrativa e viabilidade técnica.

✅ **Property data do Cook County**  
Dataset completo é gigantesco (milhares de registros) e exigiria backend para agregação eficiente. Na Fase 2, priorizamos a análise de espaços livres (parques + waterways), que é o core da proposta.

✅ **Análise estatística avançada**  
Correlação é demonstrada qualitativamente (texto analítico), não por regressão ou ML. Suficiente para demonstrar conceito.

✅ **Cache de cálculos geométricos**  
~~Turf.js calcula em tempo real. Para produção, seria necessário cache (IndexedDB ou backend) para evitar recalcular a cada seleção.~~  
**IMPLEMENTADO:** Sistema de cache com localStorage + TTL configurável. Performance otimizada.

### Por que essas limitações são defensáveis?

> **"Não é um projeto de produção de 6 meses - é uma demonstração técnica de 1 semana."**

O que importa:
- ✅ Arquitetura limpa e escalável
- ✅ Código production-ready (tipagem, organização)
- ✅ UX orientada ao usuário final (gestor público)
- ✅ Demonstração de **visão de produto**, não apenas código

---

## 📈 Próximos Passos (Roadmap Hipotético)

### Fase 2 - Implementação Completa ✅ CONCLUÍDA
- [x] Fetch real de Community Areas (endpoint `igwz-8jzy`)
- [x] Camadas Mapbox com dados reais (GeoJSON rendering)
- [x] Filtros espaciais com Turf.js (parques dentro de área, waterways adjacentes)
- [x] Click handlers e interações (highlight de área selecionada)
- [x] Skeleton loading (perceived performance)
- [x] Texto analítico com lógica baseada em cobertura de parques
- [x] **Sistema de cache (localStorage)** para cálculos geométricos
- [x] **Análise isócrona** (distância até parques)
- [x] **Correlação distância-valorização** (estudo DePaul)
- [ ] ~~Property data agregado~~ (pulado - foco em espaços livres)

### Fase 3 - Features Avançadas
- [ ] Visualização da análise isócrona no mapa (heatmap de valorização)
- [ ] Gráfico da correlação distância-valorização (Chart.js)
- [ ] Comparação entre múltiplas Community Areas (side-by-side)
- [ ] Exportação de relatórios (PDF com gráficos)
- [ ] Histórico de valorização imobiliária (timeline) - requer property data
- [ ] Integração com CHI311 (service requests por área)
- [ ] Dashboard administrativo (estatísticas de cache, performance)

### Fase 4 - Escalabilidade
- [ ] Multi-tenant (outras cidades além de Chicago)
- [ ] Backend próprio (cache, agregações complexas)
- [ ] Autenticação e permissões
- [ ] Dashboard administrativo

---

## 🧪 Testabilidade

### Estrutura Facilita Testes

```typescript
// Testar API client (mock fetch)
describe('fetchParks', () => {
  it('should return typed Park array', async () => {
    // Mock fetch, assert tipos
  });
});

// Testar composable (mock API)
describe('useParks', () => {
  it('should filter parks by area using Turf', () => {
    // Mock geometries, assert spatial filtering
  });
});

// Testar componente (mock props)
describe('AreaAnalysis', () => {
  it('should generate analytical text based on park coverage', () => {
    // Mount component, assert computed logic
  });
});

// Testar cálculos geométricos
describe('Turf.js integration', () => {
  it('should correctly identify parks within community area', () => {
    // Mock GeoJSON, test booleanIntersects
  });
});
```

Composables desacoplados + Turf.js isolado = **alta testabilidade** sem setup complexo.

---

## 📚 Referências

### City of Chicago Open Data
- [Portal oficial](https://data.cityofchicago.org/)
- [Socrata API Docs](https://dev.socrata.com/)
- [Community Areas dataset](https://data.cityofchicago.org/Facilities-Geographic-Boundaries/Boundaries-Community-Areas-current-/cauq-8yn6)
- [Parks dataset](https://data.cityofchicago.org/Parks-Recreation/Parks-Chicago-Park-District-Park-Boundaries-curre/ejsh-fztr)
- [Waterways dataset](https://data.cityofchicago.org/Parks-Recreation/Waterways/knfe-65pw)

### Cook County Assessor
- [Property data](https://datacatalog.cookcountyil.gov/Property-Taxation/Assessor-Parcel-Universe-Current-Year-Only-/pabr-t5kh)

### Estudos Acadêmicos
- [DePaul University - The 606 Trail Impact Study](https://www.depaul.edu/) - Correlação distância-valorização

### Tecnologia
- [Vue 3 Docs](https://vuejs.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)
- [Turf.js](https://turfjs.org/) - Análise geoespacial

---

## 👨‍💻 Sobre Este Projeto

**Contexto:**  
Desenvolvido como demonstração técnica para avaliação de competências em:
- Frontend moderno (Vue 3, TS, Tailwind)
- Visualização de dados urbanos
- UX orientada a decisão
- Arquitetura de software

**Autor:**  
Arthur Esteves

**Licença:**  
Este projeto é uma demonstração técnica. Dados são de domínio público (City of Chicago Open Data).

---

## 🙏 Agradecimentos

- **City of Chicago** - Por disponibilizar dados abertos de alta qualidade
- **Socrata/Tyler Technologies** - Pela infraestrutura de API
- **Mapbox** - Pela plataforma de geolocalização
- **Comunidade Vue.js** - Pela framework incrível

---

**Para qualquer dúvida ou feedback:**  
[seu-email@example.com]
