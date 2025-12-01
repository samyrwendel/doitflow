#!/bin/bash

# Script para testar criação de agentes via API

# Fazer login primeiro
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3004/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Erro no login"
  echo $LOGIN_RESPONSE | jq
  exit 1
fi

echo "✅ Login realizado com sucesso"
echo "🔑 Token: ${TOKEN:0:20}..."

# Criar agente de teste
echo ""
echo "📝 Criando agente de teste..."

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3004/api/agents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Assistente de Testes",
    "description": "Agente criado via script de teste",
    "systemPrompt": "Você é um assistente de testes automatizados. Seja preciso e objetivo.",
    "model": "llama-3.1-8b-instant",
    "temperature": 0.5
  }')

echo $CREATE_RESPONSE | jq

AGENT_ID=$(echo $CREATE_RESPONSE | jq -r '.data.id')

if [ "$AGENT_ID" != "null" ]; then
  echo ""
  echo "✅ Agente criado com ID: $AGENT_ID"
  
  # Listar todos os agentes
  echo ""
  echo "📋 Listando todos os agentes..."
  curl -s http://localhost:3004/api/agents \
    -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, name, emoji: .avatar_emoji, model, is_default}'
else
  echo "❌ Erro ao criar agente"
fi
