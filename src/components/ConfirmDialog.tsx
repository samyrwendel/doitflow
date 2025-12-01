import React from 'react'
import { FiTrash2, FiAlertTriangle, FiInfo } from 'react-icons/fi'

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  details?: string[]
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  details = [],
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger'
}) => {
  if (!isOpen) return null

  const typeStyles = {
    danger: {
      icon: <FiTrash2 className="w-5 h-5" />,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      confirmBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    warning: {
      icon: <FiAlertTriangle className="w-5 h-5" />,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      confirmBg: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    info: {
      icon: <FiInfo className="w-5 h-5" />,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      confirmBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
      borderColor: 'border-blue-200 dark:border-blue-800'
    }
  }

  const currentStyle = typeStyles[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className={`
        bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-auto 
        border ${currentStyle.borderColor}
        transform transition-all duration-200 ease-out
        animate-in fade-in-0 zoom-in-95
      `}>
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${currentStyle.iconBg}
            `}>
              <span className={currentStyle.iconColor}>{currentStyle.icon}</span>
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
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2">
              {details.map((detail, index) => (
                <div key={index} className="flex items-start space-x-2 text-sm">
                  <span className="text-gray-400 dark:text-gray-500 mt-0.5">•</span>
                  <span className="text-gray-600 dark:text-gray-300">{detail}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-xl">
          <button
            onClick={onCancel}
            className="
              flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300
              bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg
              hover:bg-gray-50 dark:hover:bg-gray-500 hover:border-gray-400 dark:hover:border-gray-400
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              transition-colors duration-200
            "
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`
              flex-1 px-4 py-2.5 text-sm font-medium text-white 
              ${currentStyle.confirmBg}
              rounded-lg shadow-sm
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
              transition-all duration-200
            `}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog