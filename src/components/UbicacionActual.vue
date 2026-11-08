<template>
  <ion-card class="ubicacion-card">
    <ion-card-header>
      <ion-card-title>Mi ubicación actual</ion-card-title>
      <ion-card-subtitle>
        Consulta la ubicación del dispositivo como referencia al revisar el vehículo.
      </ion-card-subtitle>
    </ion-card-header>

    <ion-card-content>
      <div v-if="cargando" class="estado-ubicacion" aria-live="polite">
        <ion-spinner name="crescent" />
        <p>Obteniendo ubicación...</p>
      </div>

      <ion-list v-else-if="ubicacion">
        <ion-item>
          <ion-label>
            <h2>Latitud</h2>
            <p>{{ ubicacion.latitude.toFixed(6) }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h2>Longitud</h2>
            <p>{{ ubicacion.longitude.toFixed(6) }}</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h2>Precisión aproximada</h2>
            <p>{{ Math.round(ubicacion.accuracy) }} m</p>
          </ion-label>
        </ion-item>
        <ion-item>
          <ion-label>
            <h2>Consultada</h2>
            <p>{{ fechaUbicacion }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-text v-if="mensajeError" color="danger" role="alert">
        <p class="mensaje-error">{{ mensajeError }}</p>
      </ion-text>

      <ion-note v-if="permisoDenegado" color="medium" class="ayuda-permiso">
        Si seleccionaste “No volver a preguntar”, Android no mostrará de nuevo el permiso.
        Activá Ubicación desde Ajustes &gt; Apps &gt; RentaCar &gt; Permisos y volvé a intentarlo.
      </ion-note>

      <ion-button
        expand="block"
        :disabled="cargando"
        @click="consultarUbicacion"
      >
        <ion-icon slot="start" :icon="locationOutline" />
        {{ ubicacion ? 'Actualizar ubicación' : 'Obtener ubicación actual' }}
      </ion-button>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
} from '@ionic/vue';
import { locationOutline } from 'ionicons/icons';

import {
  obtenerUbicacionActual,
  UbicacionError,
  type UbicacionActual,
} from '@/services/geolocation';

const ubicacion = ref<UbicacionActual | null>(null);
const cargando = ref(false);
const mensajeError = ref('');
const permisoDenegado = ref(false);

const fechaUbicacion = computed(() => {
  if (!ubicacion.value) return '';
  return new Intl.DateTimeFormat('es-CR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(ubicacion.value.timestamp));
});

async function consultarUbicacion(): Promise<void> {
  cargando.value = true;
  mensajeError.value = '';
  permisoDenegado.value = false;

  try {
    ubicacion.value = await obtenerUbicacionActual();
  } catch (error) {
    ubicacion.value = null;

    if (error instanceof UbicacionError) {
      mensajeError.value = error.message;
      permisoDenegado.value = error.codigo === 'PERMISO_DENEGADO';
    } else {
      mensajeError.value = 'Ocurrió un error inesperado al consultar la ubicación.';
    }
  } finally {
    cargando.value = false;
  }
}
</script>

<style scoped>
.ubicacion-card {
  max-width: 650px;
  margin: 16px auto;
}

.estado-ubicacion {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.mensaje-error {
  margin: 12px 0;
}

.ayuda-permiso {
  display: block;
  margin: 12px 0 16px;
  line-height: 1.45;
}

ion-button {
  margin-top: 16px;
}
</style>
