"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
import { Card, CardContent} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, CheckCircle2, Search, X, ChevronDown, ChevronUp, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { ComentariosPermisos } from "@/components/permisos/comentarios-permisos"

// Tipos para los datos principales
interface Empresa {
  nombre: string
  razon_social?: string
  nit?: string
}

// Interfaz para datos de empresa en relaciones
interface EmpresaData {
  nombre?: string
}

interface Usuario {
  auth_user_id: string
  colaborador?: string
  cedula?: string
  cargo?: string
  fecha_ingreso?: string
  empresa_id?: string
  empresas?: Empresa
}

interface SolicitudPermiso {
  id: string
  tipo_permiso: string
  fecha_inicio: string
  fecha_fin: string
  hora_inicio?: string
  hora_fin?: string
  motivo?: string
  compensacion?: string
  ciudad?: string
  estado: string
  fecha_solicitud: string
  fecha_resolucion?: string
  motivo_rechazo?: string
  pdf_url?: string
  usuario_id: string
  admin_id?: string
  usuario?: Usuario | null
}

export default function AdminSolicitudesPermisos() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)
  const [searchLoading, setSearchLoading] = useState<boolean>(false)
  const [solicitudes, setSolicitudes] = useState<SolicitudPermiso[]>([])
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<SolicitudPermiso[]>([])
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [showModal, setShowModal] = useState<boolean>(false)
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<{id: string, usuario: Usuario | null} | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState<string>("")
  const [showComentariosModal, setShowComentariosModal] = useState<boolean>(false)
  const [solicitudComentariosId, setSolicitudComentariosId] = useState<string | undefined>(undefined)
  const [unseenCounts, setUnseenCounts] = useState<Record<string, number>>({})
  const [adminId, setAdminId] = useState<string | null>(null)
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [selectedEstado, setSelectedEstado] = useState<string>("all") 
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>("all") 
  const [selectedTipoPermiso, setSelectedTipoPermiso] = useState<string>("all") 
  const [empresas, setEmpresas] = useState<any[]>([]); // Cambiar 'any' por el tipo correcto una vez que se resuelva el problema de tipado
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  
  // Referencia para el timeout de búsqueda
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  // Obtener conteo de mensajes no leídos para una solicitud
  const fetchUnseenCount = async (solId: string) => {
    if (!adminId) return
    const supabase = createSupabaseClient()
    const { count, error } = await supabase
      .from("comentarios_permisos")
      .select("*", { head: true, count: "exact" })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    if (!error) {
      setUnseenCounts(prev => ({ ...prev, [solId]: count || 0 }))
    }
  }

  // Marcar comentarios como leídos y abrir modal
  const markReadAndOpen = async (solId: string) => {
    if (!adminId) return
    const supabase = createSupabaseClient()

    // Actualizar en BD
    await supabase
      .from("comentarios_permisos")
      .update({ visto_admin: true })
      .eq("solicitud_id", solId)
      .eq("visto_admin", false)
      .neq("usuario_id", adminId)

    // Limpiar contador local
    setUnseenCounts(prev => ({ ...prev, [solId]: 0 }))

    // Abrir modal
    setSolicitudComentariosId(solId)
    setShowComentariosModal(true)
  }

  // Suscribirse a nuevos comentarios
  useEffect(() => {
    if (!adminId) return
    const supabase = createSupabaseClient()

    const channel = supabase
      .channel("admin_comentarios_permisos")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comentarios_permisos" },
        ({ new: n }: any) => {
          if (n.usuario_id !== adminId) {
            setUnseenCounts(prev => ({
              ...prev,
              [n.solicitud_id]: (prev[n.solicitud_id] || 0) + 1,
            }))
          }
        }
      )
      .subscribe()

    return () => void supabase.removeChannel(channel)
  }, [adminId])

  // Obtener todas las solicitudes
  useEffect(() => {
    const fetchSolicitudes = async () => {
      setLoading(true)
      try {
        const supabase = createSupabaseClient()
        
        // Obtener sesión del usuario administrador
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push("/login")
          return
        }
        
        // Guardar ID del administrador para uso en comentarios
        setAdminId(session.user.id)
        
        // Ejecutar consultas en paralelo para mejor rendimiento
        const [solicitudesResult] = await Promise.all([
          supabase
            .from('solicitudes_permisos')
            .select(`
              id, tipo_permiso, fecha_inicio, fecha_fin, hora_inicio, hora_fin, 
              motivo, compensacion, ciudad, estado, fecha_solicitud, fecha_resolucion, 
              motivo_rechazo, pdf_url, usuario_id, admin_id
            `)
            .order('fecha_solicitud', { ascending: false })
        ])

        if (solicitudesResult.error) {
          console.error("Error al obtener solicitudes:", solicitudesResult.error)
          setError("Error al cargar las solicitudes: " + solicitudesResult.error.message)
          return
        }
        
        // Si la consulta básica funciona, obtener los datos de usuario en paralelo
        if (solicitudesResult.data && solicitudesResult.data.length > 0) {
          // Obtener IDs únicos de usuarios
          const userIds = [...new Set(solicitudesResult.data.map(item => item.usuario_id))]
          
          // Obtener datos de usuarios en paralelo
          const [usuariosResult] = await Promise.all([
            supabase
              .from('usuario_nomina')
              .select(`
                auth_user_id,
                colaborador,
                cedula,
                cargo_id,
                fecha_ingreso,
                empresa_id,
                empresas:empresas(nombre),
                cargos:cargo_id(nombre)
              `)
              .in('auth_user_id', userIds)
          ])
          
          if (usuariosResult.error) {
            console.error('Error al obtener datos de usuarios:', usuariosResult.error)
            setError('Error al cargar datos de usuarios: ' + usuariosResult.error.message)
            return
          }
          
          // Combinar los datos
          const solicitudesCompletas = solicitudesResult.data.map(solicitud => {
            const usuario = usuariosResult.data?.find(u => u.auth_user_id === solicitud.usuario_id)
            return {
              ...solicitud,
              usuario: usuario || null
            }
          })
          
          // Guardar todas las solicitudes
          setSolicitudes(solicitudesCompletas as SolicitudPermiso[] || [])
          setFilteredSolicitudes(solicitudesCompletas as SolicitudPermiso[] || [])
          
          // Extraer empresas únicas para el filtro
          const uniqueEmpresas = Array.from(
            new Set(
              usuariosResult.data
                ?.filter(usuario => {
                  if (!usuario.empresas) return false;
                  const empresas = usuario.empresas as EmpresaData;
                  return !!empresas.nombre;
                })
                .map(usuario => {
                  const empresas = usuario.empresas as { nombre?: string };
                  return empresas.nombre;
                })
                .filter((nombre): nombre is string => typeof nombre === 'string')
            )
          )
          setEmpresas(uniqueEmpresas)
          
          // Obtener conteos de mensajes no leídos para cada solicitud
          solicitudesCompletas.forEach(s => {
            if (typeof s.id === 'string') {
              fetchUnseenCount(s.id);
            }
          });
        } else {
          // Si no hay datos, inicializar con arrays vacíos
          setSolicitudes([])
          setFilteredSolicitudes([])
          setEmpresas([])
        }
      } catch (err) {
        console.error("Error al obtener solicitudes:", err)
        setError("Error al cargar las solicitudes: " + (err instanceof Error ? err.message : JSON.stringify(err)))
      } finally {
        setLoading(false)
      }
    }

    fetchSolicitudes()
  }, [router])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    return new Date(date).toLocaleDateString('es-CO', options)
  }
  
  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }

    setSortConfig({ key, direction })
  }
  
  // Aplicar filtros y ordenamiento con debounce para la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)

    // Mostrar el preloader
    setSearchLoading(true)

    // Limpiar el timeout anterior si existe
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    // Establecer un nuevo timeout para aplicar la búsqueda después de 300ms
    searchTimeout.current = setTimeout(() => {
      applyFilters(value, selectedEstado, selectedEmpresa, selectedTipoPermiso, sortConfig)
    }, 300)
  }
  
  // Función para aplicar todos los filtros
  const applyFilters = (
    search: string,
    estado: string,
    empresa: string,
    tipoPermiso: string,
    sort: { key: string; direction: "asc" | "desc" } | null,
  ) => {
    let result = [...solicitudes]

    // Aplicar búsqueda
    if (search) {
      const lowerCaseSearchTerm = search.toLowerCase()
      result = result.filter(
        (solicitud) =>
          solicitud.usuario?.colaborador?.toLowerCase().includes(lowerCaseSearchTerm) ||
          solicitud.usuario?.cedula?.toLowerCase().includes(lowerCaseSearchTerm) ||
          solicitud.usuario?.empresas?.nombre?.toLowerCase().includes(lowerCaseSearchTerm)
      )
    }

    // Aplicar filtro de estado
    if (estado && estado !== "all") {
      result = result.filter((solicitud) => solicitud.estado === estado)
    }

    // Aplicar filtro de empresa
    if (empresa && empresa !== "all") {
      result = result.filter((solicitud) => solicitud.usuario?.empresas?.nombre === empresa)
    }

    // Aplicar filtro de tipo de permiso
    if (tipoPermiso && tipoPermiso !== "all") {
      result = result.filter((solicitud) => solicitud.tipo_permiso === tipoPermiso)
    }

    // Aplicar ordenamiento
    if (sort !== null) {
      result.sort((a, b) => {
        let aValue, bValue

        if (sort.key === "empresa") {
          aValue = a.usuario?.empresas?.nombre || ""
          bValue = b.usuario?.empresas?.nombre || ""
        } else if (sort.key === "colaborador") {
          aValue = a.usuario?.colaborador || ""
          bValue = b.usuario?.colaborador || ""
        } else if (sort.key === "fecha_solicitud" || sort.key === "fecha_inicio" || sort.key === "fecha_fin") {
          aValue = new Date(a[sort.key] || "").getTime()
          bValue = new Date(b[sort.key] || "").getTime()
        } else {
          aValue = a[sort.key as keyof SolicitudPermiso] || ""
          bValue = b[sort.key as keyof SolicitudPermiso] || ""
        }

        if (aValue < bValue) {
          return sort.direction === "asc" ? -1 : 1
        }
        if (aValue > bValue) {
          return sort.direction === "asc" ? 1 : -1
        }
        return 0
      })
    }

    setFilteredSolicitudes(result)
    setSearchLoading(false) // Ocultar el preloader
  }
  
  // Efecto para aplicar filtros cuando cambian los selectores o el ordenamiento
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    setSearchLoading(true)
    searchTimeout.current = setTimeout(() => {
      applyFilters(searchTerm, selectedEstado, selectedEmpresa, selectedTipoPermiso, sortConfig)
    }, 300)
  }, [selectedEstado, selectedEmpresa, selectedTipoPermiso, sortConfig, solicitudes])
  
  const clearFilters = () => {
    setSearchTerm("")
    setSelectedEstado("all")
    setSelectedEmpresa("all")
    setSelectedTipoPermiso("all")
    setSortConfig(null)
  }

  const aprobarSolicitud = async (solicitudId: string, usuarioData: any) => {
    try {
      if (!usuarioData || !usuarioData.empresas) {
        setError("Datos del usuario o empresa no disponibles")
        return
      }

      setLoading(true)
      setError("")
      
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push("/login")
        return
      }

      // Obtener datos de la solicitud
      const { data: solicitudData, error: solicitudError } = await supabase
        .from('solicitudes_permisos')
        .select('*')
        .eq('id', solicitudId)
        .single()

      if (solicitudError) throw solicitudError

      // Crear un elemento HTML temporal para renderizar el permiso
      const permisoContainer = document.createElement("div")
      // Configurar dimensiones exactas de tamaño carta (215.9mm x 279.4mm)
      permisoContainer.style.width = "215.9mm"
      permisoContainer.style.height = "279.4mm"
      permisoContainer.style.padding = "0"
      permisoContainer.style.margin = "0"
      permisoContainer.style.overflow = "hidden"
      permisoContainer.style.fontFamily = "Arial, sans-serif"
      permisoContainer.style.position = "absolute"
      permisoContainer.style.left = "-9999px"
      
      const fechaActual = formatDate(new Date())
      
      // Formatear las fechas para el PDF
      const fechaInicio = new Date(solicitudData.fecha_inicio as string)
      const fechaFin = new Date(solicitudData.fecha_fin as string)
      const diaInicio = fechaInicio.getDate()
      const mesInicio = fechaInicio.getMonth() + 1
      const anioInicio = fechaInicio.getFullYear()
      const diaFin = fechaFin.getDate()
      const mesFin = fechaFin.getMonth() + 1
      const anioFin = fechaFin.getFullYear()
      
      // Determinar el tipo de permiso en español
      let tipoPermisoTexto = "";
      switch(solicitudData.tipo_permiso) {
        case "no_remunerado":
          tipoPermisoTexto = "Permiso no remunerado";
          break;
        case "remunerado":
          tipoPermisoTexto = "Permiso Remunerado";
          break;
        case "actividad_interna":
          tipoPermisoTexto = "Actividad Interna";
          break;
        default:
          tipoPermisoTexto = "Permiso";
      }
      
      // Preparar el contenido del PDF
      let permisoHTML = `
        <div style="width: 215.9mm; height: 279.4mm; padding: 20px; font-family: Arial, sans-serif;">
          <div style="border: 1px solid #000; padding: 10px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 20%; border: 1px solid #000; padding: 5px;"></td>
                <td style="width: 60%; border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">MANUAL DE PROCESOS SOPORTE</td>
                <td style="width: 20%; border: 1px solid #000; padding: 5px; text-align: center;">MPS-GTH-F-01-16</td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">PROCEDIMIENTO DE SELECCIÓN Y VINCULACION DEL PERSONAL</td>
                <td style="border: 1px solid #000; padding: 5px;">
                  <div style="text-align: center;">FECHA</div>
                  <div style="text-align: center;">2022-08-01</div>
                </td>
              </tr>
              <tr>
                <td style="border: 1px solid #000; padding: 5px;"></td>
                <td style="border: 1px solid #000; padding: 5px; text-align: center; font-weight: bold;">SOLICITUD Y REGISTRO DE PERMISOS</td>
                <td style="border: 1px solid #000; padding: 5px;">
                  <div style="text-align: center;">VERSIÓN</div>
                  <div style="text-align: center;">02</div>
                </td>
              </tr>
              <tr>
                <td colspan="3" style="border: 1px solid #000; padding: 5px; text-align: center;">Página 1 de 1</td>
              </tr>
            </table>
            
            <div style="margin-top: 20px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <div>
                  <span style="font-weight: bold;">Ciudad: </span>
                  <span>${usuarioData.empresas?.ciudad || 'No especificada'}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">Fecha: </span>
                  <span>${fechaActual}</span>
                </div>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div>
                  <span style="font-weight: bold;">Nombre del funcionario: </span>
                  <span>${usuarioData.colaborador || ''}</span>
                </div>
                <div>
                  <span style="font-weight: bold;">Cargo: </span>
                  <span>${usuarioData.cargos?.nombre || ''}</span>
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p style="font-weight: bold;">Tipo de Permiso/Actividad Interna Solicitado:</p>
                <div style="margin-left: 20px;">
                  ${solicitudData.tipo_permiso === 'no_remunerado' ? `
                  <div style="margin-bottom: 10px;">
                    <input type="checkbox" checked style="margin-right: 10px;">
                    <span>Permiso no remunerado</span>
                    <span style="margin-left: 20px;">Hora: desde ${solicitudData.hora_inicio || '________'} hasta ${solicitudData.hora_fin || '________'}</span>
                  </div>
                  ` : ''}
                  ${solicitudData.tipo_permiso === 'remunerado' ? `
                  <div style="margin-bottom: 10px;">
                    <input type="checkbox" checked style="margin-right: 10px;">
                    <span>Permiso Remunerado</span>
                    <span style="margin-left: 20px;">Hora: desde ${solicitudData.hora_inicio || '________'} hasta ${solicitudData.hora_fin || '________'}</span>
                  </div>
                  ` : ''}
                  ${solicitudData.tipo_permiso === 'actividad_interna' ? `
                  <div>
                    <input type="checkbox" checked style="margin-right: 10px;">
                    <span>Actividad Interna</span>
                    <span style="margin-left: 20px;">Hora: desde ${solicitudData.hora_inicio || '________'} hasta ${solicitudData.hora_fin || '________'}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p>Este permiso/actividad interna será tomado a partir del día ${diaInicio} mes ${mesInicio} del año ${anioInicio} hasta el día ${diaFin} mes ${mesFin} del año ${anioFin}</p>
                <p style="font-weight: bold;">Motivo del Permiso/Actividad Interna: </p>
                <p style="border-bottom: 1px solid #000; padding-bottom: 5px;">${solicitudData.motivo || 'No especificado'}</p>
              </div>
              
              <div style="margin-bottom: 20px;">
                <p>Las solicitudes de permiso laboral se deben presentar dos días antes de hacer efectivo el permiso, a excepción del permiso por enfermedad.</p>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-top: 40px;">
                <div style="text-align: center; width: 30%;">
                  <div style="border-top: 1px solid #000; padding-top: 5px;">Firma Solicitante</div>
                </div>
                <div style="text-align: center; width: 30%;">
                  <div style="border-top: 1px solid #000; padding-top: 5px;">Vo.Bo. Jefe Inmediato</div>
                </div>
                <div style="text-align: center; width: 30%;">
                  <div style="border-top: 1px solid #000; padding-top: 5px;">Vo.Bo. Directora Talento Humano</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      permisoContainer.innerHTML = permisoHTML;

      document.body.appendChild(permisoContainer);
      // Configurar html2canvas para capturar exactamente el tamaño carta
      // Carta en píxeles a 96 DPI: 816 x 1056 (215.9mm x 279.4mm)
      const canvas = await html2canvas(permisoContainer, {
        scale: 2, // Mayor escala para mejor calidad
        useCORS: true,
        logging: false,
        width: 816, // Ancho exacto de carta en píxeles (215.9mm)
        height: 1056, // Alto exacto de carta en píxeles (279.4mm)
        windowWidth: 816,
        windowHeight: 1056
      });
      document.body.removeChild(permisoContainer);

      // Crear documento PDF con formato carta estándar
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter", // Formato carta estándar (215.9mm x 279.4mm)
        compress: true // Comprimir para reducir tamaño
      });

      // Convertir canvas a imagen con alta calidad
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      
      // Obtener dimensiones exactas del PDF
      const pdfWidth = pdf.internal.pageSize.getWidth(); // 215.9mm
      const pdfHeight = pdf.internal.pageSize.getHeight(); // 279.4mm
      
      // Añadir imagen al PDF ajustando al tamaño exacto de carta
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      // Subir el PDF a Supabase Storage
      try {
        const pdfBlob = pdf.output("blob");
        const fileName = `permisos/${solicitudId}.pdf`;
        
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('permisos')
          .upload(fileName, pdfBlob, {
            upsert: true,
            cacheControl: '3600'
          });

        if (uploadError) {
          if (uploadError.message.includes('row-level security')) {
            throw new Error('No tienes permisos para subir archivos. Por favor contacta al administrador.')
          }
          throw uploadError;
        }

        // Obtener URL pública del PDF
        const { data: urlData } = supabase
          .storage
          .from('permisos')
          .getPublicUrl(fileName);

        // Actualizar la solicitud como aprobada
        const { error } = await supabase
          .from('solicitudes_permisos')
          .update({
            estado: 'aprobado',
            admin_id: session.user.id,
            fecha_resolucion: new Date(),
            pdf_url: urlData.publicUrl
          })
          .eq('id', solicitudId);

        if (error) throw error;

        setSuccess("Solicitud aprobada y permiso generado correctamente.");
        setSolicitudes(solicitudes.map(s => s.id === solicitudId ? {
          ...s,
          estado: 'aprobado',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString(),
          pdf_url: urlData.publicUrl
        } : s));
        setFilteredSolicitudes(filteredSolicitudes.map(s => s.id === solicitudId ? {
          ...s,
          estado: 'aprobado',
          admin_id: session.user.id,
          fecha_resolucion: new Date().toISOString(),
          pdf_url: urlData.publicUrl
        } : s));
      } catch (err: any) {
        throw err;
      }
    } catch (err: any) {
      console.error("Error al aprobar solicitud:", err);
      setError(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const rechazarSolicitud = async (solicitudId: string, motivo: string) => {
    try {
      setLoading(true);
      setError("");
      
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      const { error } = await supabase
        .from('solicitudes_permisos')
        .update({
          estado: 'rechazado',
          admin_id: session.user.id,
          fecha_resolucion: new Date(),
          motivo_rechazo: motivo
        })
        .eq('id', solicitudId);

      if (error) throw error;

      setSuccess("Solicitud rechazada correctamente.");
      setSolicitudes(solicitudes.map(s => s.id === solicitudId ? {
        ...s, 
        estado: 'rechazado', 
        admin_id: session.user.id, 
        fecha_resolucion: new Date().toISOString(), 
        motivo_rechazo: motivo
      } : s));
      setFilteredSolicitudes(filteredSolicitudes.map(s => s.id === solicitudId ? {
        ...s, 
        estado: 'rechazado', 
        admin_id: session.user.id, 
        fecha_resolucion: new Date().toISOString(), 
        motivo_rechazo: motivo
      } : s));
    } catch (err) {
      console.error("Error al rechazar solicitud:", err);
      setError("Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  if (loading && solicitudes.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex flex-col flex-1">
          <main className="flex-1">
            <div className="w-full mx-auto space-y-6">
              {/* Header Skeleton */}
              <div className="flex justify-between items-center">
                <div>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>

              {/* Filtros Skeleton */}
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-1/3">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="w-full md:w-1/5">
                      <Skeleton className="h-4 w-12 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="w-full md:w-1/5">
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="w-full md:w-1/5">
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-10 w-32" />
                  </div>
                </CardContent>
              </Card>

              {/* Tabla Skeleton */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <TableHead key={i}>
                            <Skeleton className="h-4 w-20" />
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <TableCell key={j}>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 min-h-screen">
      <div className="flex flex-col flex-1">
        <main className="flex-1">
          <div className="w-full mx-auto space-y-6">
            {/* Título y Descripción */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Solicitudes de Permisos</h1>
                <p className="text-muted-foreground">Gestiona las solicitudes de permisos laborales.</p>
              </div>
              <Button className="btn-custom" onClick={() => router.push('/administracion/solicitudes/permisos/historico')}>Ver histórico</Button>
            </div>

            {/* Alertas */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Filtros */}
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  {/* Buscar */}
                  <div className="w-full md:w-1/3">
                    <Label htmlFor="search" className="mb-2 block">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="Buscar por nombre, cédula, cargo..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={handleSearchChange}
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchTerm("")
                            applyFilters("", selectedEstado, selectedEmpresa, selectedTipoPermiso, sortConfig)
                          }}
                          className="absolute right-2.5 top-2.5"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Estado */}
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="estado" className="mb-2 block">Estado</Label>
                    <Select value={selectedEstado} onValueChange={setSelectedEstado}>
                      <SelectTrigger id="estado"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobado">Aprobado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Empresa */}
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="empresa" className="mb-2 block">Empresa</Label>
                    <Select value={selectedEmpresa} onValueChange={setSelectedEmpresa}>
                      <SelectTrigger id="empresa"><SelectValue placeholder="Todas las empresas" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las empresas</SelectItem>
                        {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Tipo Permiso */}
                  <div className="w-full md:w-1/5">
                    <Label htmlFor="tipoPermiso" className="mb-2 block">Tipo de Permiso</Label>
                    <Select value={selectedTipoPermiso} onValueChange={setSelectedTipoPermiso}>
                      <SelectTrigger id="tipoPermiso"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        <SelectItem value="no_remunerado">No remunerado</SelectItem>
                        <SelectItem value="remunerado">Remunerado</SelectItem>
                        <SelectItem value="actividad_interna">Actividad interna</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={clearFilters} className="h-10">
                    Limpiar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de Solicitudes */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => requestSort("fecha_solicitud")}>
                        <div className="flex items-center">
                          Fecha Solicitud
                          {sortConfig?.key === "fecha_solicitud" && (sortConfig.direction === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort("colaborador")}>
                        <div className="flex items-center">
                          Colaborador
                          {sortConfig?.key === "colaborador" && (sortConfig.direction === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Cédula</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Compensación</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort("fecha_inicio")}>
                        <div className="flex items-center">
                          Fecha y Hora Inicio
                          {sortConfig?.key === "fecha_inicio" && (sortConfig.direction === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort("fecha_fin")}>
                        <div className="flex items-center">
                          Fecha y Hora Fin
                          {sortConfig?.key === "fecha_fin" && (sortConfig.direction === "asc" ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />)}
                        </div>
                      </TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-4">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800"></div>
                            <span className="ml-2">Buscando...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSolicitudes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-4">
                          No hay solicitudes que coincidan con los filtros.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSolicitudes.map((solicitud) => (
                        <TableRow key={solicitud.id}>
                          <TableCell>{new Date(solicitud.fecha_solicitud).toLocaleDateString()}</TableCell>
                          <TableCell>{solicitud.usuario?.colaborador}</TableCell>
                          <TableCell>{solicitud.usuario?.cedula}</TableCell>
                          <TableCell>
                            {solicitud.tipo_permiso === 'no_remunerado'
                              ? 'No remunerado'
                              : solicitud.tipo_permiso === 'remunerado'
                              ? 'Remunerado'
                              : 'Actividad interna'}
                          </TableCell>
                          <TableCell>{solicitud.ciudad || 'No especificada'}</TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={solicitud.motivo}>
                              {solicitud.motivo || 'No especificado'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={solicitud.compensacion}>
                              {solicitud.compensacion || 'No especificada'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{new Date(solicitud.fecha_inicio).toLocaleDateString()}</div>
                              <div className="text-sm text-gray-500">{solicitud.hora_inicio || 'No especificada'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div>{new Date(solicitud.fecha_fin).toLocaleDateString()}</div>
                              <div className="text-sm text-gray-500">{solicitud.hora_fin || 'No especificada'}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                solicitud.estado === 'aprobado'
                                  ? 'bg-green-100 text-green-800'
                                  : solicitud.estado === 'rechazado'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }
                            >
                              {solicitud.estado.charAt(0).toUpperCase() + solicitud.estado.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {solicitud.estado === 'pendiente' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const motivo = prompt("Ingrese el motivo del rechazo:")
                                      if (motivo) rechazarSolicitud(solicitud.id, motivo)
                                    }}
                                  >
                                    Rechazar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => aprobarSolicitud(solicitud.id, solicitud.usuario)}
                                  >
                                    Aprobar
                                  </Button>
                                </>
                              ) : solicitud.estado === 'aprobado' ? (
                                <Button
                                  size="sm"
                                  onClick={() => window.open(solicitud.pdf_url, '_blank')}
                                >
                                  <FileDown className="h-4 w-4 mr-1" />Ver PDF
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => aprobarSolicitud(solicitud.id, solicitud.usuario)}
                                >
                                  Aprobar
                                </Button>
                              )}
                              <div className="relative inline-block">
                                {unseenCounts[solicitud.id] > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
                                    {unseenCounts[solicitud.id]}
                                  </span>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markReadAndOpen(solicitud.id)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal de Comentarios */}
      <Dialog open={showComentariosModal} onOpenChange={setShowComentariosModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Comentarios de la solicitud</DialogTitle>
          </DialogHeader>
          <ComentariosPermisos solicitudId={solicitudComentariosId} isAdmin={true} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// La obtención de empresas ya se realiza en el useEffect principal
// que carga las solicitudes
