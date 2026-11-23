# Laboratorio 14 - Publicación móvil

## Configuración por entornos

La aplicación móvil utiliza configuraciones separadas para desarrollo y producción mediante la variable de entorno `VITE_API_BASE_URL`.

Para desarrollo local se utiliza:

`http://10.0.2.2:8000/api`

Para producción se utiliza:

`https://rentacar-web-production.up.railway.app/api`

Los archivos `.env` reales no se almacenan en el repositorio. Únicamente se incluyen archivos `.example` como referencia de configuración.

## Seguridad de producción

La versión de producción utiliza únicamente la API pública mediante HTTPS.

El archivo principal `AndroidManifest.xml` desactiva el tráfico HTTP sin cifrar mediante:

`android:usesCleartextTraffic="false"`

Para desarrollo existe un manifiesto específico dentro de `src/debug`, el cual permite tráfico HTTP únicamente durante pruebas locales.

También se configuró `.gitignore` para evitar que se versionen archivos `.env`, keystores y otros archivos sensibles.

## Compilación de producción

La aplicación Ionic/Vue fue compilada correctamente mediante:

`npm.cmd run build`

El proceso finalizó correctamente y generó los archivos optimizados dentro de `dist`.

Se verificó posteriormente que el bundle de producción contiene la dirección:

`https://rentacar-web-production.up.railway.app/api`

También se comprobó que la dirección local `10.0.2.2` no aparece dentro del bundle final de producción.

## Sincronización con Android

Después de generar el build de producción se realizó la sincronización con Capacitor mediante:

`npx.cmd cap sync android`

La sincronización terminó correctamente y los archivos web de producción fueron copiados al proyecto Android.

## Firma del APK

Se creó un keystore independiente para la versión release de RentaCar.

La configuración de firma utiliza variables de entorno y las credenciales no se almacenan dentro del código fuente ni dentro del repositorio.

Variables utilizadas:

- `RENTACAR_KEYSTORE_PATH`
- `RENTACAR_KEYSTORE_PASSWORD`
- `RENTACAR_KEY_ALIAS`
- `RENTACAR_KEY_PASSWORD`

El alias utilizado para la firma es:

`rentacar-release`

El APK se generó mediante:

`gradlew clean assembleRelease`

La compilación finalizó con:

`BUILD SUCCESSFUL`

## Verificación de firma

El APK fue verificado mediante `apksigner`.

Resultado principal:

`Verified using v2 scheme (APK Signature Scheme v2): true`

Cantidad de firmantes:

`1`

Algoritmo utilizado:

`RSA`

Tamaño de la llave:

`2048 bits`

SHA-256 del certificado:

`9adfdf4282fc88a40145d5b27887486afa23cb5c31842202a22e5939a0598697`

Esto confirma que el APK release generado está firmado correctamente.

## Artefacto generado

Archivo:

`app-release.apk`

Tamaño aproximado:

`4,23 MB`

Ruta generada durante la compilación:

`android/app/build/outputs/apk/release/app-release.apk`

El APK generado no se almacena obligatoriamente en Git debido a que es un artefacto compilado.

## Instalación en Android

El APK release fue instalado y ejecutado en el emulador Android:

`Medium_Phone`

La instalación finalizó correctamente mediante ADB.

La aplicación abrió normalmente y mostró la pantalla de inicio de sesión.

## Pruebas contra producción

Se comprobó la conectividad desde el emulador hacia:

`rentacar-web-production.up.railway.app`

La prueba de conectividad respondió sin pérdida de paquetes.

Posteriormente se realizaron pruebas funcionales utilizando un usuario válido de producción proporcionado por el equipo.

El inicio de sesión se realizó correctamente desde el APK release.

Después del inicio de sesión se cargó la pantalla de vehículos.

Desde la aplicación se registró correctamente un vehículo de prueba con los siguientes datos principales:

- Marca: Toyota
- Modelo: Corolla
- Placa: A1333
- Año: 2026
- Kilometraje: 111 km
- Categoría: Sedán
- Estado: Disponible

La aplicación confirmó el registro mediante el mensaje:

`Registro exitoso`

Después del registro se consultó el detalle del vehículo y se verificó que los datos almacenados fueran correctos.

Finalmente se regresó al listado y el vehículo Toyota Corolla apareció correctamente, confirmando que la información fue almacenada y posteriormente recuperada desde la base de datos de producción.

## Resultado final

La publicación móvil del Laboratorio 14 quedó validada con:

- configuración separada para desarrollo y producción;
- API pública mediante HTTPS;
- exclusión de credenciales y archivos sensibles del repositorio;
- build de producción correcto;
- sincronización correcta con Capacitor;
- APK release firmado;
- firma APK verificada;
- instalación correcta en Android;
- conexión correcta con Railway;
- inicio de sesión funcional;
- creación de información en producción;
- consulta de detalle;
- persistencia comprobada mediante el listado final.

La versión móvil quedó preparada para ser entregada como artefacto de distribución del Laboratorio 14.SS