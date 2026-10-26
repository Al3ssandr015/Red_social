# 👥 MANUAL 6: PLAN DE CAPACITACIONES PARA IT Y PLANTILLA DE ENTREGA FINAL
**Curso:** Desarrollo Web  
**Catedrático:** MSc. Ing. Carlos Alejandro Arias  
**Universidad Mariano Gálvez de Guatemala**

---

## 1. Plan de Capacitación para el Equipo de Operaciones y TI

Este plan prepara al personal técnico encargado del soporte y mantenimiento continuo de la infraestructura de InstaRed:

| Módulo | Tema Clave | Duración | Objetivos de Aprendizaje |
| :--- | :--- | :--- | :--- |
| **Módulo 1** | **Administración de AWS EC2 y Linux** | 4 Horas | Gestión del ciclo de vida de instancias (`start`, `stop`, `reboot`), conexión por SSH con pares de claves, monitoreo de métricas de CPU/RAM en CloudWatch y configuración de alarmas. |
| **Módulo 2** | **Almacenamiento en la Nube con Amazon S3** | 3 Horas | Gestión de buckets, políticas de acceso público (`Bucket Policy`), reglas de ciclo de vida (`Lifecycle rules`), configuración de CORS y control de costos. |
| **Módulo 3** | **Seguridad, Hashing y Salting** | 3 Horas | Principios de salting y criptografía con Bcrypt, gestión de tokens JWT con expiración, y rotación periódica de credenciales IAM. |
| **Módulo 4** | **Procesamiento de Imágenes y Sharp** | 2 Horas | Funcionamiento de la pipeline de generación de miniaturas y 3 transformaciones automáticas (Blanco y negro, Sepia, Escala) y ajuste de calidad. |
| **Módulo 5** | **Simulacro de Contingencia DRP** | 4 Horas | Ejecución práctica de restauración de un Snapshot EBS ante un escenario simulado de caída total de la máquina virtual. |

---

## 2. Plantilla de Entrega del Proyecto Final (Para Calificación del Docente)

> [!NOTE]
> Esta sección recopila la información solicitada en la sección de **Entregables** del PDF para que el docente pueda realizar la evaluación y calificación de manera inmediata.

### A. Identificación del Grupo de Estudiantes
| No. | Nombre Completo del Estudiante | Carné / Identificación | Rama en GitHub Asignada |
| :---: | :--- | :---: | :--- |
| 1 | Alessandro Mansilla | [Completar Carné] | `main` / `feature/auth-and-models` |
| 2 | [Nombre Integrante 2] | [Carné] | `feature/sharp-transformations` |
| 3 | [Nombre Integrante 3] | [Carné] | `feature/face-api-integration` |
| 4 | [Nombre Integrante 4] | [Carné] | `feature/aws-deployment` |

*(Repositorio en GitHub con ramas por cuenta de usuario: [Enlace al Repositorio])*

---

### B. Datos de Acceso y Credenciales de AWS para Evaluación Docente
En conformidad con las instrucciones de la cátedra:

1. **Región AWS:** `us-east-1` (N. Virginia).
2. **Consola de Inicio de Sesión IAM:**  
   `https://<ID_CUENTA_AWS>.signin.aws.amazon.com/console`
3. **Usuario IAM Docente:** `docente-umg-evaluador`
4. **Contraseña Temporal:** `UmgEvaluador2026!*`
5. **Permisos Asignados:** Privilegios limitados mediante AWS IAM con autorización para **iniciar (`StartInstances`)** y **detener (`StopInstances`)** la instancia EC2 `InstaRed-Servidor-Web`, así como inspeccionar el bucket de S3.
6. **Par de Claves SSH:**  
   Archivo adjunto: `red-social-key.pem`
7. **Comando de Conexión SSH:**
   ```bash
   ssh -i "red-social-key.pem" ubuntu@<IP_PUBLICA_EC2>
   ```
8. **Enlace Web de la Aplicación en Producción:**  
   `http://<IP_PUBLICA_O_DNS_ROUTE53>:3000`

---

### C. Estado Actual de la Instancia EC2
> [!IMPORTANT]
> Siguiendo la indicación del catedrático para evitar acumulación de cargos:
> **La instancia se encuentra en estado SUSPENDIDA (STOPPED).**  
> El docente puede iniciarla desde la consola de AWS utilizando las credenciales provistas con un solo clic en **"Start instance"**. Una vez iniciada, la aplicación estará lista para interactuar en menos de 60 segundos.
