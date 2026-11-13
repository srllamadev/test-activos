# 🚀 Configuración del Backend

## Paso 1: Obtener credenciales de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/omncxwhkugojdubyumzm

2. Navega a: **Settings** → **Database**

3. En la sección **Connection string**, selecciona **URI**

4. Copia la cadena de conexión (algo como):
   ```
   postgresql://postgres:[PASSWORD]@db.omncxwhkugojdubyumzm.supabase.co:5432/postgres
   ```

5. Reemplaza `[PASSWORD]` con tu contraseña de la base de datos

6. Pega la cadena completa en el archivo `backend/.env` en la variable `DATABASE_URL`

## Paso 2: Configurar SECRET_KEY

Genera un SECRET_KEY seguro:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copia el resultado y pégalo en `backend/.env` en la variable `SECRET_KEY`

## Paso 3: Instalar dependencias

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Paso 4: Ejecutar el servidor

```bash
uvicorn app.main:app --reload --port 8000
```

## Paso 5: Verificar

Abre tu navegador en: http://localhost:8000/docs

Deberías ver la documentación interactiva de la API (Swagger UI)

## 📋 Checklist

- [ ] Obtener DATABASE_URL de Supabase
- [ ] Generar SECRET_KEY seguro
- [ ] Instalar dependencias Python
- [ ] Activar entorno virtual
- [ ] Iniciar servidor FastAPI
- [ ] Verificar Swagger UI en /docs
