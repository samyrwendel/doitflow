import React, { useState } from 'react'
import { FiMessageCircle, FiEdit3 } from 'react-icons/fi'

interface Tab {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

interface TabsContainerProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
  promptSyncStatus?: 'synced' | 'modified' | 'syncing'
  selectedRagTitle?: string
}

export function TabsContainer({ tabs, defaultTab, className = '', promptSyncStatus = 'synced', selectedRagTitle }: TabsContainerProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Tab Headers */}
      <div className="flex gap-1 p-2 bg-muted/50 flex-shrink-0 justify-between items-center">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200
                rounded-lg border
                ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground border-primary/30 shadow-lg'
                  : 'bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground shadow-sm'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Indicador de Sincronização no Header */}
        <div className="flex items-center gap-2 pr-8">
          {promptSyncStatus === 'synced' && (
            <div 
              className="w-2 h-2 bg-primary rounded-full cursor-help"
              title="Prompt sincronizado"
            ></div>
          )}
          {promptSyncStatus === 'modified' && (
            <div 
              className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse cursor-help"
              title="Prompt modificado - será sincronizado automaticamente"
            ></div>
          )}
          {promptSyncStatus === 'syncing' && (
            <div 
              className="w-2 h-2 bg-accent-foreground rounded-full animate-spin cursor-help"
              title="Sincronizando prompt..."
            ></div>
          )}
          {selectedRagTitle && (
            <span className="text-xs text-muted-foreground">
              • {selectedRagTitle}
            </span>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTabContent}
      </div>
    </div>
  )
}

export { FiMessageCircle, FiEdit3 }