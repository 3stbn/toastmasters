/**
 * Default phrase bank for "Subtítulos de la verdad". Each behaviour is one
 * Jev noul question (instructions + true/false criteria, in English for model
 * accuracy) and a list of Spanish subtitles the screen may show. The tone is
 * ridiculous and affectionate, not mean: the audience laughs with the
 * speaker. Sessions copy this bank into their state so it can be edited.
 */
export interface Behavior {
  id: string;
  /** Short label shown in the operator UI and the on-screen meter. */
  label: string;
  /** Noul instructions (a statement about the transcript that is true/false). */
  instructions: string;
  criteria: { true: string; false: string };
  /** Subtitles shown to the audience; one is picked at random. */
  phrases: string[];
  /** Overrides settings.subtitleThreshold for this behaviour. */
  threshold?: number;
}

export const DEFAULT_BEHAVIORS: Behavior[] = [
  {
    id: "haciendo_tiempo",
    label: "Haciendo tiempo",
    instructions:
      "The speaker is stalling for time: filler words, restating the question, vague generalities, hesitation, saying nothing of substance.",
    criteria: {
      true: "Mostly filler ('eh', 'bueno', 'como decía', 'es un tema muy importante'), repetition of the question, no concrete content.",
      false: "The speaker is delivering actual content: a story, an argument, a concrete example.",
    },
    phrases: ["Cargando ideas… 12 %", "Buscando la siguiente frase en el disco duro…", "Pausa dramática (involuntaria).", "El cerebro está en reunión. Deje su mensaje."],
  },
  {
    id: "exagerando",
    label: "Exagerando",
    instructions:
      "The speaker is clearly exaggerating: implausible numbers, hyperbole, 'the best/worst in the world', 'a million times', 'everyone', 'never in history'.",
    criteria: { true: "Hyperbolic claims or implausible superlatives are being stated as fact.", false: "Claims are measured or plausible." },
    phrases: ["Multiplique por 0,1 para obtener la cifra real.", "Exageración nivel: telenovela.", "Ligeramente exagerado. Ligeramente.", "Basado en hechos reales*. *Más o menos."],
  },
  {
    id: "inventando_datos",
    label: "Datos inventados",
    instructions:
      "The speaker is presenting invented or unverifiable statistics, studies or facts as if they were real ('el 87 % de las personas', 'según un estudio').",
    criteria: {
      true: "A precise-sounding statistic, study or expert is cited that is almost certainly made up on the spot.",
      false: "No statistics or citations, or they are clearly framed as a joke/opinion.",
    },
    phrases: ["Estadística fabricada en directo.", "Según un estudio… que no existe.", "Fuente: su imaginación. Muy fiable."],
  },
  {
    id: "concluyendo",
    label: "Aterrizando",
    instructions:
      "The speaker is wrapping up: signalling a conclusion, summarising, final message, 'para terminar', 'en conclusión', 'en resumen'.",
    criteria: { true: "Explicit closing language or a summary of the main point is present in the last sentences.", false: "The speaker is still developing ideas or opening new ones." },
    phrases: ["Aterrizando… por fin.", "Conclusión en 3, 2, 1…", "Preparen los aplausos.", "Se ve la luz al final del discurso."],
  },
  {
    id: "anecdota_personal",
    label: "Anécdota",
    instructions:
      "The speaker has digressed into a personal anecdote from their childhood, family or distant past ('una vez yo…', 'mi abuela…', 'cuando era pequeño…') as a detour from the topic.",
    criteria: {
      true: "A tangential story about the speaker's childhood, family or distant past, told as a detour.",
      false: "The speaker is simply narrating the events of the assigned topic in first person, or the content is general or hypothetical.",
    },
    phrases: ["Modo abuelo: activado.", "Contexto innecesario, pero entrañable.", "Ahora viene la historia personal. Acomódense."],
    threshold: 0.85,
  },
  {
    id: "cambio_tema",
    label: "Por las ramas",
    instructions: "The speaker has drifted away from the assigned topic and is now talking about something clearly different.",
    criteria: { true: "The last sentences are about a subject unrelated to the assigned topic (state.tema).", false: "The speaker is still on the assigned topic, or the topic is unknown." },
    phrases: ["Se fue por las ramas. Y por el tronco.", "Cambio de tema detectado. Nos dejamos llevar.", "Eso no era la pregunta, pero nos gusta."],
  },
  {
    id: "entusiasmo",
    label: "Entusiasmo",
    instructions: "The speaker sounds genuinely excited or enthusiastic: energetic words, exclamations, 'me encanta', 'increíble', 'lo mejor'.",
    criteria: { true: "Clear enthusiasm or excitement in the wording.", false: "Neutral or flat wording." },
    phrases: ["Nivel de emoción: cachorro.", "Se le nota que le gusta. Mucho.", "Entusiasmo no autorizado por el moderador."],
  },
  {
    id: "comida",
    label: "Comida",
    instructions: "The speaker is talking about food, eating, cooking or a specific dish or drink.",
    criteria: { true: "Food, dishes, restaurants, cooking or drinks are mentioned.", false: "No food or drink mentioned." },
    phrases: ["Se le ha hecho la boca agua. Y a nosotros.", "Este discurso tiene calorías.", "Chef invitado: el orador."],
  },
  {
    id: "familia",
    label: "Familia",
    instructions: "The speaker mentions family members: mother, father, grandparents, siblings, partner, children.",
    criteria: { true: "A family member is mentioned.", false: "No family mentioned." },
    phrases: ["Saludos a la mamá.", "La familia también aplaude (desde casa).", "Escena familiar. Palomitas."],
  },
  {
    id: "animal",
    label: "Animal",
    instructions: "The speaker mentions an animal (pet or wild).",
    criteria: { true: "Any animal is mentioned.", false: "No animal mentioned." },
    phrases: ["Todo discurso mejora con un animal.", "El animal no ha dado su consentimiento.", "Documental de La 2 en 3, 2, 1…"],
  },
  {
    id: "confesion",
    label: "Confesión",
    instructions: "The speaker is confessing something personal, embarrassing or vulnerable ('la verdad es que', 'nunca lo he contado', 'me da vergüenza').",
    criteria: { true: "A sincere or embarrassing personal admission.", false: "No personal admission." },
    phrases: ["Momento sincero. Aplaudan con cuidado.", "Esto no sale de esta sala.", "Confesión detectada. Sin juicio."],
  },
  {
    id: "chiste",
    label: "Chiste",
    instructions: "The speaker just made a joke or an obviously humorous remark.",
    criteria: { true: "A joke, pun or clearly comic remark.", false: "No joke." },
    phrases: ["Chiste detectado. Ríanse por favor.", "Ba dum tss.", "Humor: 1. Tema: 0."],
  },
  {
    id: "autocritica",
    label: "Autocrítica",
    instructions: "The speaker is making fun of themselves or admitting their own flaws with humour.",
    criteria: { true: "Self-deprecating remark about the speaker's own abilities, looks or decisions.", false: "No self-deprecation." },
    phrases: ["Se está haciendo bullying a sí mismo.", "Modestia detectada. Sospechoso.", "Su peor crítico: él mismo."],
  },
  {
    id: "epico",
    label: "Épico",
    instructions: "The speaker is in heroic, epic or motivational mode: overcoming, fighting, destiny, greatness, 'nunca me rendí'.",
    criteria: { true: "Heroic or motivational tone with big words.", false: "Ordinary tone." },
    phrases: ["Música épica en 3, 2, 1…", "Charla TED no autorizada.", "Modo héroe: activado."],
  },
  {
    id: "amor",
    label: "Amor",
    instructions: "The speaker is talking about love, a crush, a partner or romance.",
    criteria: { true: "Romantic feelings, a partner, a date or a crush are mentioned.", false: "No romance." },
    phrases: ["Se le nota el corazoncito.", "Telenovela en 3, 2, 1…", "Amor detectado. Suspiros en la sala."],
  },
  {
    id: "quejandose",
    label: "Quejándose",
    instructions: "The speaker is complaining about something (traffic, weather, prices, other people, technology).",
    criteria: { true: "A complaint or grievance is being voiced.", false: "No complaint." },
    phrases: ["Quejarse también es un arte.", "Reclamación registrada. Número 4.812.", "El mundo contra el orador: episodio 3."],
  },
  {
    id: "consejo",
    label: "Consejo",
    instructions: "The speaker is giving advice or a life lesson to the audience ('lo que tenéis que hacer', 'mi consejo', 'aprendí que').",
    criteria: { true: "Advice or a lesson is being offered.", false: "No advice." },
    phrases: ["Consejo no solicitado nº 7.", "Frase de taza de café.", "Apunten, que esto cae en el examen."],
  },
  {
    id: "clima",
    label: "El tiempo",
    instructions: "The speaker is talking about the weather (rain, heat, cold, sun) to fill or set a scene.",
    criteria: { true: "Weather is mentioned.", false: "No weather." },
    phrases: ["Ha recurrido al tiempo. Clásico.", "Parte meteorológico improvisado.", "Y ahora, el tiempo con nuestro orador."],
  },
];
