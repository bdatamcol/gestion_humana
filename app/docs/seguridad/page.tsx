import { Shield, Lock, Key, Eye, UserCheck, Settings } from 'lucide-react'

export default function SecurityGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Seguridad y Permisos
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Entiende el sistema de seguridad y cómo funcionan los permisos en la plataforma
        </p>
      </div>

      <div className="grid gap-6">
        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Shield className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Sistema de Roles</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Roles disponibles</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li><strong>Empleado:</strong> Acceso básico a funciones personales</li>
                <li><strong>Supervisor:</strong> Puede aprobar solicitudes de su equipo</li>
                <li><strong>Administrador:</strong> Acceso completo al sistema</li>
                <li><strong>Recursos Humanos:</strong> Gestión de empleados y políticas</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Lock className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Permisos Granulares</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Cada rol tiene permisos específicos que determinan qué puede hacer:
          </p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Permisos comunes</h4>
              <ul className="text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Ver perfil personal</li>
                <li>• Crear solicitudes propias</li>
                <li>• Ver historial de solicitudes</li>
                <li>• Leer comunicados</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Permisos admin</h4>
              <ul className="text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Gestionar usuarios</li>
                <li>• Aprobar cualquier solicitud</li>
                <li>• Crear comunicados</li>
                <li>• Configurar políticas</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Seguridad de Datos</h3>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Encriptación de datos sensibles</span>
            </li>
            <li className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4" />
              <span>Autenticación segura con Supabase</span>
            </li>
            <li className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Control de acceso basado en roles (RBAC)</span>
            </li>
          </ul>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Settings className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Mejores Prácticas</h3>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 space-y-3">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Para usuarios</h4>
              <ul className="space-y-1 mt-1">
                <li>• Usa contraseñas fuertes y únicas</li>
                <li>• No compartas credenciales</li>
                <li>• Cierra sesión en dispositivos compartidos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white">Para administradores</h4>
              <ul className="space-y-1 mt-1">
                <li>• Revisa regularmente los permisos de usuarios</li>
                <li>• Desactiva cuentas de empleados inactivos</li>
                <li>• Monitorea el acceso a datos sensibles</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}