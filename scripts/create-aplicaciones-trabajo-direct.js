const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function createAplicacionesTrabajoTableDirect() {
  try {
    console.log('🚀 Iniciando creación directa de tabla aplicaciones_trabajo...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no encontradas')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log('📋 Creando bucket para hojas de vida...')
    
    // Crear bucket para hojas de vida
    const { data: bucketData, error: bucketError } = await supabase.storage.createBucket('hojas-vida', {
      public: false,
      allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      fileSizeLimit: 10485760 // 10MB
    })
    
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('❌ Error al crear bucket:', bucketError)
    } else {
      console.log('✅ Bucket "hojas-vida" creado o ya existe')
    }
    
    console.log('\n⚠️  IMPORTANTE: Debes ejecutar manualmente el siguiente SQL en Supabase Dashboard:')
    console.log('\n📋 Ve a https://supabase.com/dashboard > Tu proyecto > SQL Editor')
    console.log('📋 Copia y pega el siguiente código SQL:\n')
    
    const sqlCode = `
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

-- Políticas de storage para hojas de vida
CREATE POLICY "Permitir subida pública de hojas de vida" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'hojas-vida' AND
    (storage.extension(name) = 'pdf' OR 
     storage.extension(name) = 'doc' OR 
     storage.extension(name) = 'docx')
  );

CREATE POLICY "Los administradores pueden ver todas las hojas de vida" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'hojas-vida' AND
    auth.uid() IN (
      SELECT auth_user_id FROM usuario_nomina WHERE rol = 'administrador'
    )
  );
`
    
    console.log(sqlCode)
    console.log('\n📋 Después de ejecutar el SQL, presiona Enter para continuar...')
    
    // Esperar confirmación del usuario
    await new Promise(resolve => {
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      rl.question('', () => {
        rl.close()
        resolve()
      })
    })
    
    console.log('\n✅ Verificando que la tabla fue creada...')
    
    // Verificar que la tabla existe
    const { data: tableData, error: checkError } = await supabase
      .from('aplicaciones_trabajo')
      .select('id')
      .limit(1)
    
    if (checkError) {
      console.log('❌ La tabla aún no existe. Asegúrate de haber ejecutado el SQL correctamente.')
      console.log('Error:', checkError.message)
    } else {
      console.log('✅ ¡Tabla aplicaciones_trabajo verificada correctamente!')
    }
    
    console.log('\n🎉 Configuración completada!')
    
  } catch (err) {
    console.error('💥 Error inesperado:', err)
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createAplicacionesTrabajoTableDirect()
}

module.exports = { createAplicacionesTrabajoTableDirect }