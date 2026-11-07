<template>
    <ion-page>
        <ion-header>
            <ion-toolbar>
                <ion-title>Detalle del Vehículo</ion-title>
            </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
            <!-- La visualización de datos corresponde a otro integrante. -->
        </ion-content>
    </ion-page>
</template>

<script setup lang="ts">
// Importación de componentes base de Ionic.
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/vue';

// Definición de parámetros recibidos por la URL.
const props = defineProps<{
    id: string;
}>();
</script>