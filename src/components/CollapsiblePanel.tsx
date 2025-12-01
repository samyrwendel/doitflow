import { FiMic, FiEdit3, FiDatabase, FiChevronDown, FiChevronRight, FiSmartphone, FiUsers, FiCalendar, FiDollarSign } from 'react-icons/fi'

interface CollapsiblePanelProps {
  id: string
  title: string
  icon: React.ReactNode
  isExpanded: boolean
  onToggle: (id: string) => void
  children: React.ReactNode
  className?: string
}

export function CollapsiblePanel({ 
  id, 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  children, 
  className = '' 
}: CollapsiblePanelProps) {
  
  return (
    <div className={`bg-card border border-border rounded-lg shadow-lg flex flex-col ${isExpanded ? 'flex-1 min-h-0' : ''} ${className}`}>
      {/* Header - Altura igual ao header das abas */}
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/50 transition-colors rounded-t-lg flex-shrink-0 bg-muted/50"
        style={{ minHeight: '36px' }}
      >
        <div className="flex items-center gap-3">
          <div className="text-card-foreground">
            {icon}
          </div>
          <h3 className="text-sm font-medium text-card-foreground">
            {title}
          </h3>
        </div>
        
        <div className="text-muted-foreground transition-transform duration-200">
          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
        </div>
      </button>
      
      {/* Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isExpanded ? 'flex-1 opacity-100 overflow-hidden min-h-0' : 'max-h-0 opacity-0 overflow-hidden'
      }`}>
        <div className="h-full overflow-hidden">
          <div 
            className="h-full overflow-y-auto scrollbar-hidden" 
            style={{ 
              scrollbarWidth: 'none', 
              msOverflowStyle: 'none',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

interface DraggablePanelsContainerProps {
  children: React.ReactNode
  className?: string
}

export function DraggablePanelsContainer({ children, className = '' }: DraggablePanelsContainerProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {children}
    </div>
  )
}

export const PANEL_ICONS = {
  transcription: <FiMic className="w-4 h-4" />,
  prompt: <FiEdit3 className="w-4 h-4" />,
  rag: <FiDatabase className="w-4 h-4" />,
  devices: <FiSmartphone className="w-4 h-4" />,
  agents: <FiUsers className="w-4 h-4" />,
  scheduler: <FiCalendar className="w-4 h-4" />,
  expenses: <FiDollarSign className="w-4 h-4" />
} as const