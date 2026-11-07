<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { App as CapacitorApp } from '@capacitor/app';

const ionRouter = useIonRouter();

// Configuracion del botón fsico de retroceso en Android.
useBackButton(-1, () => {
  // Cierre de la aplicacion si no se detecta un historial de navegación hacia atras
  if (!ionRouter.canGoBack()) {
    CapacitorApp.exitApp();
  }
});
</script>