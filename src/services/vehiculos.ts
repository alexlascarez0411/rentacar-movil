import { api } from '@/services/api';

// Datos de un vehículo
export interface Vehiculo {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anno: number;
  kilometraje: number;
  categoria_id: number;
  estado_id: number;
  categoria?: string | null;
  estado?: string | null;
}

// Datos de las categorías
export interface CategoriaVehiculo {
  id: number;
  nombre: string;
}

// Datos de los estados
export interface EstadoVehiculo {
  id: number;
  nombre: string;
}

// Catálogos proporcionados por Laravel
export interface CatalogoVehiculos {
  categorias: CategoriaVehiculo[];
  estados: EstadoVehiculo[];
}

// Campos para registrar vehículos
export interface NuevoVehiculo {
  placa: string;
  marca: string;
  modelo: string;
  anno: number;
  kilometraje: number;
  categoria_id: number;
}

// Respuesta de Laravel Resource
interface RespuestaApi<T> {
  data: T;
}

// Obtener el detalle de un vehículo
// GET /api/vehiculos/{id}
export async function obtenerVehiculo(
  id: number
): Promise<Vehiculo> {

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('El ID del vehículo no es válido.');
  }

  const respuesta = await api.get<RespuestaApi<Vehiculo>>(
    `/vehiculos/${id}`
  );

  return respuesta.data;
}

// Obtener categorías y estados
// GET /api/catalogos/vehiculos
export async function obtenerCatalogosVehiculos():
  Promise<CatalogoVehiculos> {

  return await api.get<CatalogoVehiculos>(
    '/catalogos/vehiculos'
  );
}

// Registrar un vehículo nuevo
// POST /api/vehiculos
export async function registrarVehiculo(
  datos: NuevoVehiculo
): Promise<Vehiculo> {

  const respuesta = await api.post<RespuestaApi<Vehiculo>>(
    '/vehiculos',
    datos
  );

  return respuesta.data;
}