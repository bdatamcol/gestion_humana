import { Bell, Mail, Smartphone, Settings, CheckCircle, Clock } from 'lucide-react'

export default function NotificationsGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Sistema de Notificaciones
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Entiende cómo funcionan las notificaciones en el sistema y cómo configurarlas
        </p>
      </div>

      <div className="grid gap-6">
        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Bell className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Tipos de Notificaciones</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Solicitudes</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Solicitud aprobada o rechazada</li>
                <li>• Nueva solicitud pendiente (admin)</li>
                <li>• Recordatorio de solicitudes vencidas</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sistema</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Actualizaciones importantes</li>
                <li>• Mantenimiento programado</li>
                <li>• Nuevos comunicados</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Configuración de Notificaciones</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Personaliza cómo y cuándo recibes notificaciones:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Notificaciones por email</span>
            </li>
            <li className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4" />
              <span>Notificaciones push (próximamente)</span>
            </li>
            <li className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notificaciones en la aplicación</span>
            </li>
          </ul>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Estados de Notificación</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">No leída</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">Leída</span>
            </div>
            <div className="flex items-center space-x-3">
              <Clock className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Pendiente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}