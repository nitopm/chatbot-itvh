-- ==============================================================================
-- SCRIPT SQL: TABLA DE EVENTOS Y CONVOCATORIAS DEL ITVH
-- Copia y pega TODO este bloque en: Supabase > SQL Editor > Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.eventos_itvh (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'conferencia', -- 'conferencia', 'taller', 'curso', 'convocatoria', 'deporte', 'otro'
  carrera_destino TEXT DEFAULT 'General', -- 'Sistemas', 'Gestión', 'Industrial', 'General', etc.
  fecha_evento TIMESTAMPTZ NOT NULL,
  hora_evento TEXT,
  lugar TEXT,
  ponente TEXT,
  enlace_registro TEXT,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.eventos_itvh ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas previas si ya existían
DROP POLICY IF EXISTS "Permitir insercion de eventos" ON public.eventos_itvh;
DROP POLICY IF EXISTS "Permitir lectura de eventos" ON public.eventos_itvh;
DROP POLICY IF EXISTS "Permitir actualizacion de eventos" ON public.eventos_itvh;
DROP POLICY IF EXISTS "Permitir borrado de eventos" ON public.eventos_itvh;

-- Políticas de acceso para la aplicación
CREATE POLICY "Permitir insercion de eventos" ON public.eventos_itvh FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de eventos" ON public.eventos_itvh FOR SELECT USING (true);
CREATE POLICY "Permitir actualizacion de eventos" ON public.eventos_itvh FOR UPDATE USING (true);
CREATE POLICY "Permitir borrado de eventos" ON public.eventos_itvh FOR DELETE USING (true);

-- Crear un índice para ordenar rápidamente por fecha
CREATE INDEX IF NOT EXISTS idx_eventos_fecha ON public.eventos_itvh (fecha_evento DESC);
