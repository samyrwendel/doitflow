import React from 'react';
import { MessageCircle, Phone, Check, X, Send, AlertCircle } from 'lucide-react';

interface MessageStatsProps {
  totalPhones: number;
  validPhones: number;
  invalidPhones: number;
  messageLength: number;
  sentMessages: number;
  failedMessages: number;
}

export function MessageStats({
  totalPhones,
  validPhones,
  invalidPhones,
  messageLength,
  sentMessages,
  failedMessages
}: MessageStatsProps) {
  const stats = [
    {
      icon: <Phone className="w-8 h-8" style={{color: 'white'}} />,
      label: "Total Números",
      value: totalPhones,
    },
    {
      icon: <Check className="w-8 h-8" style={{color: 'white'}} />,
      label: "Válidos",
      value: validPhones,
    },
    {
      icon: <X className="w-8 h-8" style={{color: 'white'}} />,
      label: "Inválidos",
      value: invalidPhones,
    },
    {
      icon: <MessageCircle className="w-8 h-8" style={{color: 'white'}} />,
      label: "Caracteres",
      value: messageLength,
    },
    {
      icon: <Send className="w-8 h-8" style={{color: 'white'}} />,
      label: "Enviadas",
      value: sentMessages,
    },
    {
      icon: <AlertCircle className="w-8 h-8" style={{color: 'white'}} />,
      label: "Falhas",
      value: failedMessages,
    },
  ];

  return (
    <div className="flex items-center gap-4 max-w-[600px] overflow-hidden">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-center min-w-0 flex-1" title={`${stat.label}: ${stat.value}`}>
          <div className="w-6 h-6 flex items-center justify-center">
            {React.cloneElement(stat.icon, { className: "w-4 h-4" })}
          </div>
          <span className="text-xs font-medium truncate w-full text-center" style={{color: 'var(--text-secondary)'}}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}