# 🛡️ MANUAL 4: SEGURIDAD DE LA BASE DE DATOS, AUDITORÍA Y PLAN DE MANTENIMIENTO
**Curso:** Desarrollo Web  
**Universidad Mariano Gálvez de Guatemala**

---

## 1. Seguridad de Contraseñas: Hashing y Sal Criptográfico Único

En cumplimiento estricto con el **Requerimiento Adicional 3**:  
> *"Las contraseñas de los usuarios se almacenarán en forma de hash junto con un valor de sal único para cada usuario."*

### A. Fundamento Teórico del Salting
El **sal (salt)** es una secuencia pseudoaleatoria de bits generada individualmente para cada usuario antes de procesar su contraseña con una función hash criptográfica.
- **Prevención de ataques Rainbow Table:** Dos usuarios que utilicen exactamente la misma contraseña (ej: `Password123`) obtendrán hashes completamente diferentes en la base de datos gracias a su sal particular.
- **Mitigación de ataques de fuerza bruta:** Se utiliza el algoritmo **Bcrypt** con un factor de trabajo (*work factor / cost*) de 10 rondas (`2^10 = 1024 iteraciones`), asegurando resistencia computacional.

### B. Implementación en Código (`controllers/user.js`)
```javascript
// 1. Generación de sal único e independiente para este usuario específico
const salt = await bcrypt.genSalt(10);

// 2. Cálculo del hash combinando la contraseña en texto plano con el sal generado
const hash = await bcrypt.hash(String(password), salt);

// 3. Almacenamiento en la base de datos de forma persistente
const nuevoUsuario = new Usuario({
    nombre,
    correo: correo.toLowerCase().trim(),
    username: username.toLowerCase().trim(),
    password: hash,
    salt: salt // Sal registrado explícitamente en el modelo
});

await nuevoUsuario.save();
```

---

## 2. Sistema de Auditoría de Transacciones

El sistema de auditoría registra las acciones críticas de los usuarios para trazabilidad forense y detección de comportamientos anómalos:

### Eventos Auditados
1. **Autenticación:**
   - Intentos exitosos y fallidos de inicio de sesión convencional.
   - Creación de cuenta y vinculación con Google Login API.
2. **Operaciones CRUD sobre Publicaciones:**
   - Creación de fotografías con registro de IP de origen, usuario y número de transformaciones generadas.
   - Eliminación de publicaciones y purga física de archivos en S3/disco.
3. **Interacciones Sociales:**
   - Transacciones atómicas de "Like" mediante operadores `$addToSet` y `$pull` para impedir manipulación concurrente de contadores.
   - Registro de relaciones de seguimiento (`Follow / Unfollow`).

### Formato de Registro de Transacciones (Log de Auditoría)
```json
{
  "timestamp": "2026-10-25T21:40:00.000Z",
  "transaccionId": "tx-84920194",
  "usuarioId": "65b4c194e2a84f0012a9b34c",
  "accion": "PUBLICACION_CREADA",
  "ipOrigen": "190.56.24.110",
  "recurso": "/api/publicaciones",
  "archivosGenerados": {
    "original": "/uploads/posts/1791829384-foto.jpg",
    "miniatura": "/uploads/posts/1791829384-foto_thumb.jpg",
    "blancoYNegro": "/uploads/posts/1791829384-foto_bw.jpg",
    "sepia": "/uploads/posts/1791829384-foto_sepia.jpg",
    "escalaReducida": "/uploads/posts/1791829384-foto_scale.jpg"
  },
  "deteccionesFaciales": 2,
  "estado": "SUCCESS"
}
```

---

## 3. Manual de Seguridad de la Base de Datos

### A. Principio de Menor Privilegio
- El usuario de conexión a la base de datos utilizado por Node.js posee permisos acotados exclusivamente a la base de datos `red-social`, sin privilegios administrativos sobre el motor global (`admin` o `clusterAdmin`).
- Autenticación obligatoria mediante mecanismo SCRAM-SHA-256 con contraseña robusta.

### B. Prevención de Inyecciones NoSQL y XSS
- **Mongoose Schemas con Tipado Fuerte:** Todos los modelos declaran estrictamente los tipos de datos permitidos.
- **Sanitización de Consultas:** Se evita el uso de operadores desanitizados como `$where` o ejecución de strings arbitrarios.
- **Escape de Caracteres en Búsquedas:** Las búsquedas textuales sanitizan caracteres especiales de expresiones regulares mediante `escapeRegex()`.
- **Proyección de Campos Sensibles:** Las consultas públicas excluyen automáticamente `password`, `salt` y listas privadas con `.select('-password -salt')`.

---

## 4. Plan de Mantenimiento de la Base de Datos

Para garantizar un rendimiento óptimo en la instancia `t2.small` de EC2:

| Frecuencia | Tarea de Mantenimiento | Comando / Procedimiento |
| :--- | :--- | :--- |
| **Diario** | Copia de seguridad lógica (`dump`) | `mongodump --db=red-social --out=/backups/$(date +%F)` |
| **Semanal** | Reindexación y verificación de índices | `db.publicaciones.reIndex()` y `db.usuarios.reIndex()` |
| **Quincenal** | Rotación y purga de logs del servidor | Rotación de `/var/log/mongodb/mongod.log` con `logrotate` |
| **Mensual** | Compactación de colecciones para liberar espacio | `db.runCommand({ compact: 'publicaciones' })` |
| **Trimestral**| Verificación de integridad de referencias | Script de limpieza de comentarios o likes huérfanos |
