-- Script SQL corregido y compatible para Supabase PostgreSQL
-- Copia y pega TODO este bloque en Supabase > SQL Editor > Run

-- 1. Tabla para métricas y registro de consultas realizadas a Balum
CREATE TABLE IF NOT EXISTS public.registro_consultas (
  id TEXT PRIMARY KEY,
  pregunta TEXT NOT NULL,
  respuesta TEXT,
  tokens_estimados INTEGER DEFAULT 0,
  feedback VARCHAR(10),
  fuentes_usadas TEXT,
  tiene_ticket BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.registro_consultas ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas por si se vuelven a correr
DROP POLICY IF EXISTS "Permitir insercion de consultas" ON public.registro_consultas;
DROP POLICY IF EXISTS "Permitir lectura de consultas" ON public.registro_consultas;
DROP POLICY IF EXISTS "Permitir actualizacion de feedback" ON public.registro_consultas;

-- Crear políticas para permitir registro y lectura
CREATE POLICY "Permitir insercion de consultas" ON public.registro_consultas FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de consultas" ON public.registro_consultas FOR SELECT USING (true);
CREATE POLICY "Permitir actualizacion de feedback" ON public.registro_consultas FOR UPDATE USING (true);


-- 2. Tabla para tickets de soporte de alumnos
CREATE TABLE IF NOT EXISTS public.tickets_soporte (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  correo_institucional TEXT NOT NULL,
  num_control TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  pregunta_origen TEXT,
  estado VARCHAR(20) DEFAULT 'pendiente',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si existen
DROP POLICY IF EXISTS "Permitir insercion de tickets" ON public.tickets_soporte;
DROP POLICY IF EXISTS "Permitir lectura de tickets" ON public.tickets_soporte;
DROP POLICY IF EXISTS "Permitir actualizacion de tickets" ON public.tickets_soporte;

-- Crear políticas para tickets
CREATE POLICY "Permitir insercion de tickets" ON public.tickets_soporte FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de tickets" ON public.tickets_soporte FOR SELECT USING (true);
CREATE POLICY "Permitir actualizacion de tickets" ON public.tickets_soporte FOR UPDATE USING (true);
