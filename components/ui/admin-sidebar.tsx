"use client"
import * as React from "react"
import { useState, useEffect } from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps, cva } from "class-variance-authority"
import { PanelLeft, Menu, X, LogOut, User, Home, Info, FileText, Newspaper, Calendar, ChevronDown, Plus, BarChart3, Heart, Activity, Shield, Scale, AlertTriangle, Briefcase, Settings } from "lucide-react"
import { FaUser, FaBuilding, FaFileAlt, FaCalendarAlt, FaIdCard, FaChartPie, FaHeart, FaRunning, FaHardHat, FaBalanceScale } from 'react-icons/fa'
import { useRouter } from "next/navigation"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClient } from "@supabase/supabase-js"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { usePermissions } from "@/hooks/use-permissions"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface AdminSidebarProps {
  userName?: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

export function AdminSidebar({ userName = "Administrador" }: AdminSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<{[key: string]: boolean}>({})
  const router = useRouter()
  const { userData, loading: permissionsLoading } = usePermissions()

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.push("/")
    }
  }

  const currentPath = usePathname();

  // Generar menuItems dinámicamente basado en rol
  const menuItems = React.useMemo(() => {
    if (permissionsLoading || !userData) return [];
    
    const items = [];
    
    // 1. Escritorio - Siempre incluir
    items.push({ 
      name: "Escritorio", 
      href: "/administracion", 
      icon: Home, 
      current: currentPath === "/administracion" 
    });
    
    // Solo administradores tienen acceso completo
    if (userData.rol === 'administrador') {
      // 2. Estadísticas
      items.push({ 
        name: "Estadísticas", 
        href: "/administracion/estadisticas", 
        icon: FaChartPie, 
        current: currentPath === "/administracion/estadisticas" 
      });
      
      // 3. Usuarios
      items.push({
        name: "Usuarios",
        icon: User,
        current: currentPath.includes("/administracion/usuarios"),
        subItems: [
          {
            name: "Todos",
            href: "/administracion/usuarios",
            icon: User,
            current: currentPath === "/administracion/usuarios"
          },
          {
            name: "Cargos",
            href: "/administracion/usuarios/cargos",
            icon: FileText,
            current: currentPath === "/administracion/usuarios/cargos"
          },
        ],
      });
      
      // 4. Solicitudes
      items.push({
        name: "Solicitudes",
        icon: FileText,
        current: currentPath.includes("/administracion/solicitudes"),
        subItems: [
          {
            name: "Certificación Laboral",
            href: "/administracion/solicitudes/certificacion-laboral",
            icon: Newspaper,
            current: currentPath === "/administracion/solicitudes/certificacion-laboral"
          },
          {
            name: "Vacaciones",
            href: "/administracion/solicitudes/vacaciones",
            icon: Calendar,
            current: currentPath === "/administracion/solicitudes/vacaciones"
          },
          {
            name: "Permisos",
            href: "/administracion/solicitudes/permisos",
            icon: FileText,
            current: currentPath === "/administracion/solicitudes/permisos"
          },
        ],
      });
      
      // 5. Comunicados
      items.push({
        name: "Comunicados",
        icon: Newspaper,
        current: currentPath.includes("/administracion/comunicados"),
        subItems: [
          {
            name: "Todos",
            href: "/administracion/comunicados",
            icon: FileText,
            current: currentPath === "/administracion/comunicados"
          },
          {
            name: "Añadir nuevo",
            href: "/administracion/comunicados/nuevo",
            icon: Plus,
            current: currentPath === "/administracion/comunicados/nuevo"
          },
          {
            name: "Categorías",
            href: "/administracion/comunicados/categorias",
            icon: FaFileAlt,
            current: currentPath === "/administracion/comunicados/categorias"
          },
        ],
      });
      
      // 6. Novedades
      items.push({
        name: "Novedades",
        icon: FileText,
        current: currentPath.includes("/administracion/novedades"),
        subItems: [
          {
            name: "Incapacidades",
            href: "/administracion/novedades/incapacidades",
            icon: FaFileAlt,
            current: currentPath === "/administracion/novedades/incapacidades"
          },
        ],
      });
      
      // Primer separador
      items.push({ 
        name: "separator-1", 
        type: "separator" 
      });
      
      // 7. Bienestar
      items.push({
        name: "Bienestar",
        icon: FaHeart,
        current: currentPath.includes("/administracion/bienestar"),
        subItems: [
          {
            name: "Todas las publicaciones",
            href: "/administracion/bienestar",
            icon: FileText,
            current: currentPath === "/administracion/bienestar"
          },
          {
            name: "Nueva publicación",
            href: "/administracion/bienestar/nuevo",
            icon: Plus,
            current: currentPath === "/administracion/bienestar/nuevo"
          },
        ],
      });
      
      // 8. Actividades
      items.push({
        name: "Actividades",
        icon: FaRunning,
        current: currentPath.includes("/administracion/actividades"),
        subItems: [
          {
            name: "Todas las publicaciones",
            href: "/administracion/actividades",
            icon: FileText,
            current: currentPath === "/administracion/actividades"
          },
          {
            name: "Nueva publicación",
            href: "/administracion/actividades/nuevo",
            icon: Plus,
            current: currentPath === "/administracion/actividades/nuevo"
          },
        ],
      });
      
      // 9. SST (Seguridad y Salud en el Trabajo)
      items.push({
        name: "SST",
        icon: FaHardHat,
        current: currentPath.includes("/administracion/sst"),
        subItems: [
          {
            name: "Todas las publicaciones",
            href: "/administracion/sst",
            icon: FileText,
            current: currentPath === "/administracion/sst"
          },
          {
            name: "Nueva publicación",
            href: "/administracion/sst/nuevo",
            icon: Plus,
            current: currentPath === "/administracion/sst/nuevo"
          },
        ],
      });
      
      // 10. Normatividad
      items.push({
        name: "Normatividad",
        icon: FaBalanceScale,
        current: currentPath.includes("/administracion/normatividad"),
        subItems: [
          {
            name: "Todas las publicaciones",
            href: "/administracion/normatividad",
            icon: FileText,
            current: currentPath === "/administracion/normatividad"
          },
          {
            name: "Nueva publicación",
            href: "/administracion/normatividad/nuevo",
            icon: Plus,
            current: currentPath === "/administracion/normatividad/nuevo"
          },
        ],
      });
      
      // Segundo separador
      items.push({ 
        name: "separator-2", 
        type: "separator" 
      });
      
      // 12. Ajustes
      items.push({ 
        name: "Ajustes", 
        href: "/administracion/ajustes", 
        icon: Settings, 
        current: currentPath === "/administracion/ajustes" 
      });
      
      // 13. Trabaja con nosotros
      items.push({ 
        name: "Trabaja con nosotros", 
        href: "/administracion/aplicaciones-trabajo", 
        icon: Briefcase, 
        current: currentPath === "/administracion/aplicaciones-trabajo" 
      });
      
      // 14. Reporte de Fallas
      items.push({ 
        name: "Reporte de Fallas", 
        href: "/administracion/reporte-fallas", 
        icon: AlertTriangle, 
        current: currentPath === "/administracion/reporte-fallas" 
      });
    }
    
    // 15. Mis datos - Siempre incluir al final
    items.push({ 
      name: "Mis datos", 
      href: "/administracion/perfil", 
      icon: Info, 
      current: currentPath === "/administracion/perfil" 
    });
    
    return items;
  }, [permissionsLoading, userData, currentPath]);
  
  // Inicializar el estado de expansión basado en la ruta actual
  useEffect(() => {
    const newExpandedMenus = {...expandedMenus};
    menuItems.forEach((item, index) => {
      if ('subItems' in item && item.subItems && Array.isArray(item.subItems)) {
        const hasActiveSubItem = item.subItems.some((subItem: any) => subItem.current);
        if (hasActiveSubItem) {
          newExpandedMenus[index] = true;
        }
      }
    });
    setExpandedMenus(newExpandedMenus);
  }, [currentPath]);
  
  const toggleMenu = (index: number) => {
    setExpandedMenus(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  }

  return (
    <>
      {/* Mobile sidebar toggle */}
      <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-white shadow">
        <button
          type="button"
          className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Abrir sidebar</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn("fixed inset-0 z-40 flex md:hidden", sidebarOpen ? "block" : "hidden")}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        ></div>

        <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white h-screen">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Cerrar sidebar</span>
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
            <img src="/logo-h-n.webp" alt="Logo" className="max-w-[150px]" />
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {menuItems.map((item, index) => (
                <div key={item.name}>
                  {item.type === 'separator' ? (
                    <Separator className="my-3" />
                  ) : ('subItems' in item && item.subItems) ? (
                    <>
                      <button
                        onClick={() => toggleMenu(index)}
                        className={cn(
                          item.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          "group flex items-center justify-between w-full px-2 py-2 text-base font-medium rounded-md",
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={cn(
                              item.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                              "mr-4 flex-shrink-0 h-6 w-6",
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-gray-400 transition-transform duration-200",
                            expandedMenus[index] ? "transform rotate-180" : ""
                          )}
                        />
                      </button>
                      {expandedMenus[index] && (
                        <div className="pl-8 mt-1 space-y-1">
                          {('subItems' in item && item.subItems && Array.isArray(item.subItems)) && item.subItems.map((subItem: any) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                subItem.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                              )}
                            >
                              <subItem.icon
                                className={cn(
                                  subItem.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                                  "mr-3 flex-shrink-0 h-5 w-5",
                                )}
                                aria-hidden="true"
                              />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        item.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md",
                      )}
                    >
                      <item.icon
                        className={cn(
                          item.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                          "mr-4 flex-shrink-0 h-6 w-6",
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ) : null}
                </div>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Button variant="destructive" className="flex items-center w-full" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>

        <div className="flex-shrink-0 w-14"></div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white px-2">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center flex-shrink-0 px-4">
            <img src="/logo-h-n.webp" alt="Logo" className="max-w-[150px]" />
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {menuItems.map((item, index) => (
                <div key={item.name}>
                  {item.type === 'separator' ? (
                    <Separator className="my-3" />
                  ) : ('subItems' in item && item.subItems) ? (
                    <>
                      <button
                        onClick={() => toggleMenu(index)}
                        className={cn(
                          item.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                          "group flex items-center justify-between w-full px-2 py-2 text-sm font-medium rounded-md",
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={cn(
                              item.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                              "mr-3 flex-shrink-0 h-5 w-5",
                            )}
                            aria-hidden="true"
                          />
                          {item.name}
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-5 w-5 text-gray-400 transition-transform duration-200",
                            expandedMenus[index] ? "transform rotate-180" : ""
                          )}
                        />
                      </button>
                      {expandedMenus[index] && (
                        <div className="pl-8 mt-1 space-y-1">
                          {('subItems' in item && item.subItems && Array.isArray(item.subItems)) && item.subItems.map((subItem: any) => (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              className={cn(
                                subItem.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                                "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                              )}
                            >
                              <subItem.icon
                                className={cn(
                                  subItem.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                                  "mr-3 flex-shrink-0 h-5 w-5",
                                )}
                                aria-hidden="true"
                              />
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        item.current ? "bg-primary/10 text-primary" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                        "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                      )}
                    >
                      <item.icon
                        className={cn(
                          item.current ? "text-primary" : "text-gray-400 group-hover:text-gray-500",
                          "mr-3 flex-shrink-0 h-5 w-5",
                        )}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  ) : null}
                </div>
              ))}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <Button variant="destructive" className="group flex items-center rounded-md bg-red-500 px-2 py-2 text-sm font-medium text-white hover:bg-red-600 w-full" onClick={handleSignOut}>
              <LogOut className="mr-3 h-5 w-5 text-white" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
