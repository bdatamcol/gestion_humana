'use server'

import { createAdminSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export interface UserImportResult {
  processed: number
  created: number
  updated: number
  skipped: number
  errors: Array<{ row: number; error: string; data: any }>
}

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalize = (str: string) => {
  if (!str) return ''
  return str.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

async function getRelationMaps(supabase: any) {
  const [
    { data: empresas },
    { data: sedes },
    { data: cargos },
    { data: eps },
    { data: afp },
    { data: cesantias },
    { data: cajas }
  ] = await Promise.all([
    supabase.from('empresas').select('id, nombre'),
    supabase.from('sedes').select('id, nombre'),
    supabase.from('cargos').select('id, nombre'),
    supabase.from('eps').select('id, nombre'),
    supabase.from('afp').select('id, nombre'),
    supabase.from('cesantias').select('id, nombre'),
    supabase.from('caja_de_compensacion').select('id, nombre')
  ])

  // Create maps: Normalized Name -> ID
  const createMap = (arr: any[]) => {
    const map = new Map<string, any>()
    arr?.forEach(item => {
      map.set(normalize(item.nombre), item.id)
    })
    return map
  }

  return {
    empresas: createMap(empresas),
    sedes: createMap(sedes),
    cargos: createMap(cargos),
    eps: createMap(eps),
    afp: createMap(afp),
    cesantias: createMap(cesantias),
    cajas: createMap(cajas)
  }
}

export async function getUsersForExport() {
  const supabase = createAdminSupabaseClient()
  
  const { data: users, error } = await supabase
    .from('usuario_nomina')
    .select(`
      *,
      empresas:empresa_id(nombre),
      sedes:sede_id(nombre),
      cargos:cargo_id(nombre),
      eps:eps_id(nombre),
      afp:afp_id(nombre),
      cesantias:cesantias_id(nombre),
      caja_de_compensacion:caja_de_compensacion_id(nombre)
    `)
    .order('colaborador', { ascending: true })

  if (error) throw new Error(error.message)

  // Flatten and format for Excel
  return users.map(user => ({
    ID: user.id,
    Nombre: user.colaborador,
    Correo: user.correo_electronico,
    Telefono: user.telefono,
    Cedula: user.cedula,
    Genero: user.genero,
    'Fecha Ingreso': user.fecha_ingreso,
    'Fecha Nacimiento': user.fecha_nacimiento,
    Edad: user.edad,
    RH: user.rh,
    'Tipo Contrato': user.tipo_de_contrato,
    Direccion: user.direccion_residencia,
    Estado: user.estado,
    'Motivo Retiro': user.motivo_retiro,
    'Fecha Retiro': user.fecha_retiro,
    Empresa: user.empresas?.nombre || '',
    Sede: user.sedes?.nombre || '',
    Cargo: user.cargos?.nombre || '',
    EPS: user.eps?.nombre || '',
    AFP: user.afp?.nombre || '',
    Cesantias: user.cesantias?.nombre || '',
    'Caja Compensacion': user.caja_de_compensacion?.nombre || ''
  }))
}

export async function processUserImportBatch(
  rows: any[], 
  startIndex: number = 0
): Promise<UserImportResult> {
  const supabase = createAdminSupabaseClient()
  const maps = await getRelationMaps(supabase)
  
  const result: UserImportResult = {
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // 1. Bulk Fetch Existing Users by ID (Strict Validation Source)
  const ids = rows
    .map(r => r.ID ? parseInt(String(r.ID)) : null)
    .filter(id => id !== null && !isNaN(id))

  let existingUsersMap = new Map<number, any>()

  if (ids.length > 0) {
    const { data } = await supabase
      .from('usuario_nomina')
      .select('*')
      .in('id', ids)
    
    data?.forEach((user: any) => {
      existingUsersMap.set(user.id, user)
    })
  }

  // Helper for deep comparison
  const areValuesDifferent = (newVal: any, oldVal: any): boolean => {
    // Normalize empty/null/undefined
    const v1 = (newVal === undefined || newVal === null || newVal === '') ? null : newVal
    const v2 = (oldVal === undefined || oldVal === null || oldVal === '') ? null : oldVal

    if (v1 === v2) return false
    if (v1 === null || v2 === null) return true

    // Compare as strings to handle number/string type mismatch
    // Normalize strings (trim, lowercase) for robust comparison
    const s1 = String(v1).trim().toLowerCase()
    const s2 = String(v2).trim().toLowerCase()

    return s1 !== s2
  }

  // Helper to normalize input strings
  const normalizeInput = (val: any) => {
     if (val === undefined || val === null) return null
     const str = String(val).trim()
     return str === '' ? null : str
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const currentRowIndex = startIndex + i + 1
    
    try {
      // STRICT RULE: ID Required
      if (row.ID === undefined || row.ID === null || String(row.ID).trim() === '') {
         throw new Error('Fila rechazada: ID es obligatorio. No se permite crear sin ID.')
      }

      const rowId = parseInt(String(row.ID))
      if (isNaN(rowId)) {
          throw new Error(`ID inválido: ${row.ID}`)
      }

      if (!row.Nombre) throw new Error('El nombre es obligatorio')

      // Map relations
      const empresaId = row.Empresa ? maps.empresas.get(normalize(row.Empresa)) : null
      const sedeId = row.Sede ? maps.sedes.get(normalize(row.Sede)) : null
      const cargoId = row.Cargo ? maps.cargos.get(normalize(row.Cargo)) : null
      const epsId = row.EPS ? maps.eps.get(normalize(row.EPS)) : null
      const afpId = row.AFP ? maps.afp.get(normalize(row.AFP)) : null
      const cesantiasId = row.Cesantias ? maps.cesantias.get(normalize(row.Cesantias)) : null
      const cajaId = row['Caja Compensacion'] ? maps.cajas.get(normalize(row['Caja Compensacion'])) : null

      const userData: any = {
        colaborador: normalizeInput(row.Nombre),
        correo_electronico: normalizeInput(row.Correo),
        telefono: normalizeInput(row.Telefono),
        cedula: normalizeInput(row.Cedula),
        genero: normalizeInput(row.Genero),
        fecha_ingreso: normalizeInput(row['Fecha Ingreso']), 
        fecha_nacimiento: normalizeInput(row['Fecha Nacimiento']),
        edad: row.Edad ? parseInt(row.Edad) : null,
        rh: normalizeInput(row.RH),
        tipo_de_contrato: normalizeInput(row['Tipo Contrato']),
        direccion_residencia: normalizeInput(row.Direccion),
        estado: (row.Estado && normalize(row.Estado) === 'inactivo') ? 'inactivo' : 'activo',
        motivo_retiro: normalizeInput(row['Motivo Retiro']),
        fecha_retiro: normalizeInput(row['Fecha Retiro']),
        empresa_id: empresaId,
        sede_id: sedeId,
        cargo_id: cargoId,
        eps_id: epsId,
        afp_id: afpId,
        cesantias_id: cesantiasId,
        caja_de_compensacion_id: cajaId
      }

      const existingUser = existingUsersMap.get(rowId)

      if (existingUser) {
        // UPDATE LOGIC
        let hasChanges = false
        const fieldsToCheck = [
          'colaborador', 'correo_electronico', 'telefono', 'genero', 'fecha_ingreso', 
          'fecha_nacimiento', 'edad', 'rh', 'tipo_de_contrato', 'direccion_residencia',
          'estado', 'motivo_retiro', 'fecha_retiro', 'empresa_id', 'sede_id', 
          'cargo_id', 'eps_id', 'afp_id', 'cesantias_id', 'caja_de_compensacion_id'
        ]

        for (const field of fieldsToCheck) {
            if (areValuesDifferent(userData[field], existingUser[field])) {
               hasChanges = true
               break
            }
        }

        if (hasChanges) {
          const { error: updateError } = await supabase
            .from('usuario_nomina')
            .update(userData)
            .eq('id', rowId)

          if (updateError) throw updateError
          result.updated++
        } else {
          result.skipped++
        }

      } else {
        // CREATE LOGIC (Sync/Restore with explicit ID)
        // We inject the ID to ensure synchronization
        const insertData = { ...userData, id: rowId }
        
        const { error: insertError } = await supabase
          .from('usuario_nomina')
          .insert([insertData])

        if (insertError) throw insertError
        result.created++
      }

    } catch (err: any) {
      result.errors.push({
        row: currentRowIndex,
        error: err.message,
        data: row
      })
    } finally {
        result.processed++
    }
  }

  revalidatePath('/administracion/usuarios')
  return result
}
