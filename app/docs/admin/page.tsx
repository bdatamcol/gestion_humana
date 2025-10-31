import Link from 'next/link'
import { 
  Users, 
  Shield, 
  BarChart3, 
  Settings, 
  FileCheck, 
  ArrowRight,
  Bell,
  Database
} from 'lucide-react'

export default function AdminGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Guía de Administrador
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Guía completa para administradores sobre gestión del sistema y usuarios
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Nota:</strong> Esta sección es solo para usuarios con rol de administrador.
          Algunas funciones requieren permisos específicos.
        </p>
      </div>

      <div className="grid gap-6">
        <Link href="/docs/admin/dashboard" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Dashboard Administrativo</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Vista general del estado del sistema con estadísticas de usuarios, 
                  solicitudes pendientes y métricas importantes.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Estadísticas de usuarios activos</li>
                  <li>• Solicitudes pendientes por aprobar</li>
                  <li>• Métricas de uso del sistema</li>
                  <li>• Alertas y notificaciones importantes</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/admin/usuarios" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Gestión de Usuarios</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Administra usuarios, roles, permisos y configuración de cuentas 
                  corporativas.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Crear y editar usuarios</li>
                  <li>• Asignar roles y permisos</li>
                  <li>• Importar usuarios masivamente</li>
                  <li>• Gestión de cargos y departamentos</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/admin/solicitudes" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <FileCheck className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Gestión de Solicitudes</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Revisa, aprueba o rechaza solicitudes de vacaciones, permisos, 
                  incapacidades y certificaciones.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Revisar solicitudes pendientes</li>
                  <li>• Aprobar o rechazar con comentarios</li>
                  <li>• Ver historial de solicitudes</li>
                  <li>• Generar reportes de solicitudes</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/admin/comunicados" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Bell className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Gestión de Comunicados</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Crea, edita y gestiona comunicados corporativos, novedades y 
                  documentación importante.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Crear comunicados corporativos</li>
                  <li>• Gestionar novedades y noticias</li>
                  <li>• Subir documentos importantes</li>
                  <li>• Programar publicaciones</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/admin/configuracion" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Settings className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold">Configuración del Sistema</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Configura parámetros globales del sistema, políticas de vacaciones, 
                  y preferencias corporativas.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Configurar políticas de vacaciones</li>
                  <li>• Establecer días festivos</li>
                  <li>• Personalizar notificaciones</li>
                  <li>• Configurar integraciones</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-red-600" />
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          Recursos Rápidos para Administradores
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Reportes</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Reporte de solicitudes mensual</li>
              <li>• Análisis de uso del sistema</li>
              <li>• Estadísticas de vacaciones</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Herramientas</h4>
            <ul className="space-y-1 text-blue-700 dark:text-blue-300">
              <li>• Importador masivo de usuarios</li>
              <li>• Generador de reportes PDF</li>
              <li>• Panel de notificaciones</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}