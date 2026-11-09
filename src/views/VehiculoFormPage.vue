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

        <ion-title>Registrar Vehículo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">

      <div class="contenedor">

        <!-- Usuario sin permisos -->
        <div v-if="!puedeRegistrar" class="estado-centro">
          <ion-text color="danger">
            <h2>Acceso restringido</h2>
            <p>
              No tienes permisos para registrar vehículos.
              Esta opción está disponible únicamente
              para administradores autorizados.
            </p>
          </ion-text>

          <ion-button
            expand="block"
            router-link="/vehiculos"
          >
            Volver al listado
          </ion-button>
        </div>

        <!-- Cargando categorías -->
        <div
          v-else-if="cargandoCatalogos"
          class="estado-centro"
        >
          <ion-spinner name="crescent" />
          <p>Cargando categorías...</p>
        </div>

        <!-- Error al consultar categorías -->
        <div v-else-if="errorCatalogos" class="estado-centro">

          <ion-text color="danger">
            <h3>No se pudieron cargar las categorías</h3>
            <p>{{ errorCatalogos }}</p>
          </ion-text>

          <ion-button
            expand="block"
            @click="cargarCatalogos"
          >
            Reintentar
          </ion-button>
        </div>

        <!-- Catálogo sin categorías -->
        <div
          v-else-if="categorias.length === 0"
          class="estado-centro"
        >
          <p>No hay categorías disponibles.</p>

          <ion-button @click="cargarCatalogos">
            Actualizar categorías
          </ion-button>
        </div>

        <!-- Formulario -->
        <ion-card v-else>

          <ion-card-header>
            <ion-card-title>
              Nuevo Vehículo
            </ion-card-title>

            <ion-card-subtitle>
              Completa los datos para registrar un
              vehículo en RentaCar.
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>

            <form @submit.prevent="guardarVehiculo" novalidate>

              <ion-list>

                <!-- Placa -->
                <ion-item>
                  <ion-input
                    label="Placa"
                    label-placement="stacked"
                    placeholder="Ejemplo: ABC123"
                    v-model="form.placa"
                    :maxlength="20"
                    required
                    @ionInput="limpiarError('placa')"
                  />
                </ion-item>

                <ion-note
                  v-if="errores.placa"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.placa }}
                </ion-note>

                <!-- Marca -->
                <ion-item>
                  <ion-input
                    label="Marca"
                    label-placement="stacked"
                    placeholder="Ejemplo: Toyota"
                    v-model="form.marca"
                    :maxlength="50"
                    required
                    @ionInput="limpiarError('marca')"
                  />
                </ion-item>

                <ion-note
                  v-if="errores.marca"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.marca }}
                </ion-note>

                <!-- Modelo -->
                <ion-item>
                  <ion-input
                    label="Modelo"
                    label-placement="stacked"
                    placeholder="Ejemplo: Corolla"
                    v-model="form.modelo"
                    :maxlength="50"
                    required
                    @ionInput="limpiarError('modelo')"
                  />
                </ion-item>

                <ion-note
                  v-if="errores.modelo"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.modelo }}
                </ion-note>

                <!-- Año -->
                <ion-item>
                  <ion-input
                    label="Año"
                    label-placement="stacked"
                    type="number"
                    inputmode="numeric"
                    placeholder="Ejemplo: 2025"
                    v-model="form.anno"
                    required
                    @ionInput="limpiarError('anno')"
                  />
                </ion-item>

                <ion-note
                  v-if="errores.anno"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.anno }}
                </ion-note>

                <!-- Kilometraje -->
                <ion-item>
                  <ion-input
                    label="Kilometraje inicial"
                    label-placement="stacked"
                    type="number"
                    inputmode="numeric"
                    placeholder="Ejemplo: 1500"
                    v-model="form.kilometraje"
                    required
                    @ionInput="limpiarError('kilometraje')"
                  />
                </ion-item>

                <ion-note
                  v-if="errores.kilometraje"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.kilometraje }}
                </ion-note>

                <!-- Categoría -->
                <ion-item>
                  <ion-select
                    label="Categoría"
                    label-placement="stacked"
                    placeholder="Seleccionar categoría"
                    interface="alert"
                    v-model="form.categoria_id"
                    @ionChange="limpiarError('categoria_id')"
                  >
                    <ion-select-option
                      v-for="categoria in categorias"
                      :key="categoria.id"
                      :value="categoria.id"
                    >
                      {{ categoria.nombre }}
                    </ion-select-option>
                  </ion-select>
                </ion-item>

                <ion-note
                  v-if="errores.categoria_id"
                  color="danger"
                  class="error-campo"
                >
                  {{ errores.categoria_id }}
                </ion-note>

              </ion-list>

              <!-- Error general del servidor -->
              <ion-text v-if="errorGeneral" color="danger">
                <p class="mensaje-error">
                  {{ errorGeneral }}
                </p>
              </ion-text>

              <!-- Guardar -->
              <ion-button
                expand="block"
                type="submit"
                class="boton-guardar"
                :disabled="guardando"
              >
                <ion-spinner
                  v-if="guardando"
                  name="crescent"
                  slot="start"
                />

                {{
                  guardando
                    ? 'Guardando vehículo...'
                    : 'Registrar Vehículo'
                }}
              </ion-button>

              <!-- Cancelar -->
              <ion-button
                expand="block"
                fill="outline"
                color="medium"
                router-link="/vehiculos"
                :disabled="guardando"
              >
                Cancelar
              </ion-button>

            </form>

          </ion-card-content>
        </ion-card>

      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

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
  IonInput,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonText,
  IonButton,
  IonSpinner,
  alertController,
  onIonViewWillEnter
} from '@ionic/vue';

import { ApiError } from '@/services/api';
import { hasRole } from '@/services/auth';

import {
  obtenerCatalogosVehiculos,
  registrarVehiculo,
  type CategoriaVehiculo,
  type NuevoVehiculo
} from '@/services/vehiculos';

// Navegación
const router = useRouter();

// Permisos
const puedeRegistrar = computed(() =>
  hasRole('Admin_General') ||
  hasRole('Admin_Inventarios')
);

// Estado de la pantalla
const categorias = ref<CategoriaVehiculo[]>([]);
const cargandoCatalogos = ref(false);
const guardando = ref(false);

const errorCatalogos = ref('');
const errorGeneral = ref('');

// Datos del formulario
const form = reactive({
  placa: '',
  marca: '',
  modelo: '',
  anno: String(new Date().getFullYear()),
  kilometraje: '',
  categoria_id: null as number | null
});

// Errores de validación
// (Nota: Si TypeScript da error aquí, debes eliminar "precio_diario"
// de la interfaz NuevoVehiculo en tu archivo @/services/vehiculos.ts)
const errores = reactive<Record<keyof NuevoVehiculo, string>>({
  placa: '',
  marca: '',
  modelo: '',
  anno: '',
  kilometraje: '',
  categoria_id: ''
});

// Limpiar un error específico
function limpiarError(campo: keyof NuevoVehiculo): void {
  errores[campo] = '';
  errorGeneral.value = '';
}

// Limpiar todos los errores
function limpiarErrores(): void {
  for (const campo of Object.keys(errores) as
    (keyof NuevoVehiculo)[]) {
    errores[campo] = '';
  }

  errorGeneral.value = '';
}

// Obtener un mensaje de error HTTP
function mensajeApi(error: unknown): string {

  if (error instanceof ApiError) {

    switch (error.status) {

      case 0:
        return 'No hay conexión con el servidor.';

      case 401:
        return 'Tu sesión ha expirado. Inicia sesión nuevamente.';

      case 403:
        return 'No tienes permisos para realizar esta operación.';

      case 409:
        return error.message;

      case 422:
        return 'Revisa los datos del formulario.';

      default:
        return error.message;
    }
  }

  return error instanceof Error
    ? error.message
    : 'Ocurrió un error inesperado.';
}

// GET /api/catalogos/vehiculos
async function cargarCatalogos(): Promise<void> {

  if (!puedeRegistrar.value) {
    return;
  }

  cargandoCatalogos.value = true;
  errorCatalogos.value = '';

  try {

    const respuesta = await obtenerCatalogosVehiculos();

    if (!Array.isArray(respuesta.categorias)) {
      throw new Error(
        'El servidor devolvió categorías no válidas.'
      );
    }

    categorias.value = respuesta.categorias;

  } catch (error) {

    categorias.value = [];
    errorCatalogos.value = mensajeApi(error);

  } finally {

    cargandoCatalogos.value = false;

  }
}

// Validación de campos
function validarFormulario(): boolean {

  limpiarErrores();

  let valido = true;

  const placa = form.placa.trim();
  const marca = form.marca.trim();
  const modelo = form.modelo.trim();

  const anno = Number(form.anno);
  const kilometraje = Number(form.kilometraje);

  const annoMaximo = new Date().getFullYear() + 1;

  // Placa
  if (!placa) {
    errores.placa = 'La placa es obligatoria.';
    valido = false;
  } else if (placa.length > 20) {
    errores.placa = 'Máximo 20 caracteres.';
    valido = false;
  }

  // Marca
  if (!marca) {
    errores.marca = 'La marca es obligatoria.';
    valido = false;
  } else if (marca.length > 50) {
    errores.marca = 'Máximo 50 caracteres.';
    valido = false;
  }

  // Modelo
  if (!modelo) {
    errores.modelo = 'El modelo es obligatorio.';
    valido = false;
  } else if (modelo.length > 50) {
    errores.modelo = 'Máximo 50 caracteres.';
    valido = false;
  }

  // Año
  if (
    form.anno === '' ||
    !Number.isInteger(anno) ||
    anno < 1900 ||
    anno > annoMaximo
  ) {
    errores.anno =
      `Ingresa un año entre 1900 y ${annoMaximo}.`;
    valido = false;
  }

  // Kilometraje
  if (
    form.kilometraje === '' ||
    !Number.isInteger(kilometraje) ||
    kilometraje < 0
  ) {
    errores.kilometraje =
      'Ingresa un kilometraje válido.';
    valido = false;

  } else if (kilometraje > 5000) {

    errores.kilometraje =
      'El kilometraje inicial no puede superar 5000 km.';
    valido = false;
  }

  // Categoría
  if (
    form.categoria_id === null ||
    !categorias.value.some(
      categoria =>
        categoria.id === Number(form.categoria_id)
    )
  ) {
    errores.categoria_id =
      'Selecciona una categoría válida.';
    valido = false;
  }

  return valido;
}

// POST /api/vehiculos
async function guardarVehiculo(): Promise<void> {

  // Evitar guardar varias veces
  if (guardando.value) {
    return;
  }

  // Verificar permisos
  if (!puedeRegistrar.value) {
    errorGeneral.value =
      'No tienes permisos para registrar vehículos.';
    return;
  }

  // Validación antes de enviar
  if (!validarFormulario()) {
    return;
  }

  guardando.value = true;

  try {

    const datos: NuevoVehiculo = {
      placa: form.placa.trim(),
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      anno: Number(form.anno),
      kilometraje: Number(form.kilometraje),
      categoria_id: Number(form.categoria_id)
    };

    // Guardar en Laravel
    const vehiculoCreado = await registrarVehiculo(datos);

    // Confirmación
    const alerta = await alertController.create({
      header: 'Registro exitoso',
      message:
        'El vehículo fue registrado correctamente en RentaCar.',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Ver listado',
          role: 'listado'
        },
        {
          text: 'Ver detalle',
          role: 'detalle'
        }
      ]
    });

    await alerta.present();

    const resultado = await alerta.onDidDismiss();

    if (resultado.role === 'detalle') {

      await router.replace(
        `/vehiculos/${vehiculoCreado.id}`
      );

    } else {

      // La marca de actualización será utilizada
      // por el listado del Integrante 3.
      await router.replace({
        path: '/vehiculos',
        query: {
          actualizar: String(Date.now())
        }
      });

    }

  } catch (error) {

    errorGeneral.value = mensajeApi(error);

    // Errores de validación reales de Laravel
    if (
      error instanceof ApiError &&
      error.status === 422
    ) {

      const erroresLaravel = error.fieldErrors;

      for (const campo of Object.keys(errores) as
        (keyof NuevoVehiculo)[]) {

        const mensajes = erroresLaravel[campo];

        if (mensajes && mensajes.length > 0) {
          errores[campo] = mensajes[0] ?? '';
        }
      }
    }

  } finally {

    guardando.value = false;

  }
}

// Al ingresar a la pantalla
onIonViewWillEnter(() => {

  if (puedeRegistrar.value) {
    void cargarCatalogos();
  }

});

</script>

<style scoped>

.contenedor {
  width: 100%;
  max-width: 650px;
  margin: 0 auto;
}

ion-card {
  margin: 12px 0;
}

ion-card-title {
  font-size: 22px;
  font-weight: 600;
}

ion-card-subtitle {
  margin-top: 8px;
}

ion-item {
  --padding-start: 8px;
  margin-top: 6px;
}

ion-input,
ion-select {
  min-height: 65px;
}

.error-campo {
  display: block;
  margin: 5px 12px 12px;
  font-size: 13px;
}

.mensaje-error {
  margin-top: 18px;
  padding: 12px;
  text-align: center;
}

.boton-guardar {
  margin-top: 24px;
  margin-bottom: 12px;
}

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

</style>