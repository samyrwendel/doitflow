import React from 'react'
import { FiCheckCircle, FiBarChart2, FiZap, FiFileText, FiSearch, FiDollarSign } from 'react-icons/fi'

interface SuccessDialogProps {
  isOpen: boolean
  title: string
  message: string
  details?: string[]
  onClose: () => void
  closeText?: string
}

// Função para extrair ícone baseado no conteúdo do detalhe
const getDetailIcon = (detail: string) => {
  if (detail.includes('caracteres')) return <FiFileText className="w-3.5 h-3.5 shrink-0" />
  if (detail.includes('semântica') || detail.includes('Pronto')) return <FiSearch className="w-3.5 h-3.5 shrink-0" />
  if (detail.includes('Custo') || detail.includes('Embeddings')) return <FiDollarSign className="w-3.5 h-3.5 shrink-0" />
  return null
}

const SuccessDialog: React.FC<SuccessDialogProps> = ({
  isOpen,
  title,
  message,
  details = [],
  onClose,
  closeText = 'OK'
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="
        bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto 
        border border-green-200 dark:border-green-800
        transform transition-all duration-200 ease-out
        animate-in fade-in-0 zoom-in-95
      ">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="
              w-10 h-10 rounded-full flex items-center justify-center
              bg-green-100 dark:bg-green-900/30
            ">
              <FiCheckCircle className="text-green-600 dark:text-green-400 w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-4">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
            {message}
          </p>
          
          {details.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                <FiBarChart2 className="w-4 h-4" />
                <span>Estatísticas</span>
              </div>
              {details.map((detail, index) => {
                const icon = getDetailIcon(detail)
                return (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="text-green-600 dark:text-green-400">
                      {icon}
                    </span>
                    <span className="text-green-700 dark:text-green-300">{detail}</span>
                  </div>
                )
              })}
              <div className="mt-3 pt-2 border-t border-green-200 dark:border-green-700">
                <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                  <FiZap className="w-4 h-4 shrink-0" />
                  <span className="font-medium">O prompt foi melhorado para gerar respostas mais precisas!</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <button
            onClick={onClose}
            className="
              px-6 py-2.5 text-sm font-medium text-white 
              bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700
              rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
              transition-all duration-200
              min-w-20
            "
          >
            {closeText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SuccessDialog