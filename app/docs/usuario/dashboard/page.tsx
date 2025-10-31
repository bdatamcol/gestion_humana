import { Home, Calendar, FileText, Bell, User } from 'lucide-react'

export default function UserDashboardGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Dashboard de Usuario
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Guía completa sobre el uso del dashboard personal
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2 className="text-2xl font-semibold mb-4">Componentes del Dashboard</h2>
        
        <div className="grid gap-6 my-6">
          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Tarjeta de Perfil</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Muestra tu información básica: nombre, cargo, departamento y fecha de ingreso.
              También incluye tu foto de perfil y estado actual.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Estado de Vacaciones</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Muestra tu saldo actual de vacaciones, días tomados este año y próximas vacaciones programadas.
              Incluye un gráfico visual de tu uso de vacaciones.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Solicitudes Recientes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Lista tus últimas 5 solicitudes con su estado actual (pendiente, aprobada, rechazada).
              Incluye enlaces directos para ver detalles.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Notificaciones</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Muestra tus notificaciones no leídas más recientes, incluyendo actualizaciones
              de solicitudes y comunicados importantes.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Acciones Rápidas</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          El dashboard incluye botones de acceso rápido para:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>Crear nueva solicitud de vacaciones</li>
          <li>Solicitar permiso</li>
          <li>Reportar incapacidad</li>
          <li>Ver historial completo de solicitudes</li>
          <li>Actualizar información de perfil</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">Personalización</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Puedes personalizar tu dashboard:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>Elegir qué widgets mostrar u ocultar</li>
          <li>Reordenar los elementos del dashboard</li>
          <li>Seleccionar el tema de color (claro/oscuro)</li>
          <li>Configurar las notificaciones que deseas ver</li>
        </ul>
      </div>
    </div>
  )
}