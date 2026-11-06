
<template>
    <ion-page>

        <ion-header>
            <ion-toolbar>
                <ion-title>RentaCar - Iniciar sesión</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">

            <div class="login-container">

                <ion-card>

                    <ion-card-header>
                        <ion-card-title>
                            Bienvenido
                        </ion-card-title>

                        <ion-card-subtitle>
                            Ingresa tus credenciales para continuar.
                        </ion-card-subtitle>
                    </ion-card-header>

                    <ion-card-content>

                        <form
                            novalidate
                            @submit.prevent="handleLogin"
                        >

                            <!-- Usuario o correo -->
                            <ion-input
                                v-model="identifier"
                                :label="identifierLabel"
                                label-placement="stacked"
                                :type="identifierType"
                                autocomplete="username"
                                autocapitalize="off"
                                fill="outline"
                                :disabled="loading"
                                :error-text="identifierError"
                                :class="{
                                    'ion-invalid ion-touched': identifierError
                                }"
                                required
                                class="input-field"
                            />

                            <!-- Contraseña -->
                            <ion-input
                                v-model="password"
                                label="Contraseña"
                                label-placement="stacked"
                                type="password"
                                autocomplete="current-password"
                                fill="outline"
                                :disabled="loading"
                                :error-text="passwordError"
                                :class="{
                                    'ion-invalid ion-touched': passwordError
                                }"
                                required
                                class="input-field"
                            />

                            <!-- Mensaje de error -->
                            <ion-text
                                v-if="errorMessage"
                                color="danger"
                                role="alert"
                            >
                                <p>{{ errorMessage }}</p>
                            </ion-text>

                            <!-- Botón de ingreso -->
                            <ion-button
                                type="submit"
                                expand="block"
                                :disabled="loading"
                                class="login-button"
                            >

                                <ion-spinner
                                    v-if="loading"
                                    name="crescent"
                                />

                                <span v-else>
                                    Iniciar sesión
                                </span>

                            </ion-button>

                        </form>

                    </ion-card-content>

                </ion-card>

            </div>

        </ion-content>

    </ion-page>
</template>

<script setup lang="ts">

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonInput,
    IonButton,
    IonText,
    IonSpinner
} from '@ionic/vue';

import { login } from '@/services/auth';
import { ApiError } from '@/services/api';
import { apiConfig } from '@/config/apiConfig';

const router = useRouter();

// Datos del formulario
const identifier = ref('');
const password = ref('');

// Estados de la interfaz
const loading = ref(false);
const identifierError = ref('');
const passwordError = ref('');
const errorMessage = ref('');

// Configurar el campo según la API
const identifierLabel = computed(() =>
    apiConfig.identifierField === 'email'
        ? 'Correo electrónico'
        : 'Usuario'
);

const identifierType = computed(() =>
    apiConfig.identifierField === 'email'
        ? 'email'
        : 'text'
);

// Procesar el inicio de sesión
async function handleLogin(): Promise<void> {

    identifierError.value = '';
    passwordError.value = '';
    errorMessage.value = '';

    const loginId = identifier.value.trim();

    // Validaciones del formulario
    if (!loginId) {
        identifierError.value =
            `${identifierLabel.value} es obligatorio.`;
    }

    if (!password.value) {
        passwordError.value =
            'La contraseña es obligatoria.';
    }

    if (
        identifierError.value ||
        passwordError.value
    ) {
        return;
    }

    loading.value = true;

    try {

        await login(loginId, password.value);

        // Limpiar contraseña después de autenticarse
        password.value = '';

        // Reemplazar el login en el historial
        await router.replace('/vehiculos');

    } catch (error: unknown) {

        if (error instanceof ApiError) {

            if (error.status === 401) {

                errorMessage.value =
                    'Usuario o contraseña incorrectos.';

            } else {

                // Errores de validación devueltos por la API
                identifierError.value =
                    error.fieldErrors[
                        apiConfig.identifierField
                    ]?.[0] ?? '';

                passwordError.value =
                    error.fieldErrors.password?.[0] ?? '';

                if (
                    !identifierError.value &&
                    !passwordError.value
                ) {
                    errorMessage.value = error.message;
                }
            }

        } else {

            errorMessage.value =
                error instanceof Error
                    ? error.message
                    : 'No se pudo iniciar sesión.';
        }

    } finally {

        loading.value = false;
    }
}

</script>

<style scoped>

.login-container {
    min-height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 0 28px;
}

ion-card {
    width: 100%;
    max-width: 440px;
    margin: 0;
}

.input-field {
    margin-top: 18px;
}

.login-button {
    margin-top: 24px;
}

ion-spinner {
    width: 22px;
    height: 22px;
}

</style>
