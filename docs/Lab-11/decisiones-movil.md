# Laboratorio 11 - Decisiones de diseño móvil

## Identificación de la aplicación

- Nombre visible: **RentaCar**.
- App ID: `com.grupo1.rentacar`.
- Framework: Ionic 9 + Vue 3 + TypeScript.
- Runtime nativo: Capacitor 8.

## Capacidad nativa seleccionada

Se integró **geolocalización** mediante `@capacitor/geolocation`. La funcionalidad se presenta en la pantalla de detalle de un vehículo mediante un componente reutilizable que permite consultar la ubicación actual del dispositivo.

La aplicación solicita el permiso únicamente cuando la persona toca el botón **Obtener ubicación actual**, evitando pedir acceso al abrir la aplicación sin contexto.

## Manejo de permisos

Se contemplan estos casos:

1. **Permiso concedido:** se muestran latitud, longitud, precisión aproximada y fecha/hora de la consulta.
2. **Permiso denegado:** se informa que la ubicación no puede consultarse y se permite volver a intentar.
3. **Permiso denegado permanentemente:** se explica que, si Android ya no muestra el diálogo de permiso, debe habilitarse manualmente desde Ajustes > Apps > RentaCar > Permisos > Ubicación.
4. **Ubicación desactivada:** se solicita activar la ubicación del dispositivo y reintentar.
5. **Tiempo de espera o error del dispositivo:** se muestra un mensaje de error y se mantiene disponible la opción de reintento.

## Permisos Android

En `android/app/src/main/AndroidManifest.xml` deben declararse:

```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-feature android:name="android.hardware.location.gps" android:required="false" />
```

Para desarrollo local, mientras la API Laravel se sirva por HTTP en la red local, la etiqueta `<application>` utiliza temporalmente `android:usesCleartextTraffic="true"`. En producción debería utilizarse HTTPS.

## Integración con el resto del proyecto

La aplicación móvil separa responsabilidades para que cada parte pueda probarse de forma independiente:

- `src/router/index.ts`: cuatro rutas principales, carga diferida y guardián de autenticación.
- `src/services/api.ts`: punto central de acceso a Laravel; adjunta automáticamente el token y procesa respuestas 401.
- `src/services/secureStorage.ts`: guarda el token en almacenamiento seguro nativo. El token no se guarda en `localStorage`.
- `src/composables/useNetwork.ts`: observa el estado de conectividad mediante `@capacitor/network`.
- `src/services/cacheVehiculos.ts`: guarda únicamente el último listado de vehículos para el modo offline. Esta caché sí puede usar almacenamiento local porque no contiene el token de sesión.
- `src/services/geolocation.ts`: permisos, consulta al plugin y normalización de errores de ubicación.
- `src/components/UbicacionActual.vue`: interfaz reutilizable, estados de carga/error y presentación de coordenadas.
- `src/views/VehiculoDetallePage.vue`: incorpora geolocalización sin mezclar la lógica del hardware con la consulta del vehículo.

## Plugins utilizados en el Lab 11

- `@aparajita/capacitor-secure-storage`: almacenamiento cifrado del token en Android.
- `@capacitor/network`: detección de conexión y recuperación de la lista al volver la red.
- `@capacitor/geolocation`: capacidad nativa seleccionada para el laboratorio.
- `@capacitor/app`: soporte del comportamiento del botón físico de retroceso/cierre en Android.
- `CapacitorHttp` (configuración de Capacitor): permite consumir la API HTTP de desarrollo desde Android durante las pruebas locales.

## Navegación y sesión

Después del inicio de sesión se usa `router.replace('/vehiculos')`, por lo que el login no debe quedar como pantalla anterior al usar el botón físico de retroceso. Las rutas privadas tienen `meta.requiresAuth` y el `beforeEach` restaura/verifica la sesión antes de permitir el acceso.

Cuando la API responde 401, el manejador central elimina la sesión local y redirige a `/login`. El cierre de sesión normal también revoca el token en Laravel y elimina la copia segura del dispositivo.

## Modo sin conexión

El listado se guarda con una marca de tiempo. `@capacitor/network` detecta la pérdida de conexión y, si existe una copia previa, se presenta como **información desactualizada** junto con la fecha/hora de la última actualización. Al recuperar conexión se vuelve a consultar la API.

## Áreas seguras y tamaños de pantalla

El proyecto utiliza `viewport-fit=cover`, `ion-page`, `ion-header`, `ion-toolbar` e `ion-content`. En Capacitor 8/Android moderno las áreas seguras deben verificarse visualmente porque el contenido puede ejecutarse edge-to-edge. La evidencia final debe probar al menos dos tamaños de pantalla diferentes y confirmar que encabezados, botones y contenido no quedan debajo de la barra de estado, cámara/notch o barra de navegación.

Registrar para la entrega:

- Dispositivo/tamaño 1: **Medium Phone - Android 16 / API 36**.
- Resultado tamaño 1: geolocalización y flujo principal visibles correctamente. **Revisar nuevamente después de integrar todos los cambios finales.**
- Dispositivo/tamaño 2: ____________________
- Resultado tamaño 2: ______________________

## Pruebas finales obligatorias antes de entregar

1. Login real y acceso al listado.
2. Abrir detalle usando el parámetro de ruta.
3. Registrar un vehículo real y comprobar que aparece en Laravel/listado.
4. Botón físico de retroceso: después de iniciar sesión no debe regresar al login.
5. Cerrar sesión: debe eliminar el token y regresar al login.
6. Forzar una respuesta 401 y comprobar la redirección al login.
7. Cargar listado online, cortar la conexión y confirmar caché + aviso de desactualización + marca de tiempo.
8. Recuperar la conexión y refrescar el listado.
9. Geolocalización con permiso concedido.
10. Geolocalización con permiso denegado y caso en que Android ya no vuelve a mostrar el diálogo.
11. Probar dos tamaños de pantalla y revisar áreas seguras.

## Guion mínimo para el video

1. Abrir la app e iniciar sesión.
2. Mostrar el listado real de vehículos.
3. Abrir un vehículo y enseñar su detalle.
4. Usar **Obtener ubicación actual** y mostrar el permiso/resultado.
5. Abrir **Registrar vehículo** y completar una operación de escritura.
6. Desactivar conectividad, volver al listado y mostrar la caché con su marca de tiempo.
7. Recuperar conexión y refrescar el listado.

El video final no debe superar tres minutos.
