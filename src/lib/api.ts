// API Configuration
// Usando URLs relativas - o nginx faz proxy para o backend
export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  TRANSCRIBE: '/api/transcribe',
  TRANSCRIBE_CHUNK: '/api/transcribe-chunk',
  VIDEO_TRANSCRIPTION: '/api/video-transcription',
  UPLOAD_DOCUMENT: '/api/upload-document',
  CHAT: '/api/chat',
  OPTIMIZE_PROMPT: '/api/optimize-prompt',
  
  // Endpoints de Persistência
  TRANSCRIPTIONS: '/api/transcriptions',
  RAG_DOCUMENTS: '/api/rag-documents',
  PROMPTS: '/api/prompts',
  CHAT_HISTORY: '/api/chat-history',
  CLEANUP: '/api/cleanup',
  
  // Endpoints Multi-Agentes
  AGENTS: '/api/agents',
  AGENT_CHAT: (agentId: string) => `/api/agents/${agentId}/chat`,
  AGENT_MESSAGES: (agentId: string) => `/api/agents/${agentId}/messages`,
  AGENT_CLEAR_MESSAGES: (agentId: string) => `/api/agents/${agentId}/messages`,
  AGENT_SESSIONS: (agentId: string) => `/api/agents/${agentId}/sessions`,
  AGENT_RAG_ACCESS: (agentId: string) => `/api/agents/${agentId}/rag-access`,
  AGENT_STATISTICS: (agentId: string) => `/api/agents/${agentId}/statistics`,
  
  // Endpoints de Ferramentas
  TOOLS: '/api/tools',
  AGENT_TOOLS: (agentId: string) => `/api/agents/${agentId}/tools`,
  AGENT_TOOL_ENABLE: (agentId: string, toolId: string) => `/api/agents/${agentId}/tools/${toolId}/enable`,
  AGENT_TOOL_DISABLE: (agentId: string, toolId: string) => `/api/agents/${agentId}/tools/${toolId}/disable`,

  // Evolution API
  EVOLUTION_INSTANCES: '/api/evolution-instances',
  EVOLUTION_INSTANCES_CREATE: '/api/evolution-instances/create',
  EVOLUTION_INSTANCE_STATUS: (name: string) => `/api/evolution-instances/${name}/status`,
  EVOLUTION_INSTANCE_DELETE: (name: string) => `/api/evolution-instances/${name}/evolution`,
  EVOLUTION_EXECUTE: '/api/tools/evolution/execute',
  EVOLUTION_CONFIG: '/api/evolution-config',
  EVOLUTION_CONFIG_TEST: '/api/evolution-config/test',
  EVOLUTION_CONFIG_DETECT: '/api/evolution-config/detect-local',

  // Scheduler (Team Management)
  SCHEDULER_TEAM_MEMBERS: '/api/scheduler/team-members',
  SCHEDULER_SCHEDULES: '/api/scheduler/schedules',
  SCHEDULER_SCHEDULE_TRIGGER: (id: string) => `/api/scheduler/schedules/${id}/trigger`,
  SCHEDULER_EXECUTIONS: '/api/scheduler/executions',
  SCHEDULER_ACTIVITIES: '/api/scheduler/activities',
  SCHEDULER_TEMPLATES: '/api/scheduler/templates',
  SCHEDULER_STATS_TEAM: '/api/scheduler/stats/team',
  SCHEDULER_STATUS: '/api/scheduler/status',
  SCHEDULER_START: '/api/scheduler/start',
  SCHEDULER_STOP: '/api/scheduler/stop'
} as const