import Link from 'next/link'
import { 
  Home, 
  Calendar, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  User,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function UserGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Guía de Usuario
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Guía completa para empleados sobre cómo usar todas las funcionalidades del sistema
        </p>
      </div>

      <div className="grid gap-6">
        <Link href="/docs/usuario/dashboard" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Home className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Dashboard Personal</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Tu centro de información personal con estadísticas de vacaciones, 
                  estado de solicitudes y acceso rápido a funciones importantes.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Ver saldo de vacaciones</li>
                  <li>• Estado de solicitudes pendientes</li>
                  <li>• Acceso rápido a crear solicitudes</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/usuario/solicitudes" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Gestión de Solicitudes</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Crea y gestiona diferentes tipos de solicitudes: vacaciones, permisos, 
                  incapacidades y certificaciones laborales.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Solicitar vacaciones con calendario interactivo</li>
                  <li>• Crear solicitudes de permiso</li>
                  <li>• Reportar incapacidades médicas</li>
                  <li>• Solicitar certificaciones laborales</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/usuario/novedades" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Novedades y Comunicados</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Mantente informado sobre comunicados importantes, novedades de la empresa 
                  y eventos del equipo.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Ver comunicados corporativos</li>
                  <li>• Leer novedades y actualizaciones</li>
                  <li>• Acceder a documentos importantes</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/docs/usuario/reportes" className="group">
          <div className="p-6 border border-gray-200 rounded-lg hover:shadow-lg transition-shadow dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <h3 className="text-lg font-semibold">Reporte de Fallas</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Reporta problemas técnicos o fallas en el sistema para que el equipo 
                  de soporte pueda ayudarte rápidamente.
                </p>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <li>• Crear tickets de soporte</li>
                  <li>• Adjuntar capturas de pantalla</li>
                  <li>• Seguimiento de reportes</li>
                </ul>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-orange-600" />
            </div>
          </div>
        </Link>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          ¿Nuevo en el sistema?
        </h3>
        <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
          Comienza con estos pasos básicos para familiarizarte con la plataforma:
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Completa tu perfil personal</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Revisa tu saldo de vacaciones</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Explora el dashboard personal</span>
          </div>
        </div>
      </div>
    </div>
  )
}