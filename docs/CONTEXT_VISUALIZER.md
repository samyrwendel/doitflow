# Context Window Visualizer

## 🎯 Objetivo

O **Context Window Visualizer** é um componente que mostra visualmente o uso da janela de contexto do RAG, similar ao gráfico de contribuições do GitHub. Ele ajuda a entender quando o contexto está ideal, denso ou crítico para evitar alucinações.

## 🎨 Visualização

### Grid de Blocos (20x8 = 160 blocos)
- **Cinza**: Espaço não utilizado na janela de contexto
- **Verde claro**: Uso otimizado (0-30% da capacidade)
- **Verde médio**: Uso moderado (30-60% da capacidade)  
- **Amarelo**: Contexto denso (60-80% da capacidade)
- **Laranja**: Contexto pesado (80-90% da capacidade)
- **Vermelho**: Risco crítico de alucinação (90-100%+)

## 📊 Métricas Exibidas

### Estatísticas Principais
- **Chunks**: Número total de segmentos de texto
- **Tokens**: Quantidade de tokens estimados (1 token ≈ 4 caracteres)
- **Utilização**: Percentual da janela de contexto ocupada

### Cálculo de Tokens
```typescript
// Estimativa: 1 token ≈ 4 caracteres em português
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4)
}
```

## ⚠️ Avisos e Recomendações

### ✅ Contexto Otimizado (0-1024 tokens)
- **Status**: Verde - "Contexto otimizado"
- **Descrição**: Janela de contexto ideal para respostas precisas sem alucinação
- **Recomendação**: Configuração ideal, continue adicionando documentos

### 💡 Contexto Denso (1024-5000 tokens)
- **Status**: Amarelo - "Contexto denso"  
- **Descrição**: Monitorar qualidade das respostas
- **Recomendação**: Chunks maiores podem afetar a precisão

### ⚠️ Contexto Crítico (>5000 tokens)
- **Status**: Vermelho - "Risco alto de alucinação"
- **Descrição**: Alta probabilidade de alucinação
- **Recomendação**: Remover documentos ou dividir em chunks menores

## 🔧 Configuração

### Parâmetros Padrão
```typescript
<ContextWindowVisualizer 
  documents={documents}
  maxContextTokens={8000}    // Limite máximo da LLM
  optimalTokens={1024}       // Sweet spot recomendado
  warningTokens={5000}       // Início da zona de risco
/>
```

### Personalização por Tipo de Conteúdo

#### Documentação Técnica
```typescript
optimalTokens={512}
warningTokens={2000}
```

#### Artigos/Blogs
```typescript
optimalTokens={1024}
warningTokens={4000}
```

#### Documentos Legais
```typescript
optimalTokens={1536}
warningTokens={6000}
```

## 📋 Boas Práticas

### Estratégia de Chunking
1. **Tamanho ideal**: 512-1024 tokens por chunk
2. **Overlap**: 10-20% entre chunks consecutivos
3. **Quebras semânticas**: Respeitar parágrafos e seções
4. **Evitar cortes**: Não dividir frases no meio

### Monitoramento
- **Verde**: Continue adicionando conteúdo
- **Amarelo**: Teste a qualidade das respostas
- **Vermelho**: Reduza o contexto imediatamente

### Sinais de Alerta
- ❌ **Chunks muito pequenos**: Falta contexto, LLM inventa conexões
- ❌ **Chunks muito grandes**: Informação irrelevante confunde o modelo
- ❌ **Recuperação ruim**: Chunks irrelevantes são pior que nenhum chunk

## 🎯 Exemplo de Uso Ideal

```
Cenário: Base de conhecimento com 3 documentos
- Documento 1: 800 tokens (artigo técnico)
- Documento 2: 600 tokens (FAQ)  
- Documento 3: 400 tokens (guia rápido)
Total: 1800 tokens

Status: ✅ Contexto otimizado
Visualização: Blocos verdes ocupando ~22% do grid
Recomendação: Espaço para mais 3-4 documentos similares
```

## 📈 Benefícios

1. **Visual Intuitivo**: Entendimento imediato do status do contexto
2. **Prevenção de Alucinação**: Alertas antes de atingir limites críticos
3. **Otimização Guiada**: Recomendações baseadas no estado atual
4. **Monitoramento Contínuo**: Feedback em tempo real conforme documentos são adicionados

---

*Este visualizador ajuda a manter a qualidade das respostas do RAG, prevenindo sobrecarga de contexto que pode levar à alucinação.*