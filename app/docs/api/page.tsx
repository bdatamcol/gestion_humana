import { Code, Database, Server, Key, BookOpen } from 'lucide-react'

export default function ApiGuide() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          API Reference
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          Documentación técnica de la API del sistema de gestión humana
        </p>
      </div>

      <div className="grid gap-6">
        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Server className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Endpoints Principales</h3>
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mb-2">
                GET /api/vacaciones/disponibilidad
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Obtiene los días disponibles de vacaciones para un usuario
              </p>
            </div>
            <div>
              <h4 className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mb-2">
                POST /api/notificaciones
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Envía una notificación a usuarios específicos
              </p>
            </div>
            <div>
              <h4 className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded mb-2">
                GET /api/online-users
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Obtiene la lista de usuarios actualmente en línea
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Database className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold">Base de Datos</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            El sistema utiliza Supabase con PostgreSQL. Las tablas principales incluyen:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">users</code> - Información de usuarios</li>
            <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">solicitudes_vacaciones</code> - Solicitudes de vacaciones</li>
            <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">notificaciones</code> - Sistema de notificaciones</li>
            <li>• <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">comunicados</code> - Comunicados corporativos</li>
          </ul>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <Key className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold">Autenticación</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Todas las peticiones requieren autenticación mediante Supabase Auth:
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
            Authorization: Bearer {`<supabase_jwt_token>`}
          </div>
        </div>

        <div className="p-6 border border-gray-200 rounded-lg dark:border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Recursos Adicionales</h3>
          </div>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li>• <a href="https://supabase.com/docs" className="text-blue-600 hover:underline">Documentación de Supabase</a></li>
            <li>• <a href="/docs/seguridad" className="text-blue-600 hover:underline">Guía de seguridad</a></li>
            <li>• Ejemplos de código en el repositorio</li>
          </ul>
        </div>
      </div>
    </div>
  )
}