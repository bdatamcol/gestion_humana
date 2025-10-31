"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createSupabaseClient } from "@/lib/supabase"
// AdminSidebar removido - ya está en el layout
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react"

export default function CategoriasComunicados() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para el modal de categoría
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentCategoria, setCurrentCategoria] = useState<{id?: string, nombre: string, descripcion: string}>({
    nombre: "",
    descripcion: ""
  })

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const supabase = createSupabaseClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push("/login")
        return
      }

      // Verificar si el usuario es administrador
      const { data: userData, error: userError } = await supabase
        .from("usuario_nomina")
        .select("rol")
        .eq("auth_user_id", session.user.id)
        .single()

      if (userError || userData?.rol !== "administrador") {
        router.push("/perfil")
        return
      }

      // Cargar categorías
      await loadCategorias()
    }

    checkAuth()
  }, [])

  // Cargar categorías desde la base de datos
  const loadCategorias = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from("categorias_comunicados")
        .select("*")
        .order("nombre", { ascending: true })
      
      if (error) throw error
      
      setCategorias(data || [])
    } catch (error: any) {
      console.error("Error al cargar categorías:", error)
      setError("Error al cargar las categorías: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal para crear nueva categoría
  const handleNewCategoria = () => {
    setCurrentCategoria({ nombre: "", descripcion: "" })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  // Abrir modal para editar categoría
  const handleEditCategoria = (categoria: any) => {
    setCurrentCategoria({
      id: categoria.id,
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || ""
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentCategoria(prev => ({ ...prev, [name]: value }))
  }

  // Guardar categoría (crear o actualizar)
  const handleSaveCategoria = async () => {
    try {
      if (!currentCategoria.nombre.trim()) {
        setError("El nombre de la categoría es obligatorio")
        return
      }
      
      const supabase = createSupabaseClient()
      
      if (isEditing && currentCategoria.id) {
        // Actualizar categoría existente
        const { error } = await supabase
          .from("categorias_comunicados")
          .update({
            nombre: currentCategoria.nombre,
            descripcion: currentCategoria.descripcion,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentCategoria.id)
        
        if (error) throw error
        
        setSuccess("Categoría actualizada correctamente")
      } else {
        // Crear nueva categoría
        const { error } = await supabase
          .from("categorias_comunicados")
          .insert({
            nombre: currentCategoria.nombre,
            descripcion: currentCategoria.descripcion
          })
        
        if (error) throw error
        
        setSuccess("Categoría creada correctamente")
      }
      
      // Cerrar modal y recargar categorías
      setIsDialogOpen(false)
      await loadCategorias()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (error: any) {
      console.error("Error al guardar categoría:", error)
      setError("Error al guardar: " + error.message)
    }
  }

  // Eliminar categoría
  const handleDeleteCategoria = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta categoría? Esta acción no se puede deshacer.")) {
      return
    }
    
    try {
      const supabase = createSupabaseClient()
      
      // Verificar si hay comunicados usando esta categoría
      const { data: comunicados, error: checkError } = await supabase
        .from("comunicados")
        .select("id")
        .eq("categoria_id", id)
        .limit(1)
      
      if (checkError) throw checkError
      
      if (comunicados && comunicados.length > 0) {
        setError("No se puede eliminar esta categoría porque está siendo utilizada por comunicados existentes")
        return
      }
      
      // Eliminar categoría
      const { error } = await supabase
        .from("categorias_comunicados")
        .delete()
        .eq("id", id)
      
      if (error) throw error
      
      setSuccess("Categoría eliminada correctamente")
      await loadCategorias()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (error: any) {
      console.error("Error al eliminar categoría:", error)
      setError("Error al eliminar: " + error.message)
    }
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Categorías de Comunicados</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/administracion/comunicados')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a comunicados
                </Button>
                <Button 
                  onClick={handleNewCategoria} 
                  className="btn-custom"
                >
                  <Plus className="h-4 w-4" /> Añadir categoría
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {error && (
              <Alert className="bg-red-50 text-red-800 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {success && (
              <Alert className="bg-green-50 text-green-800 border-green-200">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
            
            <div className="overflow-x-auto overflow-y-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right w-[120px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Skeleton loader para categorías
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-4 w-[150px]" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-[200px]" />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded" />
                            <Skeleton className="h-8 w-8 rounded" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : categorias.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        No hay categorías definidas. Cree una nueva categoría para comenzar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categorias.map((categoria) => (
                      <TableRow key={categoria.id}>
                        <TableCell className="font-medium">{categoria.nombre}</TableCell>
                        <TableCell>{categoria.descripcion || "--"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCategoria(categoria)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCategoria(categoria.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        
        {/* Modal para crear/editar categoría */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar" : "Nueva"} Categoría</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la categoría</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={currentCategoria.nombre}
                  onChange={handleChange}
                  placeholder="Ingrese el nombre de la categoría"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  value={currentCategoria.descripcion}
                  onChange={handleChange}
                  placeholder="Ingrese una descripción para la categoría"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button className="btn-custom" onClick={handleSaveCategoria}>{isEditing ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
