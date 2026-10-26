# 🆘 MANUAL 5: PLAN DE RECUPERACIÓN CONTRA DESASTRES (DISASTER RECOVERY PLAN - DRP)
**Curso:** Desarrollo Web  
**Universidad Mariano Gálvez de Guatemala**

---

## 1. Objetivos del Plan de Recuperación (RTO y RPO)

El **Disaster Recovery Plan (DRP)** establece los procedimientos operativos estandarizados para restaurar los servicios de InstaRed ante fallas de hardware, corrupción de datos, ataques cibernéticos o interrupciones en la región de AWS (`us-east-1`):

- **RTO (Recovery Time Objective - Tiempo Máximo de Recuperación Tolerable):** **< 30 minutos**. Tiempo desde la detección del desastre hasta que la plataforma vuelve a estar operativa.
- **RPO (Recovery Point Objective - Pérdida Máxima de Datos Tolerable):** **< 1 hora**. Cantidad máxima de tiempo de transacciones que pueden perderse tras el último respaldo.

---

## 2. Estrategia de Copias de Seguridad (Backup Strategy)

### A. Almacenamiento en la Nube (Amazon S3)
- **Versionado de Objetos:** Activado en el bucket S3 para prevenir borrados accidentales o ataques de ransomware.
- **Ciclo de Vida de S3 (Lifecycle Rules):** Migración automática de fotografías históricas a la clase `S3 Standard-IA` (Infrequent Access) a los 30 días para optimizar costos de almacenamiento.
- **Replicación Cross-Region:** Replicación asíncrona automática hacia un bucket secundario en la región `us-west-2` (Oregon).

### B. Volumen EBS y Base de Datos
- **AWS Data Lifecycle Manager (DLM):** Creación programada de **Snapshots diarios** del volumen EBS de la instancia EC2 a las 02:00 AM UTC con retención de 7 días.
- **Script Cron de Respaldo Diario de Base de Datos:**
```bash
#!/bin/bash
# /opt/scripts/backup-db.sh
FECHA=$(date +%Y-%m-%d_%H-%M)
DESTINO="/backups/$FECHA"
mkdir -p "$DESTINO"
mongodump --db=red-social --out="$DESTINO"
tar -czf "/backups/backup-$FECHA.tar.gz" -C "/backups" "$FECHA"
rm -rf "$DESTINO"
# Sincronización a bucket privado de seguridad S3
aws s3 cp "/backups/backup-$FECHA.tar.gz" "s3://red-social-backups-umg/db/"
```

---

## 3. Matriz de Escenarios de Desastre y Respuestas de Contingencia

| Nivel de Riesgo | Evento de Desastre | Probabilidad | Impacto | Acción de Contingencia Inmediata |
| :--- | :--- | :--- | :--- | :--- |
| **Alto** | Falla total de la instancia EC2 (`t2.small`) | Media | Crítico | Lanzar nueva instancia a partir del Snapshot EBS más reciente o AMI dorada en < 15 min. Reasignar IP elástica. |
| **Medio** | Corrupción o borrado accidental en la Base de Datos | Baja | Alto | Restaurar el volcado `mongorestore` desde S3 al punto en el tiempo previo al incidente. |
| **Bajo** | Caída de conectividad DNS / Enrutamiento | Baja | Medio | Conmutar registros de Amazon Route 53 hacia el endpoint de respaldo. |
| **Bajo** | Sobrecarga de CPU por procesamiento masivo en Sharp | Media | Bajo | El servidor web aplica limitador de tasa (`rate limit`) y aislamiento de procesos de worker. |

---

## 4. Procedimiento de Restauración Paso a Paso (Runbook de Emergencia)

En caso de pérdida irrecuperable de la instancia EC2:

1. **Crear Volumen desde Snapshot:**
   - En la consola de AWS, ir a **EC2 > Snapshots**.
   - Seleccionar el Snapshot más reciente de `InstaRed`.
   - Clic en **Actions > Create Volume from Snapshot** en la zona de disponibilidad `us-east-1a`.
2. **Lanzar Nueva Instancia EC2:**
   - Lanzar una nueva instancia `t2.small`.
   - Adjuntar el volumen restaurado como disco raíz (`/dev/sda1`).
3. **Reasignar Elastic IP:**
   - En **EC2 > Elastic IPs**, reasignar la IP pública elástica a la nueva instancia.
   - De esta forma, **Route 53 y los usuarios no requieren cambios de configuración**, restableciendo el servicio inmediatamente.
4. **Verificación de Servicios:**
   - Comprobar servicio PM2: `pm2 status`.
   - Comprobar conectividad con S3: `node -e "require('./services/s3Service')"`
   - Ejecutar prueba funcional de carga de fotos y visualización de transformaciones.
