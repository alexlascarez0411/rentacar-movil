
import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import {
    isAuthenticated,
    restoreSession,
    setLoginRedirect
} from '@/services/auth';

// Rutas de la aplicación
const routes: RouteRecordRaw[] = [

    {
        path: '/',
        redirect: '/login'
    },

    {
        path: '/login',
        component: () => import('@/views/LoginPage.vue')
    },

    {
        path: '/vehiculos',
        component: () => import('@/views/VehiculoPage.vue'),
        meta: { requiresAuth: true }
    },

    {
        path: '/vehiculos/nuevo',
        component: () => import('@/views/VehiculoFormPage.vue'),
        meta: { requiresAuth: true }
    },

    {
        path: '/vehiculos/:id',
        component: () => import('@/views/VehiculoDetallePage.vue'),
        props: true,
        meta: { requiresAuth: true }
    }
];

// Crear el router
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
});

// Proteger las rutas privadas
router.beforeEach(async (to) => {

    await restoreSession();

    if (to.meta.requiresAuth && !isAuthenticated()) {
        return { path: '/login', replace: true };
    }

    if (to.path === '/login' && isAuthenticated()) {
        return { path: '/vehiculos', replace: true };
    }

    return true;
});

// Redirección cuando se cierra la sesión
setLoginRedirect(async () => {

    if (router.currentRoute.value.path !== '/login') {
        await router.replace('/login');
    }
});

export default router;
