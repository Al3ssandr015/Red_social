# 📐 MANUAL 1: ARQUITECTURA DE LA SOLUCIÓN, COMPONENTES Y CLOUD COMPUTING
**Curso:** Desarrollo Web  
**Catedrático:** MSc. Ing. Carlos Alejandro Arias  
**Universidad Mariano Gálvez de Guatemala**  
**Proyecto Final:** Red Social Fotográfica Tipo Instagram con Procesamiento Automático y Nube AWS

---

## 1. Resumen Ejecutivo
InstaRed es una plataforma social para almacenar, transformar y navegar fotografías en alta resolución y miniaturas tipo Instagram. La arquitectura está diseñada bajo principios de alta disponibilidad, desacoplamiento de componentes y almacenamiento escalable en la nube (AWS S3) para cumplir rigurosamente con los requerimientos de la cátedra:
- **No almacenar imágenes directamente en la base de datos:** Las imágenes se conservan en un bucket de **Amazon S3** (o almacenamiento desacoplado de archivos con fallback local) y la base de datos relacional/documental únicamente guarda metadatos, identificadores y URLs públicas.
- **Procesamiento automático:** Generación en tiempo real de una miniatura optimizada de 400x400 px y 3 transformaciones independientes (Blanco y Negro, Sepia Cálido, Escala Reducida 50% / Filtro Artístico) mediante el motor de procesamiento **Sharp**.
- **Reconocimiento Facial Inteligente:** Integración de **face-api.js** para detección automática de rostros y delimitación gráfica en tiempo real.
- **Autenticación Avanzada:** Inicio de sesión y registro mediante **Google Identity Services (Google Login API)** y validación anti-bots mediante **Google reCAPTCHA**.

---

## 2. Diagrama Distribuido de Componentes

```mermaid
graph TD
    subgraph Cliente["Navegador Web / Cliente (Desktop / Móvil)"]
        UI["Interfaz Web (HTML5, CSS3 Inter, Vanilla JS Modular)"]
        FaceClient["Motor Face-API.js (Detección Facial en Canvas)"]
        GoogleAuth["Google Identity Services SDK"]
        ReCaptcha["Google reCAPTCHA v2 / v3"]
    end

    subgraph AWS_EC2["Instancia AWS EC2 (t2.small - Ubuntu Server 22.04 LTS)"]
        Nginx["Servidor Web Inverso / Proxy Nginx (Puerto 80/443)"]
        NodeApp["Servidor Backend Node.js / Express (Puerto 3000)"]
        SharpEngine["Motor de Transformaciones Sharp (Miniatura + 3 Filtros)"]
        AuthModule["Módulo de Seguridad (Bcrypt + Sal Único + JWT)"]
    end

    subgraph AWS_Cloud["Servicios en la Nube AWS"]
        S3Bucket[("Amazon S3 Bucket: Fotografías Originales y Transformadas")]
        Route53["Amazon Route 53 (Gestión DNS / Dominio)"]
        IAMRole["AWS IAM (Políticas de Seguridad y Acceso Docente)"]
    end

    subgraph BaseDatos["Capa de Persistencia"]
        DB[("Base de Datos: Usuarios, Publicaciones, Metadatos y Sal")]
    end

    UI -->|Peticiones HTTP/REST| Nginx
    Nginx --> NodeApp
    NodeApp --> AuthModule
    NodeApp --> SharpEngine
    NodeApp -->|Metadatos y URLs| DB
    SharpEngine -->|Envío de Archivos Procesados| S3Bucket
    GoogleAuth -.->|Validación de Token| NodeApp
    ReCaptcha -.->|Verificación de Token| NodeApp
    UI -->|Renderizado de Miniaturas y Full-Res| S3Bucket
    FaceClient -->|Detección de Coordenadas| UI
```

---

## 3. Segmentación de Red y Diagrama Cloud Computing (AWS)

La arquitectura de red en AWS implementa segmentación mediante una **Virtual Private Cloud (VPC)** dividida en subredes públicas y privadas, protegidas por **Security Groups**:

```mermaid
graph LR
    Internet((Internet / Usuarios)) --> Route53["AWS Route 53 DNS"]
    Route53 --> IGW["Internet Gateway (IGW)"]

    subgraph VPC["AWS Virtual Private Cloud (10.0.0.0/16) - us-east-1 (N. Virginia)"]
        subgraph SubredPublica["Subred Pública (10.0.1.0/24)"]
            EC2["Instancia EC2 t2.small<br/>(Node.js + Sharp + Express)<br/>IP Pública Elástica"]
            SG_EC2["Security Group EC2<br/>Inbound: 80, 443, 22 (SSH)"]
        end

        subgraph SubredPrivada["Subred Privada (10.0.2.0/24)"]
            MongoDB[("Servicio de Base de Datos<br/>Acceso solo desde SG_EC2")]
        end

        subgraph S3_VPC["Amazon S3 Bucket"]
            S3["Bucket S3: red-social-fotos<br/>Políticas de Lectura Pública GetObject"]
        end
    end

    IGW --> EC2
    EC2 --> MongoDB
    EC2 -->|SDK v3 / IAM Role| S3
```

### Reglas de Seguridad (Security Groups)
| Protocolo | Puerto | Origen | Propósito |
| :--- | :--- | :--- | :--- |
| **SSH** | `22` | IP del docente / Administrador | Conexión remota por terminal |
| **HTTP** | `80` | `0.0.0.0/0` | Acceso web de la red social |
| **HTTPS** | `443` | `0.0.0.0/0` | Tráfico seguro con certificado SSL |
| **MongoDB** | `27017` | `10.0.1.0/24` (Subred Interna) | Tráfico exclusivo para la aplicación |

---

## 4. Esquema de Datos Relacional y de Entidades

La base de datos relacional/documental almacena exclusivamente los metadatos y la ubicación (URLs) de los recursos fotográficos, garantizando que el peso de los binarios no degrade el rendimiento de la base de datos:

### Colección / Tabla: `usuarios`
| Campo | Tipo | Restricción | Descripción |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId / UUID | Primary Key | Identificador único del usuario |
| `nombre` | String | NOT NULL | Nombre y apellido |
| `username` | String | UNIQUE, INDEX | Nombre de usuario único (ej: `@alessandro`) |
| `correo` | String | UNIQUE, INDEX | Correo electrónico institucional o personal |
| `password` | String | HASH | Contraseña cifrada en formato hash seguro |
| `salt` | String | NOT NULL | **Sal criptográfico único generado por usuario** |
| `googleId` | String | NULLABLE | ID de cuenta de Google si usa Google Login API |
| `fotoPerfil` | String | URL / Path | URL de S3 o ruta relativa del avatar |
| `fotoPortada` | String | URL / Path | URL de S3 o ruta relativa de portada |
| `siguiendo` | Array / Relación | Foreign Keys | Lista de IDs de usuarios seguidos |
| `fechaRegistro`| Date | DEFAULT NOW | Fecha y hora de alta en la plataforma |

### Colección / Tabla: `publicaciones`
| Campo | Tipo | Restricción | Descripción |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId / UUID | Primary Key | Identificador único de la publicación |
| `usuario` | ObjectId / FK | NOT NULL, INDEX | Clave foránea al usuario autor |
| `contenido` | String | NOT NULL | Pie de foto o texto descriptivo |
| `imagen` | String (URL) | NOT NULL | **URL de la foto en resolución completa (S3)** |
| `miniatura` | String (URL) | NOT NULL | **URL de la miniatura 400x400 (Sharp)** |
| `transformaciones` | JSON / Objeto | NOT NULL | Contiene URLs de las 3 transformaciones: |
| ↳ `blancoYNegro` | String (URL) | - | Versión Grayscale generada por Sharp |
| ↳ `sepia` | String (URL) | - | Versión con tinte Sepia y modulación cálida |
| ↳ `escalaReducida` | String (URL) | - | Versión con escala 50% y sharpening |
| `deteccionesFaciales`| JSON / Objeto | - | Resultados de face-api.js (cantidad y coordenadas) |
| `likes` | Integer | DEFAULT 0 | Contador numérico de "Me gusta" |
| `likedBy` | Array de FKs | INDEX | Evita votos duplicados por usuario |
| `fecha` | Date | DEFAULT NOW | Timestamp de creación |

### Colección / Tabla: `comentarios`
| Campo | Tipo | Restricción | Descripción |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId / UUID | Primary Key | Identificador del comentario |
| `publicacion` | ObjectId / FK | NOT NULL, INDEX | Referencia a la publicación comentada |
| `usuario` | ObjectId / FK | NOT NULL | Referencia al autor del comentario |
| `comentario` | String | NOT NULL | Contenido textual de la respuesta |
| `fecha` | Date | DEFAULT NOW | Fecha de emisión |
