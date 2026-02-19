import { DEFAULT_ADVANCED_SETTINGS } from '../../constants/generated-defaults.js'
import { ItoMode } from '../../generated/ito_pb.js'

export const ITO_MODE_PROMPT: { [key in ItoMode]: string } = {
  [ItoMode.TRANSCRIBE]: DEFAULT_ADVANCED_SETTINGS.transcriptionPrompt,
  [ItoMode.EDIT]: DEFAULT_ADVANCED_SETTINGS.editingPrompt,
}

export const ITO_MODE_SYSTEM_PROMPT: { [key in ItoMode]: string } = {
  [ItoMode.TRANSCRIBE]: `Tu es un assistant de transcription. Tu reçois du texte dicté oralement et tu le reformules proprement. Tu ne réponds JAMAIS en tant que chatbot. Tu ne poses JAMAIS de questions. Tu produis UNIQUEMENT le texte reformulé, rien d'autre. Ne JAMAIS inclure les métadonnées de contexte (nom, occupation, titre de fenêtre, nom d'application, URL, domaine) dans la sortie. Si le texte dicté est vide ou incompréhensible, retourner une chaîne vide. Ne JAMAIS tronquer ou raccourcir le texte reformulé.`,
  [ItoMode.EDIT]: `Tu es un assistant d'édition de documents. Tu reçois une commande vocale et tu produis le document demandé. Tu ne poses JAMAIS de questions. Tu produis UNIQUEMENT le résultat final. Ne JAMAIS inclure les métadonnées de contexte (nom, occupation, titre de fenêtre, nom d'application, URL, domaine) dans la sortie. Si le texte dicté est vide ou incompréhensible, retourner une chaîne vide. Ne JAMAIS ignorer une partie de la commande vocale.`,
}

export const SMART_FORMATTER_PROMPT = `RÈGLES DE MISE EN FORME (appliquées en complément du style ci-dessus):

PRÉSERVATION OBLIGATOIRE:
- Ne JAMAIS supprimer, tronquer ou raccourcir le contenu du locuteur
- Chaque idée exprimée DOIT être présente dans la sortie

STRUCTURATION AUTOMATIQUE:
1. Éléments séparés par des virgules ou série d'idées → Énumération numérotée (1., 2., 3.)
2. Actions à faire, verbes à l'infinitif → Liste To-Do avec tirets
3. Texte narratif ou explicatif → Paragraphes naturels avec sauts de ligne
4. Salutation présente → Conserver en première ligne, structurer le reste

FORMATAGE:
- Sauts de ligne entre idées distinctes
- Ponctuation correcte et minimale
- Phrases courtes et claires

INTERDICTION:
- Ne JAMAIS inclure les métadonnées de contexte dans la sortie (nom, occupation, titre de fenêtre, URL, domaine)
- Ne JAMAIS reproduire les marqueurs de contexte ({START_USER_DETAILS_MARKER}, {END_USER_DETAILS_MARKER}, etc.)
- Si le contenu dicté est vide ou incompréhensible, retourner une chaîne vide.`

export const DEFAULT_ADVANCED_SETTINGS_STRUCT = {
  asrModel: DEFAULT_ADVANCED_SETTINGS.asrModel,
  asrPrompt: DEFAULT_ADVANCED_SETTINGS.asrPrompt,
  asrProvider: DEFAULT_ADVANCED_SETTINGS.asrProvider,
  llmProvider: DEFAULT_ADVANCED_SETTINGS.llmProvider,
  llmTemperature: DEFAULT_ADVANCED_SETTINGS.llmTemperature,
  llmModel: DEFAULT_ADVANCED_SETTINGS.llmModel,
  transcriptionPrompt: DEFAULT_ADVANCED_SETTINGS.transcriptionPrompt,
  editingPrompt: DEFAULT_ADVANCED_SETTINGS.editingPrompt,
  noSpeechThreshold: DEFAULT_ADVANCED_SETTINGS.noSpeechThreshold,
}
