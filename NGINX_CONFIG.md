# Nginx VHost Configuration - demo.idx.ia.br

## Principais correções aplicadas:

### 🔧 **Portas corrigidas:**
- ❌ **Antes**: Mistura de portas 3001 e 3004
- ✅ **Agora**: Todas as APIs apontam para porta **3004** (onde o backend está rodando no PM2)

### 🛣️ **Estrutura de rotas otimizada:**
- ✅ **Rota principal**: `/api/*` → proxy para `http://localhost:3004`
- ✅ **Compatibilidade**: Rotas antigas redirecionam para `/api/`
- ✅ **Health check**: Endpoint direto sem autenticação

### 📦 **Cache otimizado:**
- ✅ **Assets estáticos**: Cache de 1 ano com `immutable`
- ✅ **HTML/SPA**: No-cache para atualizações
- ✅ **JS/CSS**: Cache longo para performance

### 🔒 **Segurança melhorada:**
- ✅ **Headers de segurança**: X-Frame-Options, XSS-Protection, etc.
- ✅ **Bloqueio de arquivos sensíveis**: .env, .git, logs, etc.
- ✅ **Robots**: noindex para ambiente de demo
- ✅ **Manifest.json**: Permitido para PWA

### 🚀 **Performance:**
- ✅ **Timeouts adequados**: 120s para processamento de IA
- ✅ **Upload limit**: 100MB para arquivos de áudio
- ✅ **HTTP/2**: Habilitado para SSL
- ✅ **Gzip**: Assets comprimidos

## Endpoints disponíveis:

### Frontend (SPA):
- `https://demo.idx.ia.br/` → Aplicação React

### Backend API:
- `https://demo.idx.ia.br/api/health` → Health check
- `https://demo.idx.ia.br/api/transcribe` → Transcrição completa
- `https://demo.idx.ia.br/api/transcribe-chunk` → Transcrição por chunks
- `https://demo.idx.ia.br/api/chat` → Chat com RAG

## Como aplicar:

1. **Salvar configuração**:
   ```bash
   sudo cp nginx-vhost.conf /etc/nginx/sites-available/demo.idx.ia.br
   sudo ln -sf /etc/nginx/sites-available/demo.idx.ia.br /etc/nginx/sites-enabled/
   ```

2. **Testar configuração**:
   ```bash
   sudo nginx -t
   ```

3. **Aplicar mudanças**:
   ```bash
   sudo systemctl reload nginx
   ```

4. **Verificar logs**:
   ```bash
   sudo tail -f /home/ia-demo-idx/logs/nginx/access.log
   sudo tail -f /home/ia-demo-idx/logs/nginx/error.log
   ```

## SSL/Certificados:
Certifique-se de que os certificados existem:
- `/etc/nginx/ssl-certificates/demo.idx.ia.br.crt`
- `/etc/nginx/ssl-certificates/demo.idx.ia.br.key`

Se não existirem, gere com Let's Encrypt ou use certificados auto-assinados para desenvolvimento.