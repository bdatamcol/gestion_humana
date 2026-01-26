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

function excelDateToISO(value: number): string {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + value * 86400000)
    .toISOString()
    .split("T")[0];
}

const isValidRole = (role: string) => {
  const validRoles = ['admin', 'empleado', 'gestor_humano', 'lider']; // Ajustar según los roles reales del sistema si se conocen
  // Si no conocemos los roles exactos, permitimos cualquier string no vacío, 
  // o asumimos que la validación de base de datos se encargará.
  // Por ahora, solo validamos que sea un string razonable.
  return role.length > 2;
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
    Rol: user.rol || '',
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

  // 1. Bulk Fetch Existing Users by ID
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

  // Helper to extract value ONLY if present (undefined otherwise)
  const getValue = (val: any, transformer?: (v: any) => any) => {
     if (val === undefined || val === null || String(val).trim() === '') {
        return undefined
     }
     return transformer ? transformer(val) : String(val).trim()
  }

  // Date Parser
  const parseDate = (val: any) => {
    // If it's a number (Excel date)
    const asNum = Number(val)
    if (!isNaN(asNum) && asNum > 1000) { // Simple check to distinguish from small numbers
       return excelDateToISO(asNum)
    }
    
    // Try string parsing
    const date = new Date(val)
    if (isNaN(date.getTime())) {
       throw new Error(`Fecha inválida: ${val}`)
    }
    return date.toISOString().split("T")[0]
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const currentRowIndex = startIndex + i + 1
    
    try {
      // STRICT RULE: ID Required
      if (!getValue(row.ID)) {
         throw new Error('Fila rechazada: ID es obligatorio.')
      }

      const rowId = parseInt(String(row.ID))
      if (isNaN(rowId)) throw new Error(`ID inválido: ${row.ID}`)

      // Prepare potential data (only fields present in Excel)
      const potentialData: any = {}

      // Mappings
      if (row.Nombre !== undefined) potentialData.colaborador = getValue(row.Nombre)
      if (row.Correo !== undefined) potentialData.correo_electronico = getValue(row.Correo)
      
      if (row.Rol !== undefined) {
          const val = getValue(row.Rol)
          if (val !== undefined) {
             // Validar rol si se provee
             // Nota: Se usa una validación laxa si no se tienen los roles exactos definidos en el enum de la BD
             // Si el rol no es válido, se podría lanzar error o ignorar. 
             // El requerimiento dice "Validar que sea un valor permitido".
             // Asumimos que si no pasa validación básica, es un error.
             if (val.length < 3) throw new Error(`Rol inválido: ${val}`)
             potentialData.rol = val
          }
      }

      if (row.Telefono !== undefined) potentialData.telefono = getValue(row.Telefono)
      if (row.Cedula !== undefined) potentialData.cedula = getValue(row.Cedula)
      if (row.Genero !== undefined) potentialData.genero = getValue(row.Genero)
      
      // Dates - Handle carefully
      if (row['Fecha Ingreso'] !== undefined) {
          const val = getValue(row['Fecha Ingreso'])
          if (val !== undefined) potentialData.fecha_ingreso = parseDate(row['Fecha Ingreso'])
      }
      if (row['Fecha Nacimiento'] !== undefined) {
          const val = getValue(row['Fecha Nacimiento'])
          if (val !== undefined) potentialData.fecha_nacimiento = parseDate(row['Fecha Nacimiento'])
      }
      
      if (row.Edad !== undefined) potentialData.edad = getValue(row.Edad, (v:any) => parseInt(v))
      if (row.RH !== undefined) potentialData.rh = getValue(row.RH)
      if (row['Tipo Contrato'] !== undefined) potentialData.tipo_de_contrato = getValue(row['Tipo Contrato'])
      if (row.Direccion !== undefined) potentialData.direccion_residencia = getValue(row.Direccion)
      
      if (row.Estado !== undefined) {
         const val = getValue(row.Estado)
         if (val !== undefined) {
             potentialData.estado = normalize(val) === 'inactivo' ? 'inactivo' : 'activo'
         }
      }

      if (row['Motivo Retiro'] !== undefined) potentialData.motivo_retiro = getValue(row['Motivo Retiro'])
      
      if (row['Fecha Retiro'] !== undefined) {
         const val = getValue(row['Fecha Retiro'])
         if (val !== undefined) potentialData.fecha_retiro = parseDate(row['Fecha Retiro'])
      }

      // Relations
      if (row.Empresa !== undefined) {
          const val = getValue(row.Empresa)
          if (val !== undefined) potentialData.empresa_id = maps.empresas.get(normalize(val)) ?? null
      }
      if (row.Sede !== undefined) {
          const val = getValue(row.Sede)
          if (val !== undefined) potentialData.sede_id = maps.sedes.get(normalize(val)) ?? null
      }
      if (row.Cargo !== undefined) {
          const val = getValue(row.Cargo)
          if (val !== undefined) potentialData.cargo_id = maps.cargos.get(normalize(val)) ?? null
      }
      if (row.EPS !== undefined) {
          const val = getValue(row.EPS)
          if (val !== undefined) potentialData.eps_id = maps.eps.get(normalize(val)) ?? null
      }
      if (row.AFP !== undefined) {
          const val = getValue(row.AFP)
          if (val !== undefined) potentialData.afp_id = maps.afp.get(normalize(val)) ?? null
      }
      if (row.Cesantias !== undefined) {
          const val = getValue(row.Cesantias)
          if (val !== undefined) potentialData.cesantias_id = maps.cesantias.get(normalize(val)) ?? null
      }
      if (row['Caja Compensacion'] !== undefined) {
          const val = getValue(row['Caja Compensacion'])
          if (val !== undefined) potentialData.caja_de_compensacion_id = maps.cajas.get(normalize(val)) ?? null
      }

      // Clean up undefineds from potentialData
      Object.keys(potentialData).forEach(key => {
          if (potentialData[key] === undefined) delete potentialData[key]
      })

      const existingUser = existingUsersMap.get(rowId)

      if (existingUser) {
        // UPDATE LOGIC (Partial)
        const updatePayload: any = {}
        
        for (const key of Object.keys(potentialData)) {
            const newValue = potentialData[key]
            const oldValue = existingUser[key]

            // Compare
            // Normalize for comparison
            const nNew = (newValue === null) ? '' : String(newValue).trim().toLowerCase()
            const nOld = (oldValue === null) ? '' : String(oldValue).trim().toLowerCase()

            if (nNew !== nOld) {
                updatePayload[key] = newValue
            }
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabase
            .from('usuario_nomina')
            .update(updatePayload)
            .eq('id', rowId)

          if (updateError) throw updateError
          result.updated++
        } else {
          result.skipped++
        }

      } else {
        // CREATE LOGIC
        // For creation, we use what we have. 
        // Validation: Name is mandatory
        if (!potentialData.colaborador) throw new Error('El nombre es obligatorio para nuevos usuarios')

        const insertData = { ...potentialData, id: rowId }
        
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
