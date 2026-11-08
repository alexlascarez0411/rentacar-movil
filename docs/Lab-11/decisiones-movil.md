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

La geolocalización se implementó separando responsabilidades:

- `src/services/geolocation.ts`: permisos, consulta al plugin y normalización de errores.
- `src/components/UbicacionActual.vue`: interfaz reutilizable, estados de carga/error y presentación de coordenadas.
- `src/views/VehiculoDetallePage.vue`: incorpora el componente sin mezclar la lógica de hardware con la consulta del vehículo.

## Áreas seguras y tamaños de pantalla

Las vistas están construidas con `ion-page`, `ion-header`, `ion-toolbar` e `ion-content`, permitiendo que Ionic gestione las áreas seguras del dispositivo. La evidencia final debe probarse al menos en dos tamaños de pantalla diferentes en Android Studio.

Registrar para la entrega:

- Dispositivo/tamaño 1: ____________________
- Dispositivo/tamaño 2: ____________________
- Resultado: _______________________________

## Guion mínimo para el video

1. Abrir la app e iniciar sesión.
2. Mostrar el listado real de vehículos.
3. Abrir un vehículo y enseñar su detalle.
4. Usar **Obtener ubicación actual** y mostrar el permiso/resultado.
5. Mostrar brevemente el formulario de registro y una operación de escritura.
6. Desactivar conectividad, volver al listado y mostrar la caché con su marca de tiempo.
7. Recuperar conexión y refrescar el listado.

El video final no debe superar tres minutos.
