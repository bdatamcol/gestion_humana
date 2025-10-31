"use client";

import React, { useState, useEffect } from "react";
// Sidebar removido - ya está en el layout
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ComunicadoAvatar from "@/components/ui/comunicado-avatar";
import { createSupabaseClient } from "@/lib/supabase";
import { Search, Eye, EyeOff, Calendar, Building } from "lucide-react";

interface Comunicado {
  id: string;
  titulo: string;
  imagen_url: string | null;
  fecha_publicacion: string | null;
  area_responsable: string;
  estado: string;
  leido: boolean;
  comunicados_empresas: {
    empresa_id: string;
    empresas: {
      nombre: string;
    };
  }[];
  comunicados_usuarios: {
    usuario_id: string;
    usuario_nomina: {
      colaborador: string;
    };
  }[];
  comunicados_cargos: {
    cargo_id: string;
    cargos: {
      nombre: string;
    };
  }[];
}

export default function ComunicadosPage() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [comunicadosFiltrados, setComunicadosFiltrados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [columnasPorFila, setColumnasPorFila] = useState("4");
  const [paginaActual, setPaginaActual] = useState(1);
  const comunicadosPorPagina = 8;

  // Mapeo de valores a clases Tailwind
  const gridColsMap: Record<string, string> = {
    "3": "lg:grid-cols-3",
    "4": "lg:grid-cols-4",
    "5": "lg:grid-cols-5",
    "6": "lg:grid-cols-6",
  };

  const fetchComunicados = async () => {
    const supabase = createSupabaseClient();

    // 1) Obtener el usuario actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Error obteniendo usuario:", userError);
      setLoading(false);
      return;
    }

    // 2) Obtener empresa_id, id y cargo_id del usuario en "usuario_nomina"
    interface PerfilUsuario {
      empresa_id: string;
      id: string;
      cargo_id: string;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("usuario_nomina")
      .select("empresa_id, id, cargo_id")
      .eq("auth_user_id", user.id)
      .single<PerfilUsuario>();

    if (perfilError || !perfil) {
      console.error("No se pudo determinar la empresa del usuario:", perfilError);
      setLoading(false);
      return;
    }
    const empresaId = perfil.empresa_id;
    const usuarioId = perfil.id;
    const cargoId = perfil.cargo_id;

    // 3) Obtener todos los comunicados publicados
    const { data, error } = await supabase
      .from("comunicados")
      .select(`
        id,
        titulo,
        imagen_url,
        fecha_publicacion,
        area_responsable,
        estado,
        comunicados_empresas!left(empresa_id, empresas!inner(nombre)),
        comunicados_usuarios!left(usuario_id, usuario_nomina!inner(colaborador)),
        comunicados_cargos!left(cargo_id, cargos!inner(nombre))
      `)
      .eq("estado", "publicado")
      .order("fecha_publicacion", { ascending: false });

    // 4) Obtener los comunicados leídos por el usuario (usando auth_user_id)
    const { data: leidosData } = await supabase
      .from("comunicados_leidos")
      .select("comunicado_id")
      .eq("usuario_id", user.id);

    if (error) {
      console.error("Error cargando comunicados:", error);
      setComunicados([]);
    } else {
      const comunicadosLeidos = new Set(
        leidosData?.map((item) => item.comunicado_id) || []
      );

      const lista = data.map((comunicado) => {
        return {
          id: comunicado.id as string,
          titulo: comunicado.titulo as string,
          imagen_url: comunicado.imagen_url as string | null,
          fecha_publicacion: comunicado.fecha_publicacion as string | null,
          area_responsable: comunicado.area_responsable as string,
          estado: comunicado.estado as string,
          leido: comunicadosLeidos.has(comunicado.id as string),
          comunicados_empresas: (comunicado.comunicados_empresas as unknown) as {
            empresa_id: string;
            empresas: {
              nombre: string;
            };
          }[],
          comunicados_usuarios: (comunicado.comunicados_usuarios as unknown) as {
            usuario_id: string;
            usuario_nomina: {
              colaborador: string;
            };
          }[],
          comunicados_cargos: (comunicado.comunicados_cargos as unknown) as {
            cargo_id: string;
            cargos: {
              nombre: string;
            };
          }[]
        };
      });

      // Filtrado por cargo y usuarios específicos
      const filtrados = lista.filter((comunicado) => {
        // 1. Verificar si está dirigido al cargo del usuario o no tiene cargo específico
        const tieneCargosEspec = comunicado.comunicados_cargos?.length! > 0;
        const dirigidoAlCargo = tieneCargosEspec 
          ? comunicado.comunicados_cargos?.some((item) => item.cargo_id === cargoId)
          : true; // Si no tiene cargos específicos, se muestra a todos
        
        if (!dirigidoAlCargo) return false;

        // 2. Si tiene usuarios específicos, verificar que incluya al usuario actual
        const tieneUsuariosEspec = comunicado.comunicados_usuarios?.length! > 0;
        if (tieneUsuariosEspec) {
          return comunicado.comunicados_usuarios?.some(
            (item) => item.usuario_id === usuarioId
          );
        }

        // 3. Si no tiene usuarios específicos, mostrar el comunicado
        return true;
      });

      setComunicados(filtrados);
      setComunicadosFiltrados(filtrados);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchComunicados();
  }, []);

  // Refrescar datos cuando se regrese a la página
  useEffect(() => {
    const handleFocus = () => {
      fetchComunicados();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 bg-gray-200/60 rounded animate-pulse w-48"></div>
              <div className="h-4 bg-gray-200/40 rounded animate-pulse w-96"></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-4 bg-gray-200/40 rounded animate-pulse w-16"></div>
              <div className="h-4 bg-gray-200/40 rounded animate-pulse w-16"></div>
              <div className="h-4 bg-gray-200/40 rounded animate-pulse w-16"></div>
            </div>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-sm rounded-lg border shadow-sm">
          <div className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <div className="h-4 bg-gray-200/60 rounded animate-pulse w-16 mb-2"></div>
                <div className="h-10 bg-gray-200/40 rounded animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200/40 rounded animate-pulse w-32"></div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden shadow-sm">
              <div className="aspect-[4/3] bg-gray-200/60 animate-pulse"></div>
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200/60 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200/40 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-gray-200/40 rounded animate-pulse w-1/2"></div>
                <div className="h-8 bg-gray-200/40 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
              {/* Cabecera con estilo de usuarios */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                <div className="w-full md:w-auto">
                  <h1 className="text-2xl font-bold tracking-tight">Comunicados</h1>
                  <p className="text-muted-foreground">Comunicados dirigidos a tu cargo y actualizaciones de la empresa.</p>
                </div>
                <div className="flex flex-row justify-between md:justify-end w-full md:w-auto items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex gap-4">
                    <div className="grid grid-cols-3 gap-6 w-full">
                      <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                        <div className="flex items-center gap-2 justify-center">
                          <Eye className="w-4 h-4 text-green-600" />
                          <span className="text-green-700 text-lg font-medium">
                            {comunicados.filter(c => c.leido).length}
                          </span>
                        </div>
                        <div className="text-sm text-green-600 text-center mt-1">
                          leídos
                        </div>
                      </div>
                      
                      <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                        <div className="flex items-center gap-2 justify-center">
                          <EyeOff className="w-4 h-4 text-red-600" />
                          <span className="text-red-700 text-lg font-medium">
                            {comunicados.filter(c => !c.leido).length}
                          </span>
                        </div>
                        <div className="text-sm text-red-600 text-center mt-1">
                          pendientes
                        </div>
                      </div>

                      <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border shadow-sm">
                        <div className="flex items-center gap-2 justify-center">
                          <Building className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-700 text-lg font-medium">
                            {comunicados.length}
                          </span>
                        </div>
                        <div className="text-sm text-blue-600 text-center mt-1">
                          total
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filtros */}
              <Card className="bg-white/80 backdrop-blur-sm shadow-sm w-full">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row gap-4 items-end w-full">
                    <div className="w-full md:flex-1">
                      <label className="text-sm font-medium mb-1 block">Buscar</label>
                      <div className="relative w-full">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar comunicados..."
                          value={searchTerm}
                          onChange={(e) => {
                            const termino = e.target.value.toLowerCase();
                            setSearchTerm(e.target.value);
                            const filt = comunicados.filter(
                              (c) =>
                                c.titulo.toLowerCase().includes(termino) ||
                                c.area_responsable.toLowerCase().includes(termino)
                            );
                            setComunicadosFiltrados(filt);
                            setPaginaActual(1);
                          }}
                          className="pl-8 w-full"
                        />
                      </div>
                    </div>
                    
                    <Select
                      value={columnasPorFila}
                      onValueChange={(value) => setColumnasPorFila(value)}
                    >
                      <SelectTrigger className="w-full md:w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 columnas</SelectItem>
                        <SelectItem value="4">4 columnas</SelectItem>
                        <SelectItem value="5">5 columnas</SelectItem>
                        <SelectItem value="6">6 columnas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
              
              {/* Resultados de búsqueda */}
              {searchTerm && (
                <div className="text-sm text-gray-500 mb-4">
                  {comunicadosFiltrados.length === 0 
                    ? "No se encontraron comunicados" 
                    : `${comunicadosFiltrados.length} resultado${comunicadosFiltrados.length !== 1 ? 's' : ''}`
                  }
                </div>
              )}

              {/* Grid de comunicados */}
              <div
                className={
                  `grid grid-cols-1 md:grid-cols-2 ` +
                  `${gridColsMap[columnasPorFila] || "lg:grid-cols-4"} gap-6`
                }
              >
                {comunicadosFiltrados.length > 0 ? (
                  comunicadosFiltrados
                    .slice(
                      (paginaActual - 1) * comunicadosPorPagina,
                      paginaActual * comunicadosPorPagina
                    )
                    .map((c) => (
                      <div key={c.id} className="bg-white/90 backdrop-blur-sm border border-gray-200/50 rounded-lg overflow-hidden hover:border-gray-300/70 transition-colors shadow-sm">
                        {/* Imagen con relación de aspecto 4:3 */}
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <ComunicadoAvatar
                            titulo={c.titulo}
                            imagenUrl={c.imagen_url}
                            className="w-full h-full"
                          />
                          {/* Badge de estado de lectura */}
                           <div className="absolute top-3 right-3">
                             <Badge 
                               variant={c.leido ? "secondary" : "destructive"}
                               className={`flex items-center gap-1 text-xs font-medium ${
                                 c.leido 
                                   ? "bg-green-100 text-green-800 border-green-200" 
                                   : "bg-red-100 text-red-800 border-red-200"
                               }`}
                             >
                               {c.leido ? (
                                 <>
                                   <Eye className="w-3 h-3" />
                                   Leído
                                 </>
                               ) : (
                                 <>
                                   <EyeOff className="w-3 h-3" />
                                   No leído
                                 </>
                               )}
                             </Badge>
                           </div>
                        </div>
                        
                        {/* Contenido de la tarjeta */}
                        <div className="p-4">
                          <h2 className="text-base font-medium mb-2 text-gray-900 line-clamp-2">
                            {c.titulo}
                          </h2>
                          
                          <div className="space-y-1 mb-3 text-sm text-gray-600">
                            <div>{c.area_responsable}</div>
                            <div>
                              {c.fecha_publicacion
                                ? new Date(c.fecha_publicacion + 'T00:00:00').toLocaleDateString('es-ES')
                                : "-"}
                            </div>
                          </div>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full"
                            onClick={() => window.location.href = `/perfil/comunicados/${c.id}`}
                          >
                            Ver comunicado
                          </Button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 col-span-full">
                    No hay comunicados dirigidos a tu cargo o dirigidos específicamente a ti.
                  </p>
                )}

                {/* Paginación */}
                {comunicadosFiltrados.length > comunicadosPorPagina && (
                  <div className="col-span-full flex justify-center gap-2 mt-6">
                    {Array.from({
                      length: Math.ceil(comunicadosFiltrados.length / comunicadosPorPagina),
                    }).map((_, index) => (
                      <Button
                        key={index}
                        variant={paginaActual === index + 1 ? "default" : "outline"}
                        onClick={() => setPaginaActual(index + 1)}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
    </div>
  );
}
