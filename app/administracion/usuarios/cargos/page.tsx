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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AlertCircle, ArrowLeft, Plus, Edit, Trash2 } from "lucide-react"

export default function Cargos() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cargos, setCargos] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Estado para el modal de cargo
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [currentCargo, setCurrentCargo] = useState<{id?: string, nombre: string, descripcion: string}>({
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

      // Cargar cargos
      await loadCargos()
    }

    checkAuth()
  }, [])

  // Cargar cargos desde la base de datos
  const loadCargos = async () => {
    try {
      setLoading(true)
      const supabase = createSupabaseClient()
      
      const { data, error } = await supabase
        .from("cargos")
        .select("*")
        .order("nombre", { ascending: true })
      
      if (error) throw error
      
      setCargos(data || [])
    } catch (error: any) {
      console.error("Error al cargar cargos:", error)
      setError("Error al cargar los cargos: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Abrir modal para crear nuevo cargo
  const handleNewCargo = () => {
    setCurrentCargo({ nombre: "", descripcion: "" })
    setIsEditing(false)
    setIsDialogOpen(true)
  }

  // Abrir modal para editar cargo
  const handleEditCargo = (cargo: any) => {
    setCurrentCargo({
      id: cargo.id,
      nombre: cargo.nombre,
      descripcion: cargo.descripcion || ""
    })
    setIsEditing(true)
    setIsDialogOpen(true)
  }

  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setCurrentCargo(prev => ({ ...prev, [name]: value }))
  }

  // Guardar cargo (crear o actualizar)
  const handleSaveCargo = async () => {
    try {
      if (!currentCargo.nombre.trim()) {
        setError("El nombre del cargo es obligatorio")
        return
      }
      
      const supabase = createSupabaseClient()
      
      if (isEditing && currentCargo.id) {
        // Actualizar cargo existente
        const { error } = await supabase
          .from("cargos")
          .update({
            nombre: currentCargo.nombre,
            descripcion: currentCargo.descripcion,
            updated_at: new Date().toISOString()
          })
          .eq("id", currentCargo.id)
        
        if (error) throw error
        
        setSuccess("Cargo actualizado correctamente")
      } else {
        // Crear nuevo cargo
        const { error } = await supabase
          .from("cargos")
          .insert({
            nombre: currentCargo.nombre,
            descripcion: currentCargo.descripcion
          })
        
        if (error) throw error
        
        setSuccess("Cargo creado correctamente")
      }
      
      // Cerrar modal y recargar cargos
      setIsDialogOpen(false)
      await loadCargos()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (error: any) {
      console.error("Error al guardar cargo:", error)
      setError("Error al guardar: " + error.message)
    }
  }

  // Eliminar cargo
  const handleDeleteCargo = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar este cargo? Esta acción no se puede deshacer.")) {
      return
    }
    
    try {
      const supabase = createSupabaseClient()
      
      // Verificar si hay usuarios usando este cargo
      const { data: usuarios, error: checkError } = await supabase
        .from("usuario_nomina")
        .select("id")
        .eq("cargo_id", id)
        .limit(1)
      
      if (checkError) throw checkError
      
      if (usuarios && usuarios.length > 0) {
        setError("No se puede eliminar este cargo porque está siendo utilizado por usuarios existentes")
        return
      }
      
      // Eliminar cargo
      const { error } = await supabase
        .from("cargos")
        .delete()
        .eq("id", id)
      
      if (error) throw error
      
      setSuccess("Cargo eliminado correctamente")
      await loadCargos()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000)
      
    } catch (error: any) {
      console.error("Error al eliminar cargo:", error)
      setError("Error al eliminar: " + error.message)
    }
  }

  return (
    <div className="py-6 flex min-h-screen">
      <div className="w-full mx-auto flex-1">
        <Card className="shadow-md">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-2xl font-bold">Cargos</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/administracion/usuarios')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Volver a usuarios
                </Button>
                <Button 
                  onClick={handleNewCargo} 
                  className="flex items-center gap-2 btn-custom"
                >
                  <Plus className="h-4 w-4" /> Añadir cargo
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
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cargos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay cargos definidos. Cree un nuevo cargo para comenzar.
              </div>
            ) : (
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
                    {cargos.map((cargo) => (
                      <TableRow key={cargo.id}>
                        <TableCell className="font-medium">{cargo.nombre}</TableCell>
                        <TableCell>{cargo.descripcion || "--"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCargo(cargo)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteCargo(cargo.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Modal para crear/editar cargo */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? "Editar" : "Nuevo"} Cargo</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del cargo</Label>
                <Input
                  id="nombre"
                  name="nombre"
                  value={currentCargo.nombre}
                  onChange={handleChange}
                  placeholder="Ingrese el nombre del cargo"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción (opcional)</Label>
                <Textarea
                  id="descripcion"
                  name="descripcion"
                  value={currentCargo.descripcion}
                  onChange={handleChange}
                  placeholder="Ingrese una descripción para el cargo"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveCargo} className="btn-custom">{isEditing ? "Actualizar" : "Crear"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
