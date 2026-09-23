/**
 * Topic pools. The operator page draws three at random for the current game
 * and the speaker picks one (classic table-topics style). Karaoke gets talk
 * titles; the other two get prompts a speaker can improvise 1–2 minutes on.
 */
import type { GameMode } from "./session";

const KARAOKE_TITLES = [
  "Por qué los lunes deberían ser ilegales",
  "El futuro del transporte",
  "Cómo negociar con una paloma",
  "Mi plan para conquistar Marte con presupuesto de bar",
  "Las cinco reglas de oro del ascensor",
  "Historia secreta de la tostadora",
  "Cómo sobrevivir a una reunión familiar",
  "El arte de perder el autobús con dignidad",
  "Innovación disruptiva en el mundo de las siestas",
  "Todo lo que sé lo aprendí haciendo cola",
  "Manual del buen procrastinador",
  "Por qué el gato es el verdadero jefe",
  "La economía del tupper",
  "Cómo hablar en público sin haberlo preparado",
  "El día que la wifi se fue para siempre",
  "Guía definitiva para elegir mesa en un restaurante",
  "Los peligros ocultos del bricolaje",
  "Cómo explicarle internet a tu abuela",
  "Mi propuesta para un nuevo día de la semana",
  "Lecciones de liderazgo de un carrito de supermercado",
  "Por qué deberíamos volver a las cabinas de teléfono",
  "El regreso triunfal del fax",
  "Cómo ser influencer sin salir de casa",
  "La verdad sobre las plantas de oficina",
  "Diez motivos para no leer este título",
  "Fitness para gente que odia el fitness",
  "El karaoke como herramienta diplomática",
  "Cómo doblar una sábana bajera (teoría y práctica)",
  "Qué hacer si tu jefe es un robot",
  "El menú perfecto para una cena con extraterrestres",
];

const PROMPTS = [
  "Mi peor viaje en avión",
  "El día que aprendí a nadar",
  "La mejor decisión que he tomado nunca",
  "Una comida que nunca olvidaré",
  "Si pudiera vivir en cualquier época",
  "El regalo más raro que me han hecho",
  "Mi primer trabajo",
  "Una vez me perdí y…",
  "El invento que cambiaría mi vida",
  "Mi superpoder inútil",
  "Lo que me enseñó mi abuela",
  "Cómo conocí a mi mejor amigo",
  "El mejor consejo que he ignorado",
  "Un día sin móvil",
  "La vez que me pillaron",
  "Mi talento oculto",
  "Un lugar al que siempre quiero volver",
  "Lo que haría con un millón de euros",
  "Mi peor cita",
  "La mentira más grande que he contado",
  "Una tradición familiar absurda",
  "El día que casi lo dejo todo",
  "Si fuera alcalde por un día",
  "La canción de mi vida",
  "Mi miedo más ridículo",
  "El vecino más raro que he tenido",
  "Cómo sería mi película",
  "Un momento en que la lie parda",
  "Algo que nadie sabe de mí",
  "El mejor verano de mi vida",
  "Mi relación con la cocina",
  "Una vez en el hospital",
  "Mi última vergüenza en público",
  "Si los animales hablaran",
  "El objeto más valioso que tengo (y no es caro)",
  "Lo que quiero hacer antes de los 80",
];

export const TOPIC_POOLS: Record<GameMode, string[]> = {
  ilustrador: KARAOKE_TITLES,
  subtitulos: PROMPTS,
  banda: PROMPTS,
};

/** Three distinct random topics for the game, avoiding ones just shown or used. */
export function drawTopics(mode: GameMode, avoid: string[] = [], n = 3): string[] {
  const pool = TOPIC_POOLS[mode];
  let candidates = pool.filter((t) => !avoid.includes(t));
  if (candidates.length < n) candidates = [...pool];
  const out: string[] = [];
  while (out.length < n && candidates.length) {
    const i = Math.floor(Math.random() * candidates.length);
    out.push(candidates.splice(i, 1)[0]);
  }
  return out;
}
