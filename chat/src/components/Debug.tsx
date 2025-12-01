import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bug, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";

interface DebugProps {
  error: unknown;
  info?: string;
}

export function Debug({ error, info }: DebugProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const debugInfo = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error,
    additionalInfo: info,
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
  };

  return (
    <Card className="bg-red-500/10 backdrop-blur-xl border-red-400/30 shadow-2xl">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-300">
            <Bug className="w-5 h-5" />
            <h3 className="font-medium">Informações de Debug</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/20 backdrop-blur-xl"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 text-red-300 hover:text-red-200 hover:bg-red-500/20 backdrop-blur-xl"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {isExpanded && (
          <ScrollArea className="h-[200px] mt-4 rounded-lg border border-red-400/30 bg-red-500/5 backdrop-blur-xl">
            <pre className="p-4 text-sm text-red-300 font-mono">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
}