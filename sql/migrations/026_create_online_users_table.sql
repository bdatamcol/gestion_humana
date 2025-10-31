-- Crear tabla para usuarios en línea
CREATE TABLE IF NOT EXISTS online_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice único para user_id para evitar duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_online_users_user_id ON online_users(user_id);

-- Crear índice para last_seen_at para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_online_users_last_seen ON online_users(last_seen_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios puedan ver todos los usuarios en línea
CREATE POLICY "Users can view all online users" ON online_users
  FOR SELECT USING (true);

-- Política para que los usuarios solo puedan actualizar su propio registro
CREATE POLICY "Users can update their own online status" ON online_users
  FOR ALL USING (auth.uid() = user_id);

-- Función para limpiar usuarios inactivos (más de 2 minutos sin heartbeat)
CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  DELETE FROM online_users 
  WHERE last_seen_at < NOW() - INTERVAL '2 minutes';
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_online_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_online_users_updated_at_trigger
  BEFORE UPDATE ON online_users
  FOR EACH ROW
  EXECUTE FUNCTION update_online_users_updated_at();
