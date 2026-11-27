export enum TipoEvaluacion {
  EXAMEN = 'Examen',
  TRABAJO_PRACTICO = 'Trabajo práctico',
  ORAL = 'Oral',
  RECUPERATORIO = 'Recuperatorio',
}

export enum ModeloCalificacion {
  CUANTITATIVO = 'cuantitativo',
  CUALITATIVO = 'cualitativo',
}

export enum ModoRecuperatorio {
  MAYOR = 'mayor',
  PROMEDIO = 'promedio',
}

export const CATEGORIAS_CUALITATIVAS = [
  'Muy bueno',
  'Bueno',
  'Regular',
  'Insuficiente',
] as const;

export const EQUIVALENCIAS_CUALITATIVAS: Record<string, number> = {
  'Muy bueno': 10,
  Bueno: 8,
  Regular: 6,
  Insuficiente: 3,
};
