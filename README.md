# BPM Bluren — Hojas de Secuencia (Intranet & PWA)

Aplicación web y PWA para digitalizar y controlar el seguimiento, validación y pagos de órdenes de trabajo y proyectos mediante Hojas de Secuencia dinámicas por áreas de trabajo.

---

## Stack Tecnológico

- **Frontend / Fullstack**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS.
- **Componentes e Iconos**: Lucide React, Tailwind Merge, Clsx.
- **Persistencia de Datos**: **SQLite (`data/bpm.db`)** con `better-sqlite3` en modo **WAL (Write-Ahead Logging)**, optimizado para concurrencia multi-usuario sin colisiones en red local.
- **Distribución**: Web en Intranet (red de oficina) y PWA instalable en Windows (Edge / Chrome).

---

## Funcionalidades Principales

1. **Alta de Proyectos**: Registro de código de proyecto, cliente, dirección de obra, presupuesto total, anticipo, saldo y notas.
2. **Motor de Secuencia Dinámica**: Genera los hitos ordenados automáticamente según la plantilla de trabajo elegida.
3. **Validación y Aprobación por Área**:
   - Cada usuario solo puede aprobar los hitos asignados a su área de trabajo (el rol *Admin* puede aprobar cualquiera).
   - Registro automático de usuario validador, fecha, hora y observaciones.
4. **Módulo de Pagos**: Control y registro de cobros parciales de anticipos y saldos por medio de pago (Transferencia, Efectivo, etc.).
5. **Dashboard e Indicadores**: Filtros de estado, cálculo automático de % de avance y seguimiento visual de hitos pendientes, aprobados o bloqueados.
6. **Configuración de Usuarios y Áreas**: Gestión de cuentas, contraseñas, áreas y activación/desactivación de accesos.

---

## Puesta en Marcha en la Oficina

### En la PC Servidora:
Hacé doble clic en el archivo:
```text
iniciar-BPM-Bluren.bat
```
* Compila la aplicación automáticamente si es la primera vez.
* Abre el navegador en `http://localhost:3000`.
* Inicia el servidor escuchando para toda la red de la oficina en el puerto `3000`.
* **Mantené la ventana de la consola abierta** mientras el sistema esté en uso.

### En las demás computadoras de la red:
1. Abrí Chrome o Edge e ingresá la IP de la PC servidora:
   ```text
   http://IP-DEL-SERVIDOR:3000
   ```
2. *(Opcional - Modo PWA)*: Hacé clic en el ícono de instalar en la barra de direcciones (o menú `⋮` ➔ *Instalar aplicación*). Quedará un ícono en el Escritorio que se abre en una ventana independiente como programa nativo.

Para más detalles de configuración de red y firewall, consultá [SETUP-OFICINA.md](./SETUP-OFICINA.md).

---

## Usuarios Iniciales

| Email | Contraseña | Área / Rol |
|---|---|---|
| `admin@empresa.com` | `admin` | Admin (Aprobación total) |
| `maria@empresa.com` | `1234` | Comercial |
| `carlos@empresa.com` | `1234` | Administración |
| `ana@empresa.com` | `1234` | Producción |
| `kari@empresa.com` | `1234` | Contabilidad |

---

## Respaldo de Datos (Backups)

Toda la información del sistema se encuentra en un único archivo:
```text
data/bpm.db
```
Para hacer una copia de seguridad diaria o semanal, simplemente copiá ese archivo a un pendrive o carpeta compartida externa.
