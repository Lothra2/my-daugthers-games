import type { CharId, EventId } from '../core/types';

/** All player-facing text. Short sentences a 7 year old can read, never humiliating. */
export const EVENT_INFO: Record<EventId, { name: string; line: string; hint: string; icon: string }> = {
  warmup: { name: 'Calentamiento', line: '¡Vamos a practicar un poquito!', hint: 'Sigue los pasos de Thor', icon: '🏃' },
  race: { name: 'Carrera del Bosque', line: '¡Corre, salta y nada hasta la meta!', hint: 'Elige tu camino. Los arcos guardan tu lugar', icon: '🌲' },
  circuit: { name: 'Circuito de Juegos', line: '¡Cuatro salas con troncos, hongos y plataformas!', hint: 'La ruta difícil da una estrella dorada', icon: '🎪' },
  pinata: { name: 'Piñata de Estrellas', line: '¡Salta y golpea la piñata para que caigan estrellas!', hint: 'Gana quien junte más estrellas', icon: '⭐' },
  arena: { name: 'Arena de Burbujas', line: '¡Empuja a los demás al agua de broma!', hint: 'Cada burbujazo vale un punto', icon: '🫧' },
};

export const CHAR_INFO: Record<CharId, { name: string; tag: string; power: string; powerLine: string; strength: string }> = {
  sophie: { name: 'Sophie', tag: 'Aventurera', power: 'Impulso arcoíris', powerLine: 'Sale disparada dejando un arcoíris', strength: 'Salta muy alto' },
  alana: { name: 'Alana', tag: 'Juguetona', power: 'Burbuja protectora', powerLine: 'Una burbuja que te cuida y te hace nadar rápido', strength: 'Nada rapidísimo' },
  papa: { name: 'Papá', tag: 'Entusiasta', power: 'Carga deportiva', powerLine: 'Embiste y despeja lo que se le cruce', strength: 'Lanza lejos y casi no lo empujan' },
  mama: { name: 'Mamá', tag: 'Elegante y decidida', power: 'Estrellas guía', powerLine: 'Tres estrellas que buscan a los demás', strength: 'Se levanta rapidísimo' },
  thor: { name: 'Thor', tag: 'Simpático y travieso', power: 'Carrera loca', powerLine: 'Corre súper rápido y recoge todo', strength: 'Muy veloz y recoge al pasar' },
};

export const EVENT_RESULT_MSG = ['¡Qué carrera, ganaste!', '¡Casi casi! Muy bien', '¡Bien hecho!', '¡Gracias por jugar con tanto cariño!'];
export const CUP_MSG = ['¡Campeona de la Copa!', '¡Qué copa! Casi casi', '¡Bien hecho, a la próxima vas por el oro!', '¡Gracias por jugar con tanto cariño!'];
export const CUP_MSG_BOY = ['¡Campeón de la Copa!', '¡Qué copa! Casi casi', '¡Bien hecho, a la próxima vas por el oro!', '¡Gracias por jugar con tanto cariño!'];

export const TIPS = {
  mover: 'Mover', saltar: 'Saltar', accion: 'Acción', poder: 'Poder', pausa: 'Pausa',
  accionHelp: 'Recoge, lanza o empuja',
  poderHelp: 'Cuando la barra amarilla brilla',
};
