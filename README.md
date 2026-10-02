# 🐯 Balum ITVH Web (v2.0)
### Asistente Inteligente Oficial y Panel de Administración del Instituto Tecnológico de Villahermosa

Balum Web es la versión de producción en la nube de Balum. Diseñado para estar **siempre activo 24/7**, atender a **cientos de alumnos en simultáneo**, permitir la administración en tiempo real de nuevos documentos institucionales y desplegarse en **Vercel** bajo el dominio oficial del ITVH.

---

## ⚡ Arquitectura Cloud (Serverless)

- **Frontend & Serverless API:** Next.js 15 (App Router) + React 19 + TailwindCSS.
- **Panel Administrador (`/admin`):**
  - 📂 **Alimentación automática de conocimiento:** Sube PDFs directamente desde el navegador; la IA extrae tablas, listas y texto, genera embeddings y los indexa al instante.
  - 📊 **Métricas de uso:** Total de consultas, actividad semanal, mensual y preguntas frecuentes.
  - 💵 **Calculadora de Costos IA:** Estimación precisa de consumo de tokens y gastos en USD y MXN.
  - 📨 **Buzón de Tickets:** Seguimiento a dudas de alumnos con número de control cuando Balum no tiene el dato oficial.
  - 👍 **Auditoría de Calidad:** Registro de satisfacción (likes y dislikes) y preguntas repetitivas para detectar qué información falta enriquecer.
- **Base de Datos Vectorial:** Supabase PostgreSQL con extensión `pgvector`.
- **Modelo de IA (Cerebro):** Google Gemini 2.0 Flash (`gemini-2.0-flash`) vía API oficial.
- **Modelo de Embeddings:** `gemini-embedding-2` / `text-embedding-004` (768 dimensiones).
- **Alojamiento:** Vercel (con soporte de dominio institucional y SSL automático).

---

## 🚀 Puesta en Marcha Rápida (Local)

### 1. Variables de Entorno
Copia el archivo de ejemplo a `.env.local`:
```bash
cp .env.example .env.local
```
Llena las claves con tu Gemini API Key y tus credenciales de Supabase.

### 2. Configurar Tablas en Supabase
En tu proyecto de Supabase, ve a **SQL Editor** y ejecuta el script que se encuentra en:
```
scripts/setup_admin_tables.sql
```

### 3. Instalar dependencias e Iniciar
```bash
npm install
npm run dev
```
- **Chat para Estudiantes:** [http://localhost:3000](http://localhost:3000)
- **Panel Administrador:** [http://localhost:3000/admin](http://localhost:3000/admin) *(Clave de acceso: `itvh2026`)*

---

## 📦 Cómo subir a GitHub y Desplegar en Vercel

### Paso 1: Subir a GitHub
En la terminal dentro de esta carpeta (`balum-web`):
```bash
git init
git add .
git commit -m "feat: Asistente Balum ITVH con Panel Administrador y RAG en Supabase"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### Paso 2: Despliegue en Vercel
1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"Add New..."** -> **"Project"**.
3. Selecciona tu repositorio recién subido.
4. En **Environment Variables**, añade:
   - `GEMINI_API_KEY`: Tu clave de Google Gemini
   - `NEXT_PUBLIC_SUPABASE_URL`: La URL de tu proyecto en Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: La clave pública anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: (Opcional) Clave de servicio para administración
5. Haz clic en **Deploy**. ¡Tu chatbot y panel administrativo estarán en línea de inmediato!
