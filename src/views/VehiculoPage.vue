<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Vehículos</ion-title>
        <ion-buttons slot="end">
          <ion-button
            v-if="puedeRegistrar"
            router-link="/vehiculos/nuevo"
            :disabled="cerrandoSesion"
          >
            Registrar
          </ion-button>
          <ion-button :disabled="cerrandoSesion" @click="cerrarSesion">
            {{ cerrandoSesion ? 'Saliendo…' : 'Cerrar sesión' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
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

      <div v-if="motivoOffline" role="status">
        <p>{{ motivoOffline }}</p>
        <p v-if="actualizadoEn !== null">
          Información desactualizada. Última actualización: {{ formatoFecha.format(actualizadoEn) }}.
        </p>
        <p v-else>No hay información disponible sin conexión.</p>
        <ion-button v-if="conectado !== false && !cargando" @click="cargarPagina(1)"> Reintentar </ion-button>
      </div>

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
        v-if="paginaActual < ultimaPagina && !fallo && !motivoOffline"
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
  IonButtons,
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
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { api, ApiError } from '@/services/api';

import { useNetwork } from '@/composables/useNetwork';
import { hasRole, isAuthenticated, logout, session } from '@/services/auth';
import {
  eliminarCacheVehiculos,
  guardarCacheVehiculos,
  leerCacheVehiculos,
  obtenerClaveCacheVehiculos,
} from '@/services/cacheVehiculos';
import type { CacheVehiculos, PaginaVehiculos, VehiculoListado } from '@/services/cacheVehiculos';

const vehiculos = ref<VehiculoListado[]>([]);
const paginaActual = ref(0);
const ultimaPagina = ref(0);
const cargando = ref(false);
const fallo = ref<{ pagina: number; mensaje: string } | null>(null);
const formatoPrecio = new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' });
const formatoFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeStyle: 'short' });
const actualizadoEn = ref<number | null>(null);
const motivoOffline = ref('');
const conectado = ref<boolean>();
const cerrandoSesion = ref(false);
const puedeRegistrar = computed(() =>
  hasRole('Admin_General') || hasRole('Admin_Inventarios'),
);
let visible = false;
let claveMostrada: string | null = null;
let solicitudActiva: AbortController | undefined;

function cancelarSolicitud() {
  solicitudActiva?.abort();
  solicitudActiva = undefined;
  cargando.value = false;
}

function limpiarListado() {
  vehiculos.value = [];
  paginaActual.value = 0;
  ultimaPagina.value = 0;
  actualizadoEn.value = null;
  motivoOffline.value = '';
  fallo.value = null;
  claveMostrada = null;
}

function mostrarListado(cache: CacheVehiculos, clave: string | null) {
  vehiculos.value = cache.data;
  paginaActual.value = cache.meta.current_page;
  ultimaPagina.value = cache.meta.last_page;
  actualizadoEn.value = cache.actualizadoEn;
  claveMostrada = clave;
}

function mostrarSinServidor(clave: string | null) {
  const cache = leerCacheVehiculos(clave);
  if (cache && (actualizadoEn.value === null || cache.actualizadoEn > actualizadoEn.value)) {
    mostrarListado(cache, clave);
  }
  motivoOffline.value = conectado.value === false ? 'Dispositivo sin conexión.' : 'El servidor Laravel no responde.';
}

async function cargarPagina(pagina: number) {
  if (!visible || (solicitudActiva && pagina !== 1)) return;
  if (!isAuthenticated()) {
    cancelarSolicitud();
    limpiarListado();
    return;
  }

  solicitudActiva?.abort();
  const solicitud = new AbortController();
  solicitudActiva = solicitud;
  cargando.value = true;
  fallo.value = null;
  const vigente = () => solicitudActiva === solicitud && isAuthenticated();

  let clave: string | null = null;
  try {
    clave = await obtenerClaveCacheVehiculos();
    if (!vigente()) return;
    if (clave !== claveMostrada) {
      limpiarListado();
      pagina = 1;
    }
    if (conectado.value === false) {
      mostrarSinServidor(clave);
      return;
    }

    const { data, meta } = await api.get<PaginaVehiculos>(`/vehiculos?page=${pagina}&limit=10`, {
      signal: solicitud.signal,
    });
    if (!vigente()) return;

    if (clave !== null) {
      const claveActual = await obtenerClaveCacheVehiculos();
      if (!vigente()) return;
      if (claveActual !== clave) {
        limpiarListado();
        return;
      }
    }

    const acumulados = new Map(pagina === 1 ? [] : vehiculos.value.map((vehiculo) => [vehiculo.id, vehiculo] as const));
    for (const vehiculo of data) acumulados.set(vehiculo.id, vehiculo);

    const cache = { data: [...acumulados.values()], meta, actualizadoEn: Date.now() };
    mostrarListado(cache, clave);
    motivoOffline.value = '';
    guardarCacheVehiculos(clave, cache);
  } catch (error) {
    if (!vigente()) return;
    if (error instanceof ApiError) {
      if (error.status === 0) {
        mostrarSinServidor(clave);
        return;
      }
      if (error.status === 401 || error.status === 403) {
        eliminarCacheVehiculos(clave);
        limpiarListado();
        pagina = 1;
      }
    }
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

async function cerrarSesion(): Promise<void> {
  if (cerrandoSesion.value) return;

  cerrandoSesion.value = true;
  try {
    await logout();
  } finally {
    cerrandoSesion.value = false;
  }
}

const red = useNetwork((estado) => {
  conectado.value = estado;
  void cargarPagina(1);
});

watch(
  [() => session.user?.id, () => session.status === 'guest' || session.status === 'checking'],
  () => {
    cancelarSolicitud();
    limpiarListado();
    if (visible) void cargarPagina(1);
  },
  { flush: 'sync' },
);

onIonViewWillEnter(() => {
  visible = true;
  void red.iniciar();
});

function salir() {
  visible = false;
  red.detener();
  cancelarSolicitud();
}

onIonViewWillLeave(salir);
onBeforeUnmount(salir);
</script>
