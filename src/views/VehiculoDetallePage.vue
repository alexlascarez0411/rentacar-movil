<template>
  <ion-page>

    <!-- Encabezado -->
    <ion-header>
      <ion-toolbar>

        <ion-buttons slot="start">
          <ion-back-button
            default-href="/vehiculos"
            text="Volver"
          />
        </ion-buttons>

        <ion-title>Detalle del Vehículo</ion-title>

      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <!-- Cargando -->
      <div v-if="cargando" class="estado-centro">
        <ion-spinner name="crescent" />
        <p>Cargando información del vehículo...</p>
      </div>

      <!-- Error -->
      <div v-else-if="errorMensaje" class="estado-centro">

        <ion-text color="danger">
          <h3>No se pudo cargar el vehículo</h3>
          <p>{{ errorMensaje }}</p>
        </ion-text>

        <ion-button
          expand="block"
          @click="cargarVehiculo"
        >
          Reintentar
        </ion-button>

        <ion-button
          fill="outline"
          expand="block"
          router-link="/vehiculos"
          router-direction="back"
        >
          Volver al listado
        </ion-button>

      </div>

      <!-- Datos del vehículo -->
      <ion-card v-else-if="vehiculo">

        <ion-card-header>

          <ion-card-title>
            {{ vehiculo.marca }} {{ vehiculo.modelo }}
          </ion-card-title>

          <ion-card-subtitle>
            Placa: {{ vehiculo.placa }}
          </ion-card-subtitle>

        </ion-card-header>

        <ion-card-content>

          <ion-list>

            <ion-item>
              <ion-label>
                <h2>Identificador</h2>
                <p>{{ vehiculo.id }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Marca</h2>
                <p>{{ vehiculo.marca }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Modelo</h2>
                <p>{{ vehiculo.modelo }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Año</h2>
                <p>{{ vehiculo.anno }}</p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Kilometraje</h2>
                <p>
                  {{ formatearNumero(vehiculo.kilometraje) }}
                  km
                </p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Precio diario</h2>
                <p>
                  {{ formatearPrecio(vehiculo.precio_diario) }}
                </p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Categoría</h2>
                <p>
                  {{ vehiculo.categoria ?? 'No disponible' }}
                </p>
              </ion-label>
            </ion-item>

            <ion-item>
              <ion-label>
                <h2>Estado</h2>
                <ion-badge
                  :color="
                    vehiculo.estado === 'Disponible'
                      ? 'success'
                      : 'medium'
                  "
                >
                  {{ vehiculo.estado ?? 'No disponible' }}
                </ion-badge>
              </ion-label>
            </ion-item>

          </ion-list>

          <ion-button
            expand="block"
            class="boton-actualizar"
            @click="cargarVehiculo"
          >
            Actualizar información
          </ion-button>

        </ion-card-content>

      </ion-card>

    </ion-content>

  </ion-page>
</template>

<script setup lang="ts">

import { ref, watch } from 'vue';

import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonButton,
  IonSpinner,
  IonText
} from '@ionic/vue';

import {
  obtenerVehiculo,
  type Vehiculo
} from '@/services/vehiculos';

import { ApiError } from '@/services/api';

// Recibir el ID desde /vehiculos/:id
const props = defineProps<{
  id: string;
}>();

// Variables de la pantalla
const vehiculo = ref<Vehiculo | null>(null);
const cargando = ref(false);
const errorMensaje = ref('');

// Evitar mostrar respuestas de una consulta anterior
let consultaActual = 0;

// Consultar vehículo en Laravel
async function cargarVehiculo(): Promise<void> {

  const consulta = ++consultaActual;

  cargando.value = true;
  errorMensaje.value = '';
  vehiculo.value = null;

  try {

    const id = Number(props.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error('El identificador del vehículo no es válido.');
    }

    const resultado = await obtenerVehiculo(id);

    if (consulta !== consultaActual) return;

    vehiculo.value = resultado;

  } catch (error) {

    if (consulta !== consultaActual) return;

    if (error instanceof ApiError) {

      switch (error.status) {

        case 0:
          errorMensaje.value =
            'No hay conexión con el servidor.';
          break;

        case 401:
          errorMensaje.value =
            'Tu sesión ha expirado.';
          break;

        case 403:
          errorMensaje.value =
            'No tienes permisos para consultar este vehículo.';
          break;

        case 404:
          errorMensaje.value =
            'El vehículo solicitado no existe.';
          break;

        default:
          errorMensaje.value = error.message;
      }

    } else {

      errorMensaje.value =
        error instanceof Error
          ? error.message
          : 'Ocurrió un error inesperado.';
    }

  } finally {

    if (consulta === consultaActual) {
      cargando.value = false;
    }

  }
}

// Formatear números
function formatearNumero(valor: number): string {
  return new Intl.NumberFormat('es-CR').format(valor);
}

// Formatear precio diario en colones
function formatearPrecio(valor: number): string {

  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 2
  }).format(valor);
}

// Cargar al abrir y cuando cambie el ID
watch(
  () => props.id,
  () => {
    void cargarVehiculo();
  },
  { immediate: true }
);

</script>

<style scoped>

.estado-centro {
  min-height: 55vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}

.estado-centro ion-spinner {
  width: 42px;
  height: 42px;
}

.estado-centro ion-button {
  width: 100%;
  max-width: 320px;
}

ion-card {
  max-width: 650px;
  margin: 16px auto;
}

ion-card-title {
  font-size: 22px;
  font-weight: 600;
}

ion-item {
  --padding-start: 4px;
}

ion-item h2 {
  font-weight: 600;
  margin-bottom: 6px;
}

ion-item p {
  font-size: 15px;
}

ion-badge {
  margin-top: 8px;
  padding: 8px 12px;
}

.boton-actualizar {
  margin-top: 24px;
  margin-bottom: 12px;
}

</style>
