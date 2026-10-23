# BPM Bluren — Puesta en marcha en Red Local (Intranet)

## Arquitectura del sistema

- **Una sola PC actúa como Servidor:** Aloja la aplicación y la base de datos `data/bpm.db` (SQLite en modo WAL para soportar múltiples usuarios concurrentes).
- **Las demás PCs acceden por el navegador:** Entran a `http://IP-DEL-SERVIDOR:3000` (Chrome, Edge o Firefox).
- **Cero internet / Cero nube:** Funciona 100% desconectado, seguro dentro de la oficina.

---

## Paso 1 — Elegir la PC Servidor

1. Elegí una computadora que permanezca encendida durante el horario laboral (por ejemplo, la PC de Administración).
2. Averiguá la dirección IP local de esa máquina:
   - Presioná `Win + R` ➔ escribí `cmd` y Enter.
   - Escribí `ipconfig` y buscá la línea **Dirección IPv4** (por ejemplo: `192.168.1.50` o `192.168.0.25`).

---

## Paso 2 — Iniciar el sistema en la PC Servidor

Simplemente hacé **doble clic** en:
```text
C:\BMP-Bluren\secuencia-ordenes\iniciar-BPM-Bluren.bat
```

* La primera vez o si hubo cambios, compila la aplicación automáticamente.
* Abre el navegador en `http://localhost:3000`.
* Inicia el servidor escuchando en toda la red (`0.0.0.0:3000`).
* **Dejá la ventana negra de la consola abierta** mientras el sistema esté en uso.

*(Opcional: Si querés que arranque solo al encender la PC, copiá un acceso directo de `iniciar-BPM-Bluren-oculto.vbs` a la carpeta de Inicio de Windows).*

---

## Paso 3 — Permitir el puerto en el Firewall de Windows (Solo en la PC Servidor)

Para que las otras computadoras puedan entrar sin que Windows las bloquee:
1. En la PC Servidor, abrí el menú Inicio y buscá **"Firewall de Windows Defender con seguridad avanzada"**.
2. A la izquierda, hacé clic en **Reglas de entrada**.
3. A la derecha, clic en **Nueva regla...**:
   * Tipo de regla: **Puerto** ➔ Siguiente.
   * Protocolo: **TCP**, Puertos locales específicos: **3000** ➔ Siguiente.
   * Acción: **Permitir la conexión** ➔ Siguiente.
   * Perfil: Marcar Dominio, Privado y Público ➔ Siguiente.
   * Nombre: `BPM Bluren (Puerto 3000)` ➔ Finalizar.

---

## Paso 4 — Ingresar desde las demás computadoras

Desde cualquier otra PC conectada al mismo Wi-Fi o cable de red de la oficina:
1. Abrí Chrome o Edge.
2. Ingresá en la barra de direcciones:
   ```text
   http://IP-DEL-SERVIDOR:3000
   ```
   *(Reemplazá por la IP real, por ejemplo `http://192.168.1.50:3000`)*.
3. **Instalar como App (Opcional):**
   * En Edge o Chrome, hacé clic en el ícono de monitor/instalar que aparece en la barra de direcciones o en el menú de 3 puntos ➔ **Instalar BPM Bluren**.
   * Les quedará un acceso directo en el Escritorio que se abre como un programa nativo de Windows.

---

## Usuarios iniciales configurados

| Email | Contraseña | Área / Rol |
|---|---|---|
| `admin@empresa.com` | `admin` | Admin (Aprobación total) |
| `maria@empresa.com` | `1234` | Comercial |
| `carlos@empresa.com` | `1234` | Administración |
| `ana@empresa.com` | `1234` | Producción |
| `kari@empresa.com` | `1234` | Contabilidad |

---

## Respaldo de datos (Backups)

Toda la información del sistema (órdenes, presupuestos, clientes, pagos y usuarios) se guarda en un solo archivo:
```text
C:\BMP-Bluren\secuencia-ordenes\data\bpm.db
```

Para hacer un backup diario o semanal:
* Simplemente copiá el archivo `bpm.db` a un pendrive o carpeta compartida externa.
