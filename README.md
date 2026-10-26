# 📸 InstaRed — Red Social Fotográfica Tipo Instagram
**Universidad Mariano Gálvez de Guatemala**  
**Facultad de Ingeniería en Sistemas de Información y Ciencias de la Computación**  
**Curso:** Desarrollo Web  
**Catedrático:** MSc. Ing. Carlos Alejandro Arias  
**Proyecto Final:** Red Social para Almacenar y Navegar en Fotografías Tipo Instagram con AWS Cloud Computing

---

## 🌟 Resumen de Cumplimiento de Requerimientos del Proyecto

| No. | Requerimiento del PDF | Estado | Implementación Técnica |
| :---: | :--- | :---: | :--- |
| **1** | **Página de Bienvenida y Autenticación** con Google Login API y Google reCAPTCHA | ✅ Implementado | Pantalla de bienvenida con Google Identity Services (`POST /api/usuarios/google`), formulario con reCAPTCHA v2/v3 y hashing con sal individual. |
| **2** | **Página de Inicio con Miniaturas (Instagram)** generadas con Sharp | ✅ Implementado | Conmutador de vista en Inicio (Feed vs Cuadrícula Instagram). Generación de miniaturas cuadradas 400x400 px con `sharp`. |
| **3** | **Subida de Nuevas Fotografías y Reconocimiento Facial** con `face-api.js` | ✅ Implementado | Detección de rostros en tiempo real en el navegador mediante redes neuronales de `face-api.js`, recuadros verdes en canvas y almacenamiento de coordenadas. |
| **4** | **3 Transformaciones Automáticas de Imágenes** (Sharp / AWS) | ✅ Implementado | Al subir una foto, Sharp genera automáticamente: 1) Blanco y Negro (Grayscale), 2) Sepia Cálido Vintage, y 3) Escala 50% / Nitidez. Las imágenes **no se guardan en la base de datos**. |
| **5** | **Visualización de Imágenes Completas y Transformaciones** | ✅ Implementado | Visor modal interactivo en pantalla completa con alternador de las 3 transformaciones de Sharp y activación de cajas de detección facial. |
| **6** | **Almacenamiento en la Nube (AWS S3) y Arquitectura** | ✅ Implementado | Servicio `@aws-sdk/client-s3` con almacenamiento desacoplado en bucket S3, persistencia de URLs en BD y fallback local transparente. |
| **Req 3 Adic.** | **Contraseñas con Sal Único por Usuario** | ✅ Implementado | Sal criptográfico único generado individualmente por cada cuenta con `bcrypt.genSalt(10)` y almacenado en el modelo de usuario. |
| **Req 4 Adic.** | **Despliegue en AWS EC2 (t2.small) N. Virginia** | ✅ Documentado | Instrucciones de despliegue, PM2, AMI en `us-east-1`, suspensión de instancia y credenciales limitadas IAM para evaluación docente. |
| **Req 6 Adic.** | **Amazon Route 53 (DNS y Dominio)** | ✅ Documentado | Configuración de zona alojada y registros tipo A apuntando a Elastic IP. |

---

## 📚 Manuales Técnicos y Entregables del Proyecto (Carpeta `docs/`)

En cumplimiento con los manuales requeridos en el documento de especificación:

1. 📐 [**Manual 1: Arquitectura de la Solución y Diagramas Distribuidos**](./docs/1_ARQUITECTURA_Y_COMPONENTES.md)
   - Arquitectura Cliente-Servidor y micro-procesamiento con Sharp.
   - Diagrama distribuido de componentes en Mermaid.
   - Diagrama de Cloud Computing (VPC, Subredes Públicas/Privadas, Security Groups).
   - Esquemas de Base de Datos relacional y documental.
2. 🚀 [**Manual 2: Manual del Desarrollador y Despliegue en AWS**](./docs/2_MANUAL_DEL_DESARROLLADOR_Y_DESPLIEGUE_AWS.md)
   - Lanzamiento y configuración de instancia EC2 `t2.small` en N. Virginia (`us-east-1`).
   - Par de claves SSH (`.pem`), VNC Client y PM2.
   - Configuración de bucket en Amazon S3 y políticas CORS.
   - Configuración de dominios y DNS en Amazon Route 53.
   - Procedimiento para suspender y reanudar la instancia para calificación docente.
3. 📱 [**Manual 3: Manual del Usuario**](./docs/3_MANUAL_DE_USUARIO.md)
   - Guía paso a paso para registro/login con Google y formulario estándar.
   - Navegación en cuadrícula Instagram vs Feed cronológico.
   - Subida de fotografías y reconocimiento facial en vivo con `face-api.js`.
   - Uso del visor de transformaciones (Original, Blanco y Negro, Sepia, Escala).
4. 🛡️ [**Manual 4: Seguridad de Base de Datos y Auditoría de Transacciones**](./docs/4_MANUAL_SEGURIDAD_BD_Y_AUDITORIA.md)
   - Implementación de Salting único por usuario (`bcrypt.genSalt(10)`).
   - Sistema de auditoría de transacciones y formato de logs.
   - Plan de mantenimiento de la Base de Datos (índices, rotación, compactación).
5. 🆘 [**Manual 5: Plan de Recuperación contra Desastres (DRP)**](./docs/5_PLAN_DE_RECUPERACION_CONTRA_DESASTRES_DRP.md)
   - Definición de métricas RTO (< 30 min) y RPO (< 1 hora).
   - Snapshots EBS automáticos y replicación S3.
   - Procedimiento de contingencia y conmutación por falla.
6. 👥 [**Manual 6: Plan de Capacitación IT y Plantilla de Entrega Docente**](./docs/6_PLAN_CAPACITACION_IT_Y_PLANTILLA_ENTREGA.md)
   - Programa formativo para personal de operaciones e infraestructura.
   - Plantilla de entrega con credenciales IAM limitadas, IP y par de claves SSH para evaluación del catedrático.

---

## 💻 Instalación y Ejecución Local

### 1. Clonar e Instalar Dependencias
```bash
git clone <URL_REPOSITORIO>
cd red-social
npm install
```

### 2. Configurar Variables de Entorno (`.env`)
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/red-social
JWT_SECRET=super_secret_jwt_key_umg_2026

# Opcional: Credenciales AWS S3 para modo Nube (si se omiten, funciona en modo local)
AWS_REGION=us-east-1
AWS_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

### 3. Iniciar el Servidor
```bash
# Modo producción
npm start

# Modo desarrollo
npm run dev
```
Abrir `http://localhost:3000` en el navegador.

---

## 🌐 Endpoints de la API REST

### Autenticación y Usuarios (`/api/usuarios`)
- `POST /api/usuarios`: Crear usuario (con sal único por usuario y reCAPTCHA).
- `POST /api/usuarios/login`: Iniciar sesión (usuario/correo + password).
- `POST /api/usuarios/google`: Autenticación con Google Identity Services API.
- `GET /api/usuarios/yo`: Obtener usuario de la sesión actual (JWT).
- `GET /api/usuarios`: Listar usuarios registrados.
- `GET /api/usuarios/:id`: Perfil con estadísticas y seguidores.
- `PUT /api/usuarios/:id/seguir`: Seguir / dejar de seguir (Toggle atómico).
- `PUT /api/usuarios/:id/foto-perfil`: Subir avatar.
- `PUT /api/usuarios/:id/foto-portada`: Subir foto de portada.

### Publicaciones Fotográficas (`/api/publicaciones`)
- `POST /api/publicaciones`: Crear publicación con fotografía. Genera automáticamente **miniatura cuadrada** y **3 transformaciones** con Sharp, registra **rostros detectados** y sube a AWS S3.
- `GET /api/publicaciones`: Explorar feed con paginación cursor (`?feed=siguiendo`, `?limite=12`, `?q=busqueda`).
- `GET /api/publicaciones/:id`: Obtener publicación con sus transformaciones.
- `PUT /api/publicaciones/:id`: Editar pie de foto.
- `DELETE /api/publicaciones/:id`: Eliminar publicación y purgar archivos de transformaciones.
- `PUT /api/publicaciones/:id/like`: Dar / quitar like.

### Comentarios (`/api/publicaciones/:id/comentarios`)
- `POST /api/publicaciones/:id/comentarios`: Agregar comentario.
- `GET /api/publicaciones/:id/comentarios`: Listar comentarios de una fotografía.
