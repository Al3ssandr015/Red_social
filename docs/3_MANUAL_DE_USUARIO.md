# 📱 MANUAL 3: GUÍA DEL USUARIO (INSTARED)
**Curso:** Desarrollo Web  
**Universidad Mariano Gálvez de Guatemala**

---

## 1. Introducción a InstaRed
**InstaRed** es una red social orientada a la fotografía, diseñada con una experiencia visual moderna, fluida y reactiva tipo Instagram. Permite a los usuarios compartir sus capturas fotográficas, procesarlas automáticamente con filtros y transformaciones artísticas avanzadas, reconocer rostros mediante inteligencia artificial en el navegador e interactuar con otros miembros de la comunidad.

---

## 2. Pantalla de Bienvenida y Autenticación (Requerimiento 1)

Al acceder al sitio web sin una sesión activa, el usuario es recibido por la **Pantalla de Bienvenida**:

### A. Registro de Nuevos Usuarios
1. Clic en **"Crear cuenta con correo"** o directamente en **"Continuar con Google"**:
   - **Con Google Login API:** Se abre la ventana segura de Google Identity Services. Al seleccionar su cuenta, el sistema crea su perfil automáticamente extrayendo su nombre, correo y avatar oficial.
   - **Con Formulario Convencional:**
     - Ingresar: Nombre completo, `@username` único, correo electrónico y contraseña (mínimo 6 caracteres).
     - Completar el captcha de seguridad **"No soy un robot" (Google reCAPTCHA)**.
     - Clic en **"Registrarse"**. La contraseña es protegida inmediatamente con un valor de sal único y hash de alta seguridad.

### B. Inicio de Sesión
1. Clic en **"Iniciar sesión"**.
2. Ingresar nombre de usuario o correo electrónico y la contraseña correspondiente.
3. Resolver el widget de reCAPTCHA y presionar **"Entrar"** (o ingresar directamente con el botón de Google).

---

## 3. Navegación en la Página de Inicio (Requerimiento 2)

Una vez autenticado, el usuario accede al Inicio, donde cuenta con **dos modos de visualización**:

### A. Modo Cuadrícula Tipo Instagram (Miniaturas Sharp)
- Clic en el botón **"Instagram"** en la barra superior.
- La pantalla muestra una elegante cuadrícula de 3 columnas con las **miniaturas optimizadas de 400x400 px** generadas automáticamente mediante Sharp.
- **Efecto Hover:** Al pasar el cursor sobre cualquier fotografía, se despliega una capa oscura que revela los me gusta, comentarios y un distintivo si la foto cuenta con **rostros detectados por IA**.
- Al hacer clic en cualquier miniatura, se abre el **Visor de Resolución Completa y Transformaciones**.

### B. Modo Feed Clásico (Cronológico)
- Clic en el botón **"Feed"**.
- Muestra las publicaciones detalladas en orden cronológico inverso con scroll infinito, permitiendo leer pies de foto, ver detalles de los autores y dar me gusta rápidamente.

### C. Pestañas de Filtrado
- **Para ti:** Muestra todas las fotografías publicadas en la red social.
- **Siguiendo:** Filtra exclusivamente las publicaciones de los fotógrafos a los que el usuario sigue más sus propias publicaciones.

---

## 4. Subida de Fotografías y Reconocimiento Facial (Requerimiento 3 y 4)

1. En la caja superior de publicación o presionando el botón **"+ Publicar Foto"**:
2. Escribir el pie de foto o descripción del momento.
3. Clic en **"📷 Seleccionar Foto"** y elegir un archivo de imagen (JPEG, PNG, WEBP).
4. **Análisis Facial en Vivo con Face-API.js:**
   - La aplicación procesa la fotografía en milisegundos utilizando la red neuronal convolucional de face-api.
   - Si detecta personas, se dibuja un recuadro verde brillante sobre cada rostro y aparece un banner informativo:  
     `👤 Se detectaron X rostro(s) en la foto con face-api.js`.
5. Clic en **"Publicar"**:
   - En el backend, el motor **Sharp** genera automáticamente:
     1. La **miniatura cuadrada** para la cuadrícula Instagram.
     2. **Transformación 1:** Versión Blanco y Negro (Grayscale).
     3. **Transformación 2:** Filtro Sepia cálido vintage.
     4. **Transformación 3:** Escala reducida al 50% con realce de nitidez.
   - Las imágenes se envían a **Amazon S3** (o almacenamiento desacoplado de la nube) y la base de datos guarda únicamente las ubicaciones.

---

## 5. Visor Interactivo de Resolución Completa y Transformaciones (Requerimiento 5)

Al pulsar cualquier fotografía en la cuadrícula o el botón **"✨ Transformaciones"**:

Se abre el **Visor Modal Interactivo en Pantalla Completa**:
- **Lado Izquierdo:** Visualización de la imagen en alta definición.
- **Barra de Transformaciones en la parte inferior:**
  - Botón **🖼️ Original:** Muestra la fotografía nativa sin alteraciones.
  - Botón **🖤 Blanco y Negro:** Alterna inmediatamente a la versión en escala de grises creada por Sharp.
  - Botón **🍂 Sepia:** Aplica la modulación de tinte cálido vintage.
  - Botón **📐 Escala 50%:** Muestra la versión artística a escala reducida optimizada.
  - Botón **👤 Rostros (X):** Activa o desactiva la superposición del canvas de detección facial, mostrando los recuadros de cada rostro identificado en la fotografía.
- **Lado Derecho:**
  - Información y avatar del autor (clickeable para ir a su perfil).
  - Fecha y hora exacta de publicación.
  - Botón interactivo de Like (con animación y conteo en tiempo real).
  - Lista completa de respuestas y comentarios.
  - Caja de texto para añadir comentarios en el acto.

---

## 6. Perfil de Usuario y Portada
- En la pestaña **"Perfil"**, el usuario puede visualizar su contador de seguidores, personas que sigue y su galería personal en formato cuadrícula Instagram o lista.
- **Personalización:** Haciendo clic sobre el icono de cámara `📷` en el avatar o en el banner superior, el usuario puede actualizar su foto de perfil y portada al instante.
