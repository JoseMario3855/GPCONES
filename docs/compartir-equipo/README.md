# Paquete de información para el equipo (GPCONES)

Esta carpeta reúne **cómo arrancar el proyecto** y **dónde está el resto de la documentación**. Puedes compartir el repositorio completo o solo esta ruta (`docs/compartir-equipo/`) como punto de entrada.

## Contenido de esta carpeta

| Archivo | Descripción |
|--------|-------------|
| [README.md](./README.md) | Este documento: requisitos, instalación y ejecución |
| [INDICE_DOCUMENTACION.md](./INDICE_DOCUMENTACION.md) | Listado de todos los README y guías del proyecto con enlaces |

## Requisitos previos

- **Node.js** 16 o superior (recomendado LTS actual)
- **npm** (incluido con Node)
- **PostgreSQL** con la base de datos del proyecto (p. ej. `GP_CONES`) y, para funciones espaciales, **PostGIS** según lo que use el esquema
- Herramientas opcionales según módulos: ver [README_INSTALACION_ILI2PG.md](../../README_INSTALACION_ILI2PG.md) si trabajan con ILI2PG / XTF

## Configuración inicial (cada desarrollador)

1. **Clonar** el repositorio y entrar a la carpeta raíz del proyecto (`GPCONES`).

2. **Instalar dependencias del backend** (desde la raíz del proyecto, donde está el `package.json` principal):
   ```bash
   npm install
   ```

3. **Instalar dependencias del frontend**:
   ```bash
   cd FRONT
   npm install
   cd ..
   ```

4. **Variables de entorno**: en la **raíz del proyecto** (misma carpeta que el `package.json` del backend), copiar la plantilla y editar valores locales:
   ```powershell
   Copy-Item .env.example .env
   ```
   Ajustar al menos: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, y un `JWT_SECRET` propio para desarrollo.  
   El archivo **`.env` no se sube a Git**; solo se comparte la plantilla `.env.example`.

5. **Base de datos**: crear/restaurar la base según los scripts SQL o documentación en `database/`. Si el equipo usa un dump o un servidor compartido, acordar credenciales por un canal seguro, nunca en el repositorio.

## Ejecutar en desarrollo

Abrir **dos terminales** desde la raíz del proyecto (`GPCONES`).

**Terminal 1 — API (Express)**  
Puerto por defecto: **3002** (definible con `PORT` en `.env`).

```powershell
npm start
```

Comprobar: `http://localhost:3002/health`

**Terminal 2 — Frontend (React)**  
El `package.json` del frontend define **proxy** hacia `http://localhost:3002`.

```powershell
cd FRONT
npm start
```

La app suele abrirse en **http://localhost:3000**.

### PowerShell

Si tu versión no acepta `&&`, usa `;` o dos líneas:

```powershell
Set-Location ruta\al\GPCONES\GPCONES
npm start
```

## Estructura resumida del repositorio

```
GPCONES/                 # Raíz del backend + scripts
├── .env.example         # Plantilla de variables (sí se versiona)
├── .env                 # Local; no subir (ignorado por Git)
├── server/              # API Express, rutas, controladores
├── database/            # SQL y scripts de datos / migraciones
├── FRONT/               # Aplicación React
├── tests/               # Pruebas
└── docs/
    └── compartir-equipo/  # Esta carpeta
```

## Más documentación

Consulta **[INDICE_DOCUMENTACION.md](./INDICE_DOCUMENTACION.md)** para enlaces a guías de XTF, predios, roles, recuperación de contraseña, municipios, usuarios, etc.

## Archivos de datos pesados

Los **`.xtf`** y el contenido de **`server/uploads/`** no se versionan (límite de tamaño en GitHub y datos locales). Los archivos de muestra se comparten por otro medio (Drive, almacenamiento interno) si el equipo los necesita.

## Seguridad al compartir

- No enviar **`.env`**, contraseñas ni claves JWT por chat o correo sin cifrado.
- Rotar credenciales si alguna vez se subió un `.env` al historial de Git.
- Para nuevos miembros: compartir solo el repo + esta guía; cada uno genera su `.env` desde `.env.example`.
