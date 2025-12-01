import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Activity } from 'lucide-react';
import { LogEntry } from '@/types';
import { MessageStats } from './MessageStats';

interface LogDisplayProps {
  logs: LogEntry[];
  stats: {
    totalPhones: number;
    validPhones: number;
    invalidPhones: number;
    messageLength: number;
    sentMessages: number;
    failedMessages: number;
  };
}

export function LogDisplay({ logs, stats }: LogDisplayProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5" style={{color: 'var(--text-primary)'}} />
          <h2 className="text-sm" style={{color: 'var(--text-secondary)'}}>Registros</h2>
        </div>
        <MessageStats {...stats} />
      </div>
      <ScrollArea className="flex-1 glass-surface rounded-lg">
        <div className="p-4 space-y-2 font-mono">
          {logs.length === 0 ? (
            <div className="flex items-center justify-center h-[160px]" style={{color: 'var(--text-secondary)'}}>
              <div className="flex flex-col items-center gap-2">
                <Info className="w-5 h-5" />
                <span className="text-sm">Nenhum log disponível</span>
              </div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div 
                key={index} 
                className="flex items-start gap-2 text-sm"
              >
                <span style={{color: 'white'}}>[{log.timestamp}]</span>
                {log.type === 'success' && <span style={{color: 'white'}}>{log.message}</span>}
                {log.type === 'error' && <span style={{color: 'white'}}>{log.message}</span>}
                {log.type === 'info' && <span style={{color: 'white'}}>{log.message}</span>}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}