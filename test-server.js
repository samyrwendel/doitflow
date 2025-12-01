const express = require('express');
const app = express();
const port = 3001;

// Middleware de logging simples
app.use((req, res, next) => {
  console.log(`TESTE: ${req.method} ${req.url}`);
  next();
});

// Endpoint de teste simples
app.get('/test', (req, res) => {
  console.log('Endpoint /test foi chamado');
  res.json({ message: 'Servidor de teste funcionando!' });
});

// Health check simples
app.get('/api/health', (req, res) => {
  console.log('Endpoint /api/health foi chamado');
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Servidor de teste rodando em http://localhost:${port}`);
});