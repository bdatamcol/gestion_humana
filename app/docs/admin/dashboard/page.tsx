import { BarChart3, Users, FileCheck, Bell, Settings, TrendingUp } from 'lucide-react'

export default function AdminDashboardGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Dashboard Administrativo
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Guía completa sobre el uso del panel de administración
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2 className="text-2xl font-semibold mb-4">Widgets del Dashboard</h2>
        
        <div className="grid gap-6 my-6">
          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">Estadísticas de Usuarios</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Muestra el total de usuarios activos, nuevos registros este mes, 
              usuarios por departamento y tasa de crecimiento.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <FileCheck className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold">Estado de Solicitudes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Resumen de solicitudes: pendientes, aprobadas, rechazadas este mes.
              Incluye gráficos de tendencias y tiempos de respuesta promedio.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold">Análisis por Empresa</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Si manejas múltiples empresas, muestra estadísticas separadas:
              usuarios, solicitudes y actividad por empresa.
            </p>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Tendencias del Mes</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Comparativas con el mes anterior: aumento/dismiución en solicitudes,
              nuevos usuarios, y picos de actividad.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Acciones Rápidas de Administrador</h2>
        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <h3 className="font-semibold mb-2">Gestión de Usuarios</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Agregar nuevo empleado</li>
              <li>• Editar información de usuario</li>
              <li>• Cambiar roles y permisos</li>
              <li>• Desactivar cuentas</li>
            </ul>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
            <h3 className="font-semibold mb-2">Gestión de Solicitudes</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <li>• Ver solicitudes pendientes</li>
              <li>• Aprobar o rechazar con notas</li>
              <li>• Ver historial de decisiones</li>
              <li>• Generar reportes</li>
            </ul>
          </div>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Panel de Notificaciones Administrativas</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          El dashboard incluye un panel especial de notificaciones para administradores:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>Solicitudes que requieren atención urgente (más de 3 días sin revisar)</li>
          <li>Nuevos usuarios registrados que necesitan aprobación</li>
          <li>Alertas de sistema (errores, mantenimiento)</li>
          <li>Reportes de fallas de usuarios</li>
          <li>Cumpleaños de empleados del mes</li>
        </ul>

        <h2 className="text-2xl font-semibold mb-4">Personalización del Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-300">
          Como administrador, puedes:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>Elegir qué métricas mostrar en el dashboard principal</li>
          <li>Configurar alertas personalizadas basadas en umbrales</li>
          <li>Seleccionar el período de tiempo para los gráficos (7, 30, 90 días)</li>
          <li>Exportar datos del dashboard a Excel o PDF</li>
          <li>Configurar filtros por empresa o departamento</li>
        </ul>
      </div>
    </div>
  )
}