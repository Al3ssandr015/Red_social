# 🚀 MANUAL 2: GUÍA DEL DESARROLLADOR Y DESPLIEGUE EN AWS (EC2, S3, ROUTE 53)
**Curso:** Desarrollo Web  
**Catedrático:** MSc. Ing. Carlos Alejandro Arias  
**Universidad Mariano Gálvez de Guatemala**

---

## 1. Requisitos Previos y Entorno de Ejecución
- **Instancia EC2:** Tipo `t2.small` (Capa gratuita para estudiantes / AWS Educate).
- **Sistema Operativo:** Ubuntu Server 22.04 LTS o Amazon Linux 2023.
- **Región AWS:** `us-east-1` (N. Virginia), requerida obligatoriamente por la AMI de la cátedra.
- **Node.js:** Versión 18+ LTS o 20+ LTS (incluye `npm`).
- **Base de Datos:** MongoDB Server 6.0+ / Atlas o instancia local con servicio `mongod`.

---

## 2. Paso a Paso: Lanzamiento y Configuración de la Instancia EC2

### Paso 2.1: Crear el Par de Claves SSH
1. Ingresar a la consola de AWS en la región **N. Virginia (`us-east-1`)**.
2. Ir a **EC2 > Key Pairs (Pares de Claves)**.
3. Clic en **Create key pair**:
   - Nombre: `red-social-key`
   - Tipo: `RSA`
   - Formato: `.pem` (para OpenSSH / Mac / Linux) o `.ppk` (para PuTTY en Windows).
4. Guardar el archivo `red-social-key.pem` de forma segura.

### Paso 2.2: Lanzar la Instancia EC2
1. Ir a **EC2 > Instances > Launch an instance**.
2. Nombre: `InstaRed-Servidor-Web`.
3. Seleccionar AMI: **Ubuntu Server 22.04 LTS (HVM)** o la AMI indicada por la cátedra.
4. Tipo de Instancia: `t2.small` (1 vCPU, 2 GB RAM).
5. Seleccionar el par de claves creado: `red-social-key`.
6. En **Configuración de red (Network Settings)**:
   - Habilitar: **Allow SSH traffic from: Anywhere (o My IP)** (Puerto 22).
   - Habilitar: **Allow HTTP traffic from the internet** (Puerto 80).
   - Habilitar: **Allow HTTPS traffic from the internet** (Puerto 443).
   - Agregar regla personalizada: **Puerto TCP 3000** (para acceso directo a la aplicación Node.js).
7. Almacenamiento: Volumen EBS GP3 de 20 GB a 30 GB.
8. Clic en **Launch Instance**.

### Paso 2.3: Conexión Remota por SSH o Cliente VNC
Desde PowerShell o terminal:
```bash
chmod 400 red-social-key.pem
ssh -i "red-social-key.pem" ubuntu@<IP_PUBLICA_EC2>
```
*(Para conexión gráfica mediante cliente VNC, instalar `tightvncserver` y `xfce4` de acuerdo al tutorial del curso).*

---

## 3. Instalación de Dependencias y Despliegue del Proyecto en EC2

Una vez conectados a la máquina virtual:

```bash
# 1. Actualizar repositorios del sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js LTS y dependencias de procesamiento de imágenes
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git build-essential

# 3. Instalar y arrancar MongoDB
sudo apt install -y mongodb
sudo systemctl enable mongodb
sudo systemctl start mongodb

# 4. Clonar el repositorio del proyecto
git clone <URL_REPOSITORIO_GITHUB> /home/ubuntu/red-social
cd /home/ubuntu/red-social

# 5. Instalar paquetes de npm (incluyendo sharp y aws-sdk)
npm install

# 6. Configurar variables de entorno
cp .env.example .env
nano .env
```

Contenido del archivo `.env`:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/red-social
JWT_SECRET=super_secret_jwt_key_umg_2026_segura

# Configuración AWS S3
AWS_REGION=us-east-1
AWS_BUCKET_NAME=red-social-fotos-umg
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=wJalrX...
```

### Paso 3.1: Configuración de PM2 para Ejecución Continua
Para que la aplicación permanezca en ejecución incluso al cerrar la sesión SSH:
```bash
sudo npm install -g pm2
pm2 start index.js --name "instared"
pm2 save
pm2 startup
```

---

## 4. Configuración de Almacenamiento en la Nube (Amazon S3)

1. En la consola de AWS, ir al servicio **S3**.
2. Clic en **Create bucket**:
   - Nombre: `red-social-fotos-umg` (debe ser único a nivel global).
   - Región: `us-east-1 (N. Virginia)`.
   - Desmarcar *"Block all public access"* para permitir visualización pública de las fotografías.
3. En la pestaña **Permissions > Bucket Policy**, agregar:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::red-social-fotos-umg/*"
    }
  ]
}
```
4. Configurar **CORS** en S3 para permitir llamadas desde el frontend:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

---

## 5. Configuración de Dominio y DNS con Amazon Route 53

1. Ir al servicio **Route 53 > Hosted zones**.
2. Clic en **Create hosted zone**:
   - Nombre de dominio: ej. `instared.umgdesarrollo.com` (o dominio del grupo).
   - Tipo: Public hosted zone.
3. Crear un registro de tipo **A**:
   - Nombre: `@` o `app`
   - Tipo de registro: `A - Routes traffic to an IPv4 address`
   - Valor: Dirección **IPv4 Pública Elástica** de la instancia EC2.
   - TTL: 300 segundos.
4. (Opcional) Asociar certificado SSL gratuito con **Let's Encrypt / Certbot** mediante Nginx para habilitar HTTPS en el puerto 443.

---

## 6. Procedimiento para Suspender y Reanudar la Instancia (Para Evaluación Docente)

> [!IMPORTANT]
> El docente calificador solicita suspender la instancia para evitar consumo de créditos mientras llega su turno de revisión.

### Para Suspender la Instancia (Detener):
1. En la consola de AWS, ir a **EC2 > Instances**.
2. Seleccionar la instancia `InstaRed-Servidor-Web`.
3. Ir a **Instance state > Stop instance** (Detener instancia).
4. El estado pasará a `Stopped`. En este estado, los cómputos de vCPU no generan cobro.

### Para Reanudar la Instancia (Iniciar):
1. Ir a **Instance state > Start instance**.
2. Esperar 1 minuto hasta que el estado cambie a `Running` y los chequeos de estado marquen `2/2 checks passed`.
3. Verificar la nueva IP pública asignada (o la IP elástica fija) y acceder en el navegador.

---

## 7. Credenciales IAM con Permisos Limitados para el Docente

Para no compartir la contraseña root de la cuenta de AWS, se crea un usuario IAM exclusivo para la calificación:

1. Ir a **IAM > Users > Create user**:
   - Nombre: `docente-umg-evaluador`
   - Seleccionar: **Provide user access to the AWS Management Console**.
2. En la pestaña de Permisos, adjuntar una política en línea personalizada:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PermisosControlInstanciaEC2",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:StartInstances",
        "ec2:StopInstances",
        "ec2:RebootInstances"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PermisosLecturaS3",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject"
      ],
      "Resource": "*"
    }
  ]
}
```
3. Descargar el archivo CSV con el enlace de acceso a la consola, usuario y contraseña temporal para adjuntarlo en la entrega del proyecto.
