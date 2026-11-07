<template>
  <ion-page>
    <ion-header>
      <ion-toolbar><ion-title>Vehículos</ion-title></ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="recargar">
        <ion-refresher-content />
      </ion-refresher>

      <p v-if="cargando" role="status">
        <ion-spinner aria-hidden="true" />
        Cargando vehículos…
      </p>
      <div v-else-if="fallo" role="alert">
        <p>{{ fallo.mensaje }}</p>
        <ion-button @click="cargarPagina(fallo.pagina)">Reintentar</ion-button>
      </div>
      <p v-else-if="paginaActual && !vehiculos.length">No hay vehículos disponibles.</p>

      <ion-list v-if="vehiculos.length">
        <ion-item v-for="vehiculo in vehiculos" :key="vehiculo.id" :router-link="`/vehiculos/${vehiculo.id}`" detail>
          <ion-label class="ion-text-wrap">
            <h2>{{ vehiculo.marca }} {{ vehiculo.modelo }}</h2>
            <p>Placa {{ vehiculo.placa }} · Año {{ vehiculo.anno }}</p>
            <p>{{ formatoPrecio.format(vehiculo.precio_diario) }} por día</p>
            <p>Estado: {{ vehiculo.estado ?? 'Sin especificar' }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <ion-button
        v-if="paginaActual < ultimaPagina && !fallo"
        expand="block"
        :disabled="cargando"
        @click="cargarPagina(paginaActual + 1)"
      >
        Cargar más
      </ion-button>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  onIonViewWillLeave,
} from '@ionic/vue';
import type { RefresherCustomEvent } from '@ionic/vue';
import { onBeforeUnmount, ref } from 'vue';

import { api, ApiError } from '@/services/api';

interface VehiculoListado {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anno: number;
  precio_diario: number;
  estado: string | null;
}

interface PaginaVehiculos {
  data: VehiculoListado[];
  meta: { current_page: number; last_page: number; total: number };
}

const vehiculos = ref<VehiculoListado[]>([]);
const paginaActual = ref(0);
const ultimaPagina = ref(0);
const cargando = ref(false);
const fallo = ref<{ pagina: number; mensaje: string } | null>(null);
const formatoPrecio = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' });
let solicitudActiva: AbortController | undefined;

function cancelarSolicitud() {
  solicitudActiva?.abort();
  solicitudActiva = undefined;
  cargando.value = false;
}

async function cargarPagina(pagina: number) {
  if (solicitudActiva && pagina !== 1) return;

  solicitudActiva?.abort();
  const solicitud = new AbortController();
  solicitudActiva = solicitud;
  cargando.value = true;
  fallo.value = null;

  try {
    const { data, meta } = await api.get<PaginaVehiculos>(`/vehiculos?page=${pagina}&limit=10`, {
      signal: solicitud.signal,
    });
    if (solicitudActiva !== solicitud) return;

    const acumulados = new Map(pagina === 1 ? [] : vehiculos.value.map((vehiculo) => [vehiculo.id, vehiculo] as const));
    for (const vehiculo of data) acumulados.set(vehiculo.id, vehiculo);

    paginaActual.value = meta.current_page;
    ultimaPagina.value = meta.last_page;
    vehiculos.value = [...acumulados.values()];
  } catch (error) {
    if (solicitudActiva !== solicitud) return;
    fallo.value = {
      pagina,
      mensaje: error instanceof ApiError ? error.message : 'No se pudieron cargar los vehículos.',
    };
  } finally {
    if (solicitudActiva === solicitud) {
      solicitudActiva = undefined;
      cargando.value = false;
    }
  }
}

async function recargar(evento: RefresherCustomEvent) {
  try {
    await cargarPagina(1);
  } finally {
    await evento.target.complete();
  }
}

onIonViewWillEnter(() => {
  if (!paginaActual.value) void cargarPagina(1);
});
onIonViewWillLeave(cancelarSolicitud);
onBeforeUnmount(cancelarSolicitud);
</script>
