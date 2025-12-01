const express = require('express');

const app = express();
const port = 3002;

app.get('/test', (req, res) => {
  console.log('Requisição recebida em /test');
  res.json({ message: 'Servidor funcionando!' });
});

console.log('Tentando iniciar servidor...');
app.listen(port, () => {
  console.log(`Servidor simples rodando em http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Erro ao iniciar servidor:', err);
});