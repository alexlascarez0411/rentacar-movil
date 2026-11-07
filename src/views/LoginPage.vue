
<template>
    <ion-page>

        <ion-header>
            <ion-toolbar>
                <ion-title>RentaCAR</ion-title>
            </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding">

            <div class="login-container">

                <ion-card>

                    <ion-card-header>

                        <ion-card-title>
                            Iniciar sesión
                        </ion-card-title>

                        <ion-card-subtitle>
                            Ingresa con tu cuenta de RentaCAR.
                        </ion-card-subtitle>

                    </ion-card-header>

                    <ion-card-content>

                        <form
                            novalidate
                            @submit.prevent="handleLogin"
                        >

                            <!-- Correo electrónico -->
                            <ion-input
                                v-model="email"
                                label="Correo electrónico"
                                label-placement="stacked"
                                type="email"
                                inputmode="email"
                                autocomplete="username"
                                autocapitalize="off"
                                fill="outline"
                                :disabled="loading"
                                :error-text="emailError"
                                :class="{
                                    'ion-invalid ion-touched': !!emailError
                                }"
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
                                    'ion-invalid ion-touched': !!passwordError
                                }"
                                class="input-field"
                            />

                            <!-- Mensajes de error -->
                            <ion-text
                                v-if="errorMessage"
                                color="danger"
                                role="alert"
                            >
                                <p>{{ errorMessage }}</p>
                            </ion-text>

                            <!-- Botón de login -->
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
                                    Ingresar
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

import { ref } from 'vue';
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

const router = useRouter();

// Datos del formulario.
const email = ref('');
const password = ref('');

// Estados de interfaz.
const emailError = ref('');
const passwordError = ref('');
const errorMessage = ref('');
const loading = ref(false);

// Procesar inicio de sesión.
async function handleLogin(): Promise<void> {

    // Limpiar mensajes anteriores.
    emailError.value = '';
    passwordError.value = '';
    errorMessage.value = '';

    const emailValue = email.value.trim();

    // Validar correo.
    if (!emailValue) {

        emailError.value =
            'El correo es obligatorio.';

    } else if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
    ) {

        emailError.value =
            'Ingresa un correo válido.';
    }

    // Validar contraseña.
    if (!password.value) {

        passwordError.value =
            'La contraseña es obligatoria.';
    }

    if (
        emailError.value ||
        passwordError.value
    ) {
        return;
    }

    loading.value = true;

    try {

        // Autenticar con Laravel.
        await login(
            emailValue,
            password.value
        );

        // Limpiar contraseña.
        password.value = '';

        // Abrir listado sin regresar al login.
        await router.replace('/vehiculos');

    } catch (error) {

        if (error instanceof ApiError) {

            // Laravel devuelve 422 cuando
            // las credenciales son incorrectas.
            if (error.status === 422) {

                emailError.value =
                    error.fieldErrors.email?.[0] ?? '';

                passwordError.value =
                    error.fieldErrors.password?.[0] ?? '';
            }

            // Otros errores HTTP.
            if (
                !emailError.value &&
                !passwordError.value
            ) {

                errorMessage.value = error.message;
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

</style>
