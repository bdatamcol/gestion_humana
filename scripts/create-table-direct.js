const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno faltantes')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTable() {
  try {
    console.log('🚀 Creando tabla aplicaciones_trabajo...')

    // Verificar si la tabla ya existe
    const { data: existingTable, error: checkError } = await supabase
      .from('aplicaciones_trabajo')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('✅ La tabla aplicaciones_trabajo ya existe')
      return
    }

    console.log('📝 La tabla no existe, procediendo a crearla...')
    
    // Como no podemos usar exec_sql, vamos a crear la tabla usando una migración manual
    console.log('⚠️ Necesitas ejecutar manualmente el siguiente SQL en el Dashboard de Supabase:')
    console.log('')
    console.log('-- EJECUTAR EN SUPABASE DASHBOARD --')
    console.log(`
-- Crear la tabla aplicaciones_trabajo
CREATE TABLE IF NOT EXISTS aplicaciones_trabajo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombres VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  documento_identidad VARCHAR(20) NOT NULL,
  tipo_documento VARCHAR(10) NOT NULL DEFAULT 'CC',
  fecha_nacimiento DATE NOT NULL,
  direccion TEXT NOT NULL,
  ciudad VARCHAR(100) NOT NULL,
  cargo_interes VARCHAR(100) NOT NULL,
  experiencia_laboral TEXT,
  nivel_educacion VARCHAR(50) NOT NULL,
  hoja_vida_url TEXT,
  estado VARCHAR(20) DEFAULT 'nueva',
  observaciones TEXT,
  fecha_aplicacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revisada_por UUID REFERENCES usuario_nomina(auth_user_id) ON DELETE SET NULL,
  fecha_revision TIMESTAMP WITH TIME ZONE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_email ON aplicaciones_trabajo(email);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_documento ON aplicaciones_trabajo(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_estado ON aplicaciones_trabajo(estado);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_fecha_aplicacion ON aplicaciones_trabajo(fecha_aplicacion);
CREATE INDEX IF NOT EXISTS idx_aplicaciones_trabajo_cargo_interes ON aplicaciones_trabajo(cargo_interes);

-- Función para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION update_aplicaciones_trabajo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.fecha_actualizacion = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion
CREATE TRIGGER trigger_update_aplicaciones_trabajo_updated_at
  BEFORE UPDATE ON aplicaciones_trabajo
  FOR EACH ROW
  EXECUTE FUNCTION update_aplicaciones_trabajo_updated_at();

-- Habilitar RLS
ALTER TABLE aplicaciones_trabajo ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Los administradores pueden ver todas las aplicaciones de trabajo"
  ON aplicaciones_trabajo
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

CREATE POLICY "Los administradores pueden actualizar aplicaciones de trabajo"
  ON aplicaciones_trabajo
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );

CREATE POLICY "Permitir inserción pública de aplicaciones"
  ON aplicaciones_trabajo
  FOR INSERT
  WITH CHECK (true);
`)
    
    console.log('-- FIN DEL SQL --')
    console.log('')
    console.log('📋 Instrucciones:')
    console.log('1. Ve al Dashboard de Supabase: https://supabase.com/dashboard')
    console.log('2. Selecciona tu proyecto')
    console.log('3. Ve a SQL Editor')
    console.log('4. Copia y pega el SQL de arriba')
    console.log('5. Ejecuta el script')
    console.log('')
    console.log('Una vez ejecutado, el bucket de storage ya está creado y listo.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

createTable()