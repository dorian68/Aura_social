# AG-UI Implementation Guide — Agent connecté à toute l'application

> À placer à la racine du projet.
>
> Objectif : permettre à un agent de code comme Codex, Claude Code, Cursor, Windsurf ou un autre agent autonome d'implémenter de A à Z une couche **AG-UI** fonctionnelle, connectée à l'application existante, quel que soit le framework utilisé.
>
> Important : on parle ici de **AG-UI** pour **Agent–User Interaction Protocol**. Si le projet ou les tickets mentionnent par erreur `AD-UI`, considérer qu'il s'agit de `AG-UI`.

---

## 1. Définition simple de AG-UI

**AG-UI** est un protocole ouvert, léger et orienté événements qui standardise la manière dont un agent IA communique avec une interface utilisateur.

En termes simples :

- le **frontend** affiche l'interface, le chat, les boutons, les cartes, les formulaires, les validations et les états visuels ;
- le **backend agentique** réfléchit, appelle des outils, exécute des actions et renvoie des événements ;
- **AG-UI** est la couche commune qui fait circuler les messages, les appels d'outils, les mises à jour d'état, les confirmations humaines et le streaming temps réel entre les deux.

AG-UI n'est pas seulement un chat. C'est un protocole pour transformer une application classique en application **agentique**, c'est-à-dire une application dans laquelle un agent peut :

- lire le contexte utilisateur ;
- comprendre l'état actuel de l'application ;
- appeler des outils backend ;
- déclencher des actions frontend contrôlées ;
- afficher des composants interactifs ;
- demander une validation humaine avant une action sensible ;
- streamer sa réponse et sa progression ;
- synchroniser un état partagé entre l'agent et l'interface.

Formule mentale :

```text
MCP donne des outils aux agents.
A2A permet aux agents de parler entre eux.
AG-UI permet aux agents d'entrer dans une interface utilisateur vivante.
```

---

## 2. Mission de l'agent de code

L'agent de code doit implémenter une intégration AG-UI complète dans l'application courante.

Il ne doit pas créer une simple démo isolée. Il doit connecter l'agent à la vraie application existante.

### Résultat attendu

À la fin, l'application doit contenir :

1. Un endpoint backend compatible AG-UI.
2. Un client frontend capable de se connecter à cet endpoint.
3. Un panneau assistant ou agent dock accessible dans l'interface.
4. Un système de streaming de messages en temps réel.
5. Un système d'événements AG-UI : lifecycle, texte, outils, état, activité, erreurs.
6. Un registre d'outils permettant à l'agent d'interagir avec les fonctionnalités existantes de l'application.
7. Un mapping de l'état de l'application vers un état agentique lisible.
8. Une couche de validation humaine pour les actions sensibles.
9. Des tests unitaires et/ou E2E selon la stack.
10. Une documentation locale expliquant comment utiliser et étendre l'intégration.

---

## 3. Règles d'exécution pour l'agent de code

L'agent de code doit :

1. Inspecter toute la structure du projet avant de coder.
2. Identifier automatiquement la stack : Next.js, React/Vite, Vue, Svelte, Express, NestJS, FastAPI, Django, Flask, ASP.NET, Rails ou autre.
3. Identifier les routes, services, modèles, stores, API clients, hooks, composants UI, schémas DB et fichiers de configuration.
4. Réutiliser l'architecture existante autant que possible.
5. Ne pas casser les fonctionnalités actuelles.
6. Ne pas hardcoder une fausse app de démonstration.
7. Connecter AG-UI aux fonctionnalités réelles disponibles.
8. Créer des abstractions génériques lorsque l'application n'a pas encore de structure claire.
9. Ajouter des tests et une documentation.
10. Lancer les commandes de lint, typecheck, build et tests disponibles.
11. Corriger les erreurs rencontrées jusqu'à obtention d'une intégration stable.

Si une information manque, faire un choix raisonnable, documenter ce choix et continuer. Ne pas bloquer l'implémentation par des questions inutiles.

---

## 4. Architecture cible

Architecture conceptuelle :

```text
┌──────────────────────────────────────────────────────────────┐
│                         FRONTEND                              │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐  │
│  │ AgentDock / Chat UI  │      │ App State Adapter         │  │
│  │ - messages           │      │ - route actuelle          │  │
│  │ - streaming          │      │ - user/session            │  │
│  │ - tool cards         │      │ - page data               │  │
│  │ - approvals          │      │ - selected entities       │  │
│  └──────────┬───────────┘      └───────────┬──────────────┘  │
│             │                              │                 │
│             └────────── AG-UI Client ──────┘                 │
└─────────────────────────┬────────────────────────────────────┘
                          │ HTTP POST + SSE / fetch streaming
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                          BACKEND                              │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐  │
│  │ AG-UI Endpoint       │      │ Agent Runtime Adapter     │  │
│  │ /api/ag-ui/run       │─────▶│ OpenAI/Anthropic/local    │  │
│  │ validates input      │      │ LangGraph/Agent Framework │  │
│  │ streams events       │      │ custom agent              │  │
│  └──────────┬───────────┘      └───────────┬──────────────┘  │
│             │                              │                 │
│             ▼                              ▼                 │
│  ┌──────────────────────┐      ┌──────────────────────────┐  │
│  │ Tool Registry        │      │ App Connectors            │  │
│  │ safe actions         │─────▶│ DB / services / APIs      │  │
│  │ approval policy      │      │ business logic            │  │
│  └──────────────────────┘      └──────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Fonctionnalités AG-UI obligatoires

L'intégration doit couvrir au minimum ces familles d'événements :

### 5.1 Lifecycle events

Utilisés pour signaler le début, la progression et la fin d'une exécution agentique.

Événements à supporter :

- `RunStarted`
- `RunFinished`
- `RunError`
- `StepStarted`
- `StepFinished`

Ordre minimal attendu :

```text
RunStarted
TextMessageStart
TextMessageContent...
TextMessageEnd
RunFinished
```

En cas d'erreur :

```text
RunStarted
RunError
```

### 5.2 Text message events

Utilisés pour streamer le texte de l'agent.

Événements à supporter :

- `TextMessageStart`
- `TextMessageContent`
- `TextMessageEnd`
- optionnellement `TextMessageChunk`

Le frontend doit concaténer les `delta` de `TextMessageContent` dans le bon message.

### 5.3 Tool call events

Utilisés pour rendre visibles les actions de l'agent.

Événements à supporter :

- `ToolCallStart`
- `ToolCallArgs`
- `ToolCallEnd`
- `ToolCallResult`
- optionnellement `ToolCallChunk`

Le frontend doit afficher clairement :

- quel outil est appelé ;
- avec quels arguments ;
- si l'outil est en cours, réussi, refusé ou en erreur ;
- le résultat utile pour l'utilisateur.

### 5.4 State management events

Utilisés pour synchroniser l'état entre l'agent et l'application.

Événements à supporter :

- `StateSnapshot`
- `StateDelta`
- `MessagesSnapshot`

Le backend doit pouvoir envoyer un snapshot complet. Le frontend doit pouvoir appliquer des deltas JSON Patch si la stack le permet.

### 5.5 Activity events

Utilisés pour afficher une activité structurée en cours.

Événements à supporter si utile :

- `ActivitySnapshot`
- `ActivityDelta`

Exemples :

- plan d'action ;
- recherche en cours ;
- analyse de fichier ;
- génération de rapport ;
- exécution multi-étapes.

### 5.6 Custom events

Prévoir un mécanisme extensible pour :

- `Custom`
- `Raw`

Ces événements doivent être namespacés, par exemple :

```text
app.navigate
app.open_modal
app.refresh_entity
app.toast
app.highlight
app.render_component
```

---

## 6. Schéma d'entrée AG-UI à supporter

L'endpoint AG-UI doit accepter un payload proche de ce modèle :

```json
{
  "threadId": "thread_abc",
  "runId": "run_xyz",
  "parentRunId": null,
  "state": {},
  "messages": [
    {
      "id": "msg_1",
      "role": "user",
      "content": "Analyse cette page et propose une action."
    }
  ],
  "tools": [],
  "context": [],
  "forwardedProps": {}
}
```

Champs attendus :

- `threadId` : identifiant de conversation.
- `runId` : identifiant d'exécution.
- `parentRunId` : optionnel, utile pour une branche ou reprise.
- `state` : état actuel de l'application côté client.
- `messages` : historique de conversation.
- `tools` : outils disponibles côté client si applicable.
- `context` : contexte supplémentaire.
- `forwardedProps` : propriétés libres transmises par l'application.

Si la bibliothèque utilisée emploie `thread_id`/`run_id` côté Python, créer un adapter qui convertit automatiquement camelCase ↔ snake_case.

---

## 7. Format de sortie SSE recommandé

L'endpoint doit répondre en streaming avec :

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Format recommandé :

```text
event: ag-ui
data: {"type":"RunStarted","threadId":"thread_abc","runId":"run_xyz","timestamp":"2026-01-01T12:00:00.000Z"}

```

ou, si la stack utilise seulement `data:` :

```text
data: {"type":"TextMessageContent","messageId":"msg_assistant_1","delta":"Bonjour"}

```

Le frontend doit supporter les deux formats si possible.

---

## 8. Endpoint backend à créer

Créer un endpoint unique principal :

```text
POST /api/ag-ui/run
```

Alias acceptables selon la stack :

```text
POST /ag-ui/run
POST /api/agent/run
POST /agent/ag-ui
```

Mais l'URL finale doit être documentée dans `AG_UI_LOCAL_DOC.md`.

### Responsabilités de l'endpoint

L'endpoint doit :

1. Valider le payload entrant.
2. Créer ou récupérer le `threadId`.
3. Créer un `runId` si absent.
4. Construire le contexte agentique.
5. Injecter les outils disponibles.
6. Lancer l'agent.
7. Streamer les événements AG-UI.
8. Gérer les erreurs proprement.
9. Fermer le stream avec `RunFinished` ou `RunError`.

### Exemple générique de flux

```json
{"type":"RunStarted","threadId":"thread_abc","runId":"run_xyz"}
{"type":"StateSnapshot","snapshot":{"route":"/dashboard","userRole":"admin"}}
{"type":"TextMessageStart","messageId":"msg_1","role":"assistant"}
{"type":"TextMessageContent","messageId":"msg_1","delta":"Je vais analyser la page actuelle."}
{"type":"TextMessageEnd","messageId":"msg_1"}
{"type":"ToolCallStart","toolCallId":"tool_1","toolCallName":"read_current_page_state"}
{"type":"ToolCallArgs","toolCallId":"tool_1","delta":"{}"}
{"type":"ToolCallEnd","toolCallId":"tool_1"}
{"type":"ToolCallResult","messageId":"tool_msg_1","toolCallId":"tool_1","content":"{\"status\":\"ok\"}","role":"tool"}
{"type":"RunFinished","threadId":"thread_abc","runId":"run_xyz","outcome":{"type":"success"}}
```

---

## 9. Frontend à créer

Créer ou intégrer les composants suivants selon la stack :

```text
src/agent-ui/
  AgentProvider.tsx / AgentProvider.vue / equivalent
  AgentDock.tsx
  AgentMessages.tsx
  AgentInput.tsx
  AgentEventRenderer.tsx
  AgentToolCard.tsx
  AgentApprovalCard.tsx
  AgentStateInspector.tsx
  useAgUIAgent.ts
  agui-client.ts
  agui-types.ts
  app-state-adapter.ts
  app-action-registry.ts
```

Adapter les chemins si le projet n'utilise pas `src`.

### 9.1 AgentDock

Créer un panneau assistant accessible globalement :

- bouton flottant ou sidebar ;
- historique de messages ;
- streaming en temps réel ;
- affichage des appels outils ;
- affichage des validations ;
- bouton stop/cancel si possible ;
- bouton reset thread ;
- état de connexion.

### 9.2 useAgUIAgent

Le hook ou service client doit gérer :

- `messages` ;
- `events` ;
- `isRunning` ;
- `currentRunId` ;
- `threadId` ;
- `sendMessage(content)` ;
- `stopRun()` si possible ;
- `resumeRun()` pour validation humaine ;
- application des `StateSnapshot` et `StateDelta` ;
- dispatch des `Custom` events vers l'application.

### 9.3 App State Adapter

Créer un adapter qui expose à l'agent l'état utile de l'application :

```ts
export type AppAgentState = {
  route?: string
  pathname?: string
  query?: Record<string, string>
  user?: {
    id?: string
    role?: string
    email?: string
  }
  selectedEntity?: {
    type: string
    id: string
  }
  visibleData?: unknown
  filters?: Record<string, unknown>
  featureFlags?: Record<string, boolean>
  permissions?: string[]
}
```

Ne jamais envoyer de secrets au frontend ou au modèle.

### 9.4 App Action Registry

Créer un registre d'actions frontend contrôlées :

```ts
export const appActions = {
  navigate: async ({ path }) => {},
  openModal: async ({ modal, props }) => {},
  closeModal: async ({ modal }) => {},
  showToast: async ({ message, type }) => {},
  refreshData: async ({ key }) => {},
  highlightElement: async ({ selector }) => {},
  setFilter: async ({ name, value }) => {}
}
```

Ces actions doivent être appelées uniquement via des événements `Custom` validés et typés.

---

## 10. Registre d'outils backend

Créer un registre d'outils côté serveur connecté à l'application réelle.

Fichier recommandé :

```text
src/server/agent/tools.ts
```

ou selon la stack :

```text
app/api/ag-ui/tools.ts
backend/agent/tools.py
server/agent/tools.js
```

### Outils obligatoires

Implémenter ces outils génériques quand ils sont applicables :

#### `get_app_map`

Retourne une carte des grandes sections de l'application : routes, modules, modèles, services, permissions connues.

#### `get_current_user_context`

Retourne le contexte utilisateur sans secret : id, rôle, permissions, organisation, préférences utiles.

#### `read_entity`

Lit une entité métier existante : client, projet, facture, formation, utilisateur, produit, etc.

Arguments :

```json
{
  "entityType": "string",
  "id": "string"
}
```

#### `search_entities`

Recherche dans les données existantes.

Arguments :

```json
{
  "entityType": "string",
  "query": "string",
  "filters": {}
}
```

#### `create_entity`

Crée une entité métier si l'application a déjà un service correspondant.

Doit demander validation humaine si l'action modifie des données importantes.

#### `update_entity`

Met à jour une entité existante.

Validation humaine obligatoire pour les actions sensibles.

#### `delete_entity`

Supprime ou archive une entité.

Validation humaine obligatoire.

#### `trigger_workflow`

Déclenche un workflow existant : génération de rapport, envoi d'email, publication, calcul, synchronisation, export, etc.

Validation humaine obligatoire si impact externe.

#### `explain_current_screen`

Utilise l'état frontend transmis pour expliquer à l'utilisateur ce qu'il peut faire sur l'écran actuel.

---

## 11. Connexion à toute l'application

L'agent de code doit créer un fichier :

```text
AG_UI_APP_MAP.md
```

Ce fichier doit documenter :

1. La stack détectée.
2. Les routes/pages principales.
3. Les composants importants.
4. Les stores/context/providers.
5. Les services backend.
6. Les modèles ou tables de données.
7. Les actions métier existantes.
8. Les permissions/rôles si disponibles.
9. Les outils AG-UI créés.
10. Les actions non connectées et la raison.

### Connexion minimale attendue

L'agent doit au minimum connecter :

- la navigation ;
- le contexte utilisateur/session ;
- la page courante ;
- les principales entités métier ;
- les principales actions métier ;
- les API internes existantes ;
- les formulaires importants si identifiables ;
- les dashboards ou listes principales si présents.

### Stratégie d'adaptation selon la stack

#### Next.js / React

- Créer endpoint dans `app/api/ag-ui/run/route.ts` ou `pages/api/ag-ui/run.ts`.
- Créer `AgentProvider` au niveau du layout global.
- Utiliser hooks React pour état, messages et events.
- Utiliser `fetch` streaming ou `EventSource` adapté au POST via `fetch` stream.

#### Vite / React SPA

- Créer client AG-UI dans `src/agent-ui`.
- Connecter à un backend existant ou créer un petit serveur API si le projet en possède déjà un.
- Ajouter `AgentProvider` autour de l'app.

#### Vue / Nuxt

- Créer composable `useAgUIAgent`.
- Créer plugin global.
- Créer composant `AgentDock.vue`.

#### Svelte / SvelteKit

- Créer store AG-UI.
- Créer endpoint serveur dans `+server.ts`.
- Créer composant dock.

#### FastAPI

- Créer route `POST /api/ag-ui/run`.
- Retourner `StreamingResponse` avec `text/event-stream`.
- Utiliser Pydantic pour valider `RunAgentInput`.

#### Django

- Créer view async si possible.
- Utiliser `StreamingHttpResponse`.
- Créer serializers/schemas de validation.

#### Express / NestJS

- Créer route POST.
- Utiliser `res.write` pour SSE.
- Valider payload avec Zod/Joi/class-validator selon la stack.

#### ASP.NET

- Utiliser l'intégration Agent Framework AG-UI si le projet est compatible.
- Sinon implémenter SSE manuellement.

---

## 12. Human-in-the-loop et sécurité

Toute action sensible doit exiger une validation utilisateur.

Actions sensibles :

- suppression ;
- paiement ;
- envoi d'email ;
- publication externe ;
- modification de droits ;
- modification de données client ;
- génération ou envoi de document officiel ;
- appels API coûteux ;
- actions irréversibles ;
- exécution de commande système ;
- accès à données privées.

### Format d'une demande de validation

Créer un événement custom ou interrupt compatible :

```json
{
  "type": "Custom",
  "name": "app.approval.required",
  "value": {
    "approvalId": "approval_123",
    "title": "Confirmer la mise à jour",
    "description": "L'agent veut modifier le client ACME.",
    "riskLevel": "medium",
    "action": "update_entity",
    "arguments": {
      "entityType": "customer",
      "id": "cus_123"
    }
  }
}
```

Le frontend doit afficher une carte avec :

- action demandée ;
- impact ;
- arguments ;
- bouton accepter ;
- bouton refuser ;
- option modifier si simple à implémenter.

Le backend ne doit exécuter l'action qu'après validation explicite.

---

## 13. Politique de confidentialité et secrets

Ne jamais envoyer au modèle ou au frontend :

- clés API ;
- tokens OAuth ;
- secrets `.env` ;
- mots de passe ;
- informations bancaires ;
- données personnelles non nécessaires ;
- dumps complets de base de données ;
- documents privés sans demande explicite de l'utilisateur.

Créer une fonction de sanitation :

```text
sanitizeForAgent(input) -> safeInput
```

Elle doit masquer :

```text
apiKey, token, password, secret, authorization, cookie, set-cookie, privateKey, refreshToken, accessToken
```

---

## 14. Prompt système de l'agent applicatif

Créer un prompt système côté serveur, non modifiable par le client :

```text
Tu es l'agent intégré de cette application.
Tu aides l'utilisateur à comprendre, naviguer et utiliser l'application.
Tu peux appeler uniquement les outils déclarés dans le registre.
Tu dois expliquer tes actions clairement.
Tu ne dois jamais inventer une donnée qui n'a pas été fournie par l'application ou par l'utilisateur.
Pour toute action sensible, tu dois demander une validation humaine avant exécution.
Tu dois respecter les permissions de l'utilisateur.
Tu dois utiliser l'état courant de l'application pour fournir une aide contextualisée.
Si une action est impossible, explique pourquoi et propose l'alternative la plus proche.
```

---

## 15. Typage minimal TypeScript

Si le projet utilise TypeScript, créer un fichier proche de :

```ts
export type AGUIRole =
  | "developer"
  | "system"
  | "assistant"
  | "user"
  | "tool"
  | "activity"
  | "reasoning"

export type AGUIMessage = {
  id: string
  role: AGUIRole
  content?: string | unknown[]
  name?: string
  tool_calls?: unknown[]
}

export type RunAgentInput = {
  threadId: string
  runId: string
  parentRunId?: string | null
  state?: unknown
  messages: AGUIMessage[]
  tools?: AGUITool[]
  context?: AGUIContext[]
  forwardedProps?: unknown
}

export type AGUITool = {
  name: string
  description: string
  parameters: unknown
}

export type AGUIContext = {
  description: string
  value: string
}

export type AGUIEvent =
  | { type: "RunStarted"; threadId: string; runId: string; timestamp?: string }
  | { type: "RunFinished"; threadId?: string; runId?: string; outcome?: unknown; result?: unknown; timestamp?: string }
  | { type: "RunError"; message: string; code?: string; timestamp?: string }
  | { type: "StepStarted"; stepName: string; timestamp?: string }
  | { type: "StepFinished"; stepName: string; timestamp?: string }
  | { type: "TextMessageStart"; messageId: string; role: AGUIRole; timestamp?: string }
  | { type: "TextMessageContent"; messageId: string; delta: string; timestamp?: string }
  | { type: "TextMessageEnd"; messageId: string; timestamp?: string }
  | { type: "ToolCallStart"; toolCallId: string; toolCallName: string; parentMessageId?: string; timestamp?: string }
  | { type: "ToolCallArgs"; toolCallId: string; delta: string; timestamp?: string }
  | { type: "ToolCallEnd"; toolCallId: string; timestamp?: string }
  | { type: "ToolCallResult"; messageId: string; toolCallId: string; content: string; role?: "tool"; timestamp?: string }
  | { type: "StateSnapshot"; snapshot: unknown; timestamp?: string }
  | { type: "StateDelta"; delta: unknown[]; timestamp?: string }
  | { type: "MessagesSnapshot"; messages: AGUIMessage[]; timestamp?: string }
  | { type: "ActivitySnapshot"; messageId: string; activityType: string; content: unknown; replace?: boolean; timestamp?: string }
  | { type: "ActivityDelta"; messageId: string; activityType: string; patch: unknown[]; timestamp?: string }
  | { type: "Custom"; name: string; value: unknown; timestamp?: string }
  | { type: "Raw"; event: unknown; source?: string; timestamp?: string }
```

Adapter si une lib AG-UI officielle est installée.

---

## 16. Client streaming minimal en TypeScript

Si aucune librairie AG-UI n'est déjà intégrée, implémenter un client simple :

```ts
export async function runAgUI(input: RunAgentInput, onEvent: (event: AGUIEvent) => void) {
  const response = await fetch("/api/ag-ui/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify(input)
  })

  if (!response.ok || !response.body) {
    throw new Error(`AG-UI request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const chunks = buffer.split("\n\n")
    buffer = chunks.pop() ?? ""

    for (const chunk of chunks) {
      const dataLines = chunk
        .split("\n")
        .filter(line => line.startsWith("data:"))
        .map(line => line.replace(/^data:\s?/, ""))

      if (!dataLines.length) continue

      const raw = dataLines.join("\n")
      if (raw === "[DONE]") return

      try {
        onEvent(JSON.parse(raw))
      } catch (error) {
        console.error("Invalid AG-UI event", raw, error)
      }
    }
  }
}
```

---

## 17. Backend SSE minimal en Node/Next/Express

Adapter à la stack, mais respecter cette logique :

```ts
function sendEvent(res: any, event: unknown) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

async function aguiHandler(req: any, res: any) {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache")
  res.setHeader("Connection", "keep-alive")

  const input = req.body
  const threadId = input.threadId || crypto.randomUUID()
  const runId = input.runId || crypto.randomUUID()

  try {
    sendEvent(res, { type: "RunStarted", threadId, runId, timestamp: new Date().toISOString() })

    sendEvent(res, {
      type: "StateSnapshot",
      snapshot: await buildSafeAppState(input),
      timestamp: new Date().toISOString()
    })

    const messageId = crypto.randomUUID()
    sendEvent(res, { type: "TextMessageStart", messageId, role: "assistant" })

    // Adapter ici au vrai runtime LLM/agent.
    for await (const delta of runApplicationAgent(input)) {
      sendEvent(res, { type: "TextMessageContent", messageId, delta })
    }

    sendEvent(res, { type: "TextMessageEnd", messageId })
    sendEvent(res, { type: "RunFinished", threadId, runId, outcome: { type: "success" } })
  } catch (error: any) {
    sendEvent(res, { type: "RunError", message: error?.message || "Unknown error", code: "AGUI_RUN_ERROR" })
  } finally {
    res.end()
  }
}
```

---

## 18. Backend SSE minimal en Python/FastAPI

Adapter si le projet est Python :

```py
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import json
import uuid
from datetime import datetime

router = APIRouter()

def sse(event: dict) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

@router.post("/api/ag-ui/run")
async def run_ag_ui(request: Request):
    payload = await request.json()
    thread_id = payload.get("threadId") or str(uuid.uuid4())
    run_id = payload.get("runId") or str(uuid.uuid4())

    async def stream():
        try:
            yield sse({"type": "RunStarted", "threadId": thread_id, "runId": run_id, "timestamp": datetime.utcnow().isoformat()})
            yield sse({"type": "StateSnapshot", "snapshot": await build_safe_app_state(payload)})

            message_id = str(uuid.uuid4())
            yield sse({"type": "TextMessageStart", "messageId": message_id, "role": "assistant"})

            async for delta in run_application_agent(payload):
                yield sse({"type": "TextMessageContent", "messageId": message_id, "delta": delta})

            yield sse({"type": "TextMessageEnd", "messageId": message_id})
            yield sse({"type": "RunFinished", "threadId": thread_id, "runId": run_id, "outcome": {"type": "success"}})
        except Exception as e:
            yield sse({"type": "RunError", "message": str(e), "code": "AGUI_RUN_ERROR"})

    return StreamingResponse(stream(), media_type="text/event-stream")
```

---

## 19. Intégration LLM / agent runtime

L'agent de code doit détecter le runtime existant :

- OpenAI SDK ;
- Anthropic SDK ;
- Vercel AI SDK ;
- LangChain ;
- LangGraph ;
- Microsoft Agent Framework ;
- Pydantic AI ;
- CrewAI ;
- LlamaIndex ;
- agent custom ;
- aucun runtime existant.

### Si un runtime existe

Créer un adapter qui convertit :

```text
runtime stream -> AG-UI events
runtime tool calls -> ToolCallStart / ToolCallArgs / ToolCallEnd / ToolCallResult
runtime errors -> RunError
runtime state -> StateSnapshot / StateDelta
```

### Si aucun runtime n'existe

Créer une implémentation minimale mais fonctionnelle :

- variable d'environnement pour provider LLM ;
- fallback mock uniquement en développement si aucune clé n'est disponible ;
- documentation claire dans `.env.example` ;
- aucune clé hardcodée.

Variables recommandées :

```env
AG_UI_PROVIDER=openai
AG_UI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
AG_UI_REQUIRE_APPROVAL=true
AG_UI_ENABLE_DEBUG=false
```

Ne pas imposer un provider si le projet a déjà une convention.

### 19.1 Modèle LLM par défaut obligatoire pour réduire les coûts

Par défaut, si aucun runtime LLM n'est déjà imposé par l'application, l'intégration AG-UI doit utiliser **OpenAI `gpt-4o-mini`**.

Ce choix est important pour maîtriser les coûts d'inférence, surtout dans une interface chatbot intégrée qui peut générer beaucoup de messages, de tool calls, de résumés de conversations, de titres automatiques et d'événements UI.

Règle par défaut :

```env
AG_UI_PROVIDER=openai
AG_UI_MODEL=gpt-4o-mini
OPENAI_API_KEY=
```

L'agent de code doit appliquer la logique suivante :

1. Si le projet possède déjà une configuration LLM claire, respecter la convention existante, mais documenter comment passer sur `gpt-4o-mini`.
2. Si le projet n'a aucun runtime LLM, créer l'intégration OpenAI avec `gpt-4o-mini` comme modèle par défaut.
3. Si une variable `AG_UI_MODEL` existe déjà, ne pas la supprimer ; vérifier qu'elle peut accepter `gpt-4o-mini`.
4. Si aucun fichier `.env.example` n'existe, en créer un avec `AG_UI_MODEL=gpt-4o-mini`.
5. Si un fichier `.env.example` existe déjà, l'enrichir sans supprimer les variables existantes.
6. Ne jamais hardcoder la clé OpenAI dans le code.
7. Le modèle doit toujours être configurable par variable d'environnement.
8. En développement, si `OPENAI_API_KEY` est absente, utiliser un fallback mock propre, explicitement marqué comme mock.
9. En production, si `OPENAI_API_KEY` est absente, afficher une erreur claire et non technique côté utilisateur.

Exemple de configuration TypeScript recommandée :

```ts
export const agUIConfig = {
  provider: process.env.AG_UI_PROVIDER ?? "openai",
  model: process.env.AG_UI_MODEL ?? "gpt-4o-mini",
  requireApproval: process.env.AG_UI_REQUIRE_APPROVAL !== "false",
  debug: process.env.AG_UI_ENABLE_DEBUG === "true"
}
```

Exemple de configuration Python recommandée :

```py
AG_UI_PROVIDER = os.getenv("AG_UI_PROVIDER", "openai")
AG_UI_MODEL = os.getenv("AG_UI_MODEL", "gpt-4o-mini")
AG_UI_REQUIRE_APPROVAL = os.getenv("AG_UI_REQUIRE_APPROVAL", "true").lower() != "false"
AG_UI_ENABLE_DEBUG = os.getenv("AG_UI_ENABLE_DEBUG", "false").lower() == "true"
```

Le chatbot AG-UI doit utiliser `gpt-4o-mini` pour :

- les réponses conversationnelles ;
- l'aide contextuelle dans l'application ;
- les titres automatiques de conversation ;
- les résumés de conversation ;
- la génération de suggestions rapides ;
- la préparation de UIBlocks ;
- les explications d'écran ;
- les appels d'outils standards.

Si une tâche demande ponctuellement un modèle plus puissant, l'architecture peut prévoir une escalade optionnelle, mais cette escalade doit être explicite, configurable, documentée et non activée par défaut.

Exemple :

```env
AG_UI_MODEL=gpt-4o-mini
AG_UI_ESCALATION_MODEL=
AG_UI_ENABLE_MODEL_ESCALATION=false
```

Par défaut, ne pas utiliser de modèle plus coûteux que `gpt-4o-mini`.

---

## 20. Génération UI / composants interactifs

L'agent doit pouvoir demander au frontend de rendre des composants contrôlés par l'application.

Exemples d'événements custom :

```json
{
  "type": "Custom",
  "name": "app.render_component",
  "value": {
    "component": "EntityPreviewCard",
    "props": {
      "entityType": "customer",
      "id": "cus_123"
    }
  }
}
```

Le frontend ne doit jamais rendre du code arbitraire généré par le modèle.

Il doit utiliser une allowlist :

```ts
const allowedAgentComponents = {
  EntityPreviewCard,
  ConfirmationCard,
  ReportPreview,
  DataTablePreview,
  ChartPreview
}
```

---

## 21. Observabilité et debug

Créer un mode debug activable par environnement.

```env
AG_UI_ENABLE_DEBUG=true
```

En debug, afficher :

- events reçus ;
- payload d'entrée nettoyé ;
- outils disponibles ;
- état courant ;
- erreurs ;
- latence de run ;
- nombre d'événements.

Créer aussi un fichier ou une page dev :

```text
/ag-ui-debug
```

si la stack le permet.

---

## 22. Tests obligatoires

Créer les tests adaptés à la stack.

### Tests unitaires minimum

1. Le payload `RunAgentInput` est validé.
2. L'endpoint renvoie `text/event-stream`.
3. Un run réussi émet `RunStarted` puis `RunFinished`.
4. Une erreur émet `RunError`.
5. Les deltas texte sont concaténables.
6. Les outils sensibles demandent validation.
7. La sanitation masque les secrets.
8. Les événements custom non allowlistés sont ignorés.

### Tests E2E si possible

1. L'utilisateur ouvre l'app.
2. Il ouvre l'AgentDock.
3. Il envoie un message.
4. Il voit une réponse streamer.
5. Il voit un appel outil.
6. Il accepte ou refuse une validation.
7. L'état UI se met à jour sans reload complet.

---

## 23. Documentation locale à produire

Créer :

```text
AG_UI_LOCAL_DOC.md
```

Contenu obligatoire :

1. Ce qui a été installé.
2. Les fichiers créés/modifiés.
3. L'URL de l'endpoint AG-UI.
4. Comment lancer le projet.
5. Comment tester l'agent.
6. Comment ajouter un outil backend.
7. Comment ajouter une action frontend.
8. Comment ajouter un composant génératif allowlisté.
9. Comment activer/désactiver le debug.
10. Les limites connues.

---

## 24. Commandes de validation

L'agent de code doit détecter et lancer les commandes disponibles.

Exemples :

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

ou :

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

ou :

```bash
pytest
ruff check .
mypy .
```

ou équivalent selon la stack.

S'il manque des scripts, documenter la situation dans `AG_UI_LOCAL_DOC.md`.

---

## 25. Definition of Done

L'intégration est terminée uniquement si :

- [ ] L'agent de code a inspecté le projet.
- [ ] `AG_UI_APP_MAP.md` existe.
- [ ] `AG_UI_LOCAL_DOC.md` existe.
- [ ] Un endpoint AG-UI fonctionnel existe.
- [ ] Le frontend peut ouvrir un panneau agent.
- [ ] L'utilisateur peut envoyer un message.
- [ ] La réponse stream en temps réel.
- [ ] Les événements AG-UI principaux sont supportés.
- [ ] Au moins 3 outils backend réels sont connectés à l'application.
- [ ] Au moins 3 actions frontend réelles sont connectées à l'application.
- [ ] Les actions sensibles demandent validation.
- [ ] Les secrets sont sanitisés.
- [ ] Les tests disponibles passent ou les erreurs restantes sont documentées.
- [ ] Le build passe ou les raisons de blocage sont documentées.

---

## 26. Prompt d'exécution pour Codex / Claude Code

Utilise ce prompt après avoir placé ce fichier à la racine du projet :

```text
Lis entièrement le fichier AG_UI_IMPLEMENTATION_GUIDE.md à la racine du projet.

Ta mission est d'implémenter de A à Z une intégration AG-UI fonctionnelle dans cette application, connectée aux vraies fonctionnalités existantes, et non une simple démo isolée.

Commence par auditer la stack, les routes, les services, les modèles, les stores, les API internes, les composants et les workflows existants. Crée ensuite AG_UI_APP_MAP.md pour documenter cette cartographie.

Implémente ensuite :
1. un endpoint backend AG-UI en streaming SSE ;
2. un client frontend AG-UI ;
3. un AgentDock global ;
4. le support des événements AG-UI principaux ;
5. un registre d'outils backend connecté à l'application ;
6. un registre d'actions frontend contrôlées ;
7. la synchronisation d'état ;
8. les validations humaines pour actions sensibles ;
9. la sanitation des secrets ;
10. l'intégration LLM par défaut avec OpenAI `gpt-4o-mini` afin de réduire les coûts, configurable via `AG_UI_MODEL` ;
11. les tests et la documentation locale AG_UI_LOCAL_DOC.md.

Ne me demande pas de validation à chaque étape. Fais les choix raisonnables, exécute, teste, corrige et documente. Ne supprime pas de fonctionnalité existante. Ne casse pas le build. Si une partie ne peut pas être connectée, explique précisément pourquoi dans AG_UI_LOCAL_DOC.md et fournis l'extension point nécessaire.
```

---

## 27. Prompt court pour mode YOLO / bypass permissions

À utiliser seulement sur une branche Git propre :

```text
Implémente entièrement l'intégration AG-UI décrite dans AG_UI_IMPLEMENTATION_GUIDE.md. Travaille en autonomie, inspecte le repo, code, teste, corrige, documente. Ne crée pas une démo isolée : connecte l'agent aux vraies routes, vrais services, vraies entités et vraies actions de l'application. Par défaut, utilise OpenAI `gpt-4o-mini` via `AG_UI_MODEL=gpt-4o-mini` pour réduire les coûts, sauf si le projet possède déjà une convention LLM explicite. Toutes les actions sensibles doivent demander validation humaine. Termine par AG_UI_APP_MAP.md, AG_UI_LOCAL_DOC.md, tests, lint/typecheck/build si disponibles.
```

---

## 28. Références utiles

- AG-UI official docs: https://docs.ag-ui.com/introduction
- AG-UI events: https://docs.ag-ui.com/concepts/events
- AG-UI core architecture: https://docs.ag-ui.com/concepts/architecture
- AG-UI types: https://docs.ag-ui.com/sdk/js/core/types
- Microsoft Agent Framework AG-UI integration: https://learn.microsoft.com/en-us/agent-framework/integrations/ag-ui/
- AG-UI GitHub: https://github.com/ag-ui-protocol/ag-ui

---

## 29. Addendum obligatoire — Création ou amélioration du chatbot IA AG-UI

Cette section complète toutes les sections précédentes. Elle est **obligatoire**.

L'intégration AG-UI ne doit pas être seulement un endpoint technique ou un panneau minimal. Elle doit offrir une expérience utilisateur de chatbot moderne, fluide, élégante et profondément connectée à l'application.

Si l'application possède déjà un chatbot IA, l'agent de code doit l'améliorer et le connecter à AG-UI.

Si l'application **ne possède pas encore de chatbot IA**, l'agent de code doit en créer un de A à Z en respectant strictement les consignes ci-dessous.

### 29.1 Objectif UX du chatbot

Le chatbot doit atteindre un standard d'expérience proche des meilleurs assistants modernes : ChatGPT, Claude, Perplexity ou Copilot.

Il doit donner l'impression d'un véritable assistant intelligent intégré au produit, et non d'une simple boîte de dialogue ajoutée rapidement.

Le chatbot doit être :

- moderne ;
- rapide ;
- fluide ;
- lisible ;
- élégant ;
- responsive ;
- cohérent avec la direction artistique du projet ;
- connecté à l'état réel de l'application ;
- capable d'afficher autre chose que du texte grâce aux UIBlocks AG-UI.

Le chatbot doit servir de point d'entrée agentique naturel dans l'application.

Il doit permettre à l'utilisateur de :

- poser une question ;
- demander une action ;
- comprendre ce que l'agent est en train de faire ;
- visualiser des résultats structurés ;
- valider ou refuser une action sensible ;
- reprendre une conversation précédente ;
- démarrer une nouvelle conversation proprement ;
- atterrir sur une page d'accueil intelligente lorsque le contexte le demande.

### 29.2 Respect obligatoire de la direction artistique du projet

Avant de créer ou modifier le chatbot, l'agent de code doit inspecter la direction artistique existante du projet.

Il doit identifier :

- le logo du projet ;
- les couleurs principales ;
- les couleurs secondaires ;
- les typographies ;
- les rayons de bordure ;
- les ombres ;
- les espacements ;
- le style des boutons ;
- le style des cards ;
- le mode clair/sombre ;
- la logique responsive ;
- les composants UI déjà utilisés ;
- les éventuels design tokens ;
- les fichiers Tailwind, CSS variables, theme provider, UI kit ou design system.

Le chatbot doit utiliser ces éléments existants autant que possible.

Il ne faut pas créer un design générique sans rapport avec le produit.

Si un logo existe, il doit être utilisé dans l'expérience chatbot, par exemple :

- avatar de l'assistant ;
- icône du bouton flottant ;
- élément de branding sur l'écran d'accueil du chat ;
- loader ou animation subtile ;
- empty state ;
- header du panneau agent.

Si aucun logo n'est trouvé, créer un avatar textuel ou iconographique sobre, cohérent avec l'identité visuelle existante, et documenter ce choix dans `AG_UI_LOCAL_DOC.md`.

### 29.3 Création automatique si aucun chatbot n'existe

Si aucun chatbot, assistant, agent panel, support chat, conversation UI ou composant équivalent n'est trouvé, créer une interface complète.

Nom recommandé du composant selon la stack :

```text
AgentChat
AgentDock
AgentConversation
AgentLanding
AgentMessageList
AgentMessageBubble
AgentComposer
AgentThinkingIndicator
AgentStreamingText
AgentUIBlockRenderer
AgentConversationSidebar
```

L'agent de code doit placer ces composants dans l'architecture habituelle du projet, par exemple :

```text
components/agent/
features/agent/
src/components/agent/
src/features/agent/
app/components/agent/
```

selon la structure existante.

Le chatbot doit pouvoir être ouvert depuis :

- un bouton flottant si l'application s'y prête ;
- un item de navigation si l'application possède une sidebar ;
- une page dédiée `/agent`, `/assistant`, `/chat` ou équivalent si la stack le permet ;
- un panneau latéral global si l'application est une app SaaS/dashboard.

L'agent de code doit choisir l'intégration la plus naturelle selon le produit existant.

### 29.4 Ne pas atterrir bêtement au milieu d'une conversation

À l'ouverture du chatbot, l'utilisateur ne doit pas être jeté brutalement au milieu d'une ancienne conversation sans contexte.

Le comportement attendu est le suivant :

1. Si l'utilisateur ouvre le chatbot pour la première fois, afficher une landing conversationnelle élégante.
2. Si l'utilisateur n'a aucune conversation active, afficher une page d'accueil claire avec suggestions d'actions.
3. Si l'utilisateur revient après une longue absence, afficher un état de reprise propre : conversation récente disponible, bouton “reprendre”, bouton “nouvelle conversation”.
4. Si l'utilisateur est dans une page métier précise, proposer des prompts contextuels liés à cette page.
5. Si une conversation est déjà active dans la session courante, reprendre cette conversation de manière naturelle.

Le chatbot doit donc disposer d'un vrai **état d'accueil intelligent**.

Exemples d'éléments de landing :

- logo ou avatar du projet ;
- message d'accueil court ;
- exemples de questions ;
- actions rapides ;
- cards contextuelles ;
- bouton “Nouvelle conversation” ;
- bouton “Reprendre la dernière conversation” si pertinent ;
- indication claire de ce que l'agent peut faire dans l'application.

Exemple de texte générique, à adapter à la DA et au produit :

```text
Bonjour, je peux vous aider à comprendre, piloter et automatiser cette application.
Que souhaitez-vous faire ?
```

L'agent de code doit adapter ce texte au domaine réel de l'application.

### 29.5 Gestion intelligente des conversations

Le chatbot doit avoir une gestion de conversation proche des standards de ChatGPT ou Claude.

Fonctionnalités attendues selon faisabilité de la stack :

- création d'une nouvelle conversation ;
- conservation d'un historique local ou backend ;
- liste des conversations récentes ;
- titre automatique ou semi-automatique des conversations ;
- possibilité de reprendre une conversation ;
- possibilité d'effacer ou d'archiver une conversation ;
- distinction entre conversation active, ancienne conversation et nouvelle session ;
- état vide propre ;
- persistance raisonnable si une auth utilisateur existe ;
- fallback localStorage/sessionStorage si aucun backend d'historique n'existe ;
- stratégie propre de migration ultérieure vers une table backend.

Si le projet possède une base de données et un système utilisateur, créer ou proposer une structure de persistance.

Exemple de modèle conceptuel :

```text
Conversation
- id
- user_id
- title
- created_at
- updated_at
- metadata

Message
- id
- conversation_id
- role: user | assistant | system | tool
- content
- ui_blocks
- tool_calls
- created_at
- metadata
```

Si créer une migration DB est risqué, implémenter d'abord une persistance locale propre et documenter dans `AG_UI_LOCAL_DOC.md` la migration backend recommandée.

### 29.6 Règles de layout des messages

Le design des messages doit suivre les standards modernes de ChatGPT/Claude.

Règles obligatoires :

- Les messages de l'utilisateur sont alignés à droite.
- Les messages de l'assistant sont alignés à gauche.
- Les messages sont affichés dans des bulles ou blocs doux, sans bordure visible lourde.
- Les bulles doivent être sobres, modernes, aérées.
- Les bulles ne doivent pas avoir de contour agressif.
- L'espacement vertical doit être confortable.
- La largeur maximale des messages doit rester lisible.
- Le texte doit avoir une taille confortable.
- Les messages longs doivent être bien formatés.
- Les listes, tableaux, code blocks et citations doivent être lisibles.
- Les messages assistant peuvent être moins “bulle fermée” et plus bloc conversationnel selon la DA, comme Claude ou ChatGPT.
- Le design doit fonctionner en desktop et mobile.

Exemple d'intention visuelle :

```text
Utilisateur : bulle compacte, alignée droite, couleur accent très douce ou surface secondaire.
Assistant : bloc/bulle aligné gauche, fond discret, sans bordure lourde, avatar ou logo subtil.
```

Ne pas utiliser un style vieux “support client widget” avec bordures fortes, coins datés, couleurs criardes ou avatars génériques incohérents.

### 29.7 Composer moderne

Le champ de saisie doit être au niveau des assistants modernes.

Exigences :

- input ou textarea auto-resize ;
- bouton envoyer clair ;
- support Enter pour envoyer ;
- support Shift+Enter pour retour ligne ;
- état disabled pendant envoi si nécessaire ;
- bouton stop/cancel streaming si possible ;
- placeholder contextuel ;
- prise en compte du focus automatique au bon moment ;
- design cohérent avec les inputs de l'application ;
- adaptation mobile propre ;
- zone d'actions rapides au-dessus ou dans le landing state si utile.

Placeholder générique à adapter :

```text
Demandez à l'agent d'analyser, expliquer ou agir dans l'application...
```

### 29.8 Animation de réflexion de l'assistant

Avant que le texte de l'assistant commence à s'afficher, il doit y avoir une animation de réflexion élégante.

Cette animation correspond à l'état où :

- le message utilisateur a été envoyé ;
- l'agent prépare sa réponse ;
- aucun texte final n'a encore commencé à streamer ;
- éventuellement des outils ou recherches sont en cours.

L'animation doit être sobre et premium, dans l'esprit Claude/ChatGPT, mais adaptée à la DA du projet.

Elle peut prendre la forme de :

- trois petits points animés ;
- une ligne douce qui pulse ;
- un shimmer discret ;
- une petite vague lumineuse ;
- un mini-loader utilisant le logo ;
- une micro-animation de particules ou de halo si le produit a une DA plus créative.

Règles :

- l'animation doit être légère ;
- elle doit respecter les couleurs du projet ;
- elle ne doit pas distraire ;
- elle doit indiquer clairement que l'agent réfléchit ;
- elle doit s'arrêter dès que le texte commence à streamer ;
- elle doit être accessible, avec un texte invisible ou visible du type `L'assistant réfléchit...` ;
- elle doit respecter `prefers-reduced-motion`.

Exemple de comportement :

```text
1. L'utilisateur envoie son message.
2. Une ligne assistant apparaît à gauche.
3. L'avatar/logo est visible.
4. Une animation “réflexion” s'affiche : points, shimmer ou pulse.
5. Dès réception du premier TextMessageContent AG-UI, l'animation disparaît.
6. Le texte commence à s'écrire progressivement.
```

### 29.9 Animation d'écriture / streaming du texte

Le texte du chatbot doit apparaître avec une animation de remplissage moderne, similaire aux standards ChatGPT/Claude.

Cela ne veut pas dire simuler artificiellement une machine à écrire lente. Cela veut dire :

- afficher les tokens/deltas dès qu'ils arrivent ;
- rendre la progression fluide ;
- éviter les gros blocs qui apparaissent brutalement ;
- garder le scroll propre ;
- permettre à l'utilisateur de lire pendant que la réponse continue ;
- ne pas provoquer de sauts visuels désagréables.

Règles de streaming :

- utiliser les événements `TextMessageStart`, `TextMessageContent`, `TextMessageEnd` ;
- concaténer les deltas dans le message assistant courant ;
- afficher le contenu au fil de l'eau ;
- arrêter l'indicateur de réflexion au premier delta ;
- faire apparaître les paragraphes naturellement ;
- préserver le Markdown si utilisé ;
- rendre les blocs de code lisibles ;
- maintenir l'autoscroll seulement si l'utilisateur est déjà en bas de la conversation ;
- ne pas forcer le scroll si l'utilisateur remonte lire un message précédent.

Ajouter un état “Stop generating” si la stack le permet.

### 29.10 UIBlocks obligatoires pour une UX AG-UI excellente

Le chatbot ne doit pas se limiter à afficher du texte.

Il doit utiliser des **UIBlocks** pour rendre AG-UI réellement puissant en UX.

Un UIBlock est un composant d'interface structuré envoyé ou déclenché par l'agent, puis rendu côté frontend via une allowlist de composants sûrs.

Objectif : permettre à l'agent d'afficher des éléments riches comme :

- cards ;
- tableaux ;
- listes d'actions ;
- formulaires ;
- confirmations ;
- graphiques simples ;
- résumés structurés ;
- étapes de progression ;
- résultats de recherche ;
- détails d'entité métier ;
- boutons d'action ;
- sélecteurs ;
- previews ;
- alertes ;
- recommandations ;
- comparateurs ;
- timelines ;
- checklists.

Le projet doit inclure un composant de rendu du type :

```text
AgentUIBlockRenderer
```

Ce renderer doit :

- recevoir un bloc typé ;
- vérifier que le type est autorisé ;
- valider les props ;
- rendre le composant correspondant ;
- ignorer ou afficher proprement les blocs inconnus ;
- ne jamais exécuter de code arbitraire ;
- respecter la DA du projet.

Exemple de types de UIBlocks à supporter au minimum si possible :

```text
summary_card
action_card
confirmation_card
entity_card
data_table
metric_grid
progress_steps
suggestion_chips
form_block
chart_block
error_card
```

Exemple conceptuel :

```json
{
  "type": "confirmation_card",
  "id": "approve-delete-entity",
  "title": "Confirmer l'action",
  "description": "L'agent souhaite modifier cette donnée. Voulez-vous continuer ?",
  "actions": [
    { "id": "approve", "label": "Valider", "variant": "primary" },
    { "id": "reject", "label": "Annuler", "variant": "secondary" }
  ]
}
```

Les UIBlocks doivent être connectés aux événements AG-UI, en particulier :

```text
Custom app.render_component
ToolCallResult
ActivitySnapshot
ActivityDelta
StateSnapshot
StateDelta
```

L'agent de code doit créer une convention claire pour passer les UIBlocks dans les messages ou événements.

### 29.11 UIBlocks contextuels selon l'application

L'agent de code doit inspecter le domaine métier de l'application et créer des UIBlocks adaptés.

Exemples selon type d'app :

```text
SaaS CRM       -> client_card, deal_card, pipeline_summary, next_actions
Finance        -> metric_grid, risk_card, chart_block, scenario_table
Formation      -> learner_card, course_card, schedule_block, availability_table
E-commerce     -> product_card, order_timeline, refund_confirmation
Dashboard BI   -> kpi_card, data_table, chart_block, anomaly_card
RAG / Docs     -> source_card, citation_list, document_preview
Trading        -> trade_setup_card, risk_reward_card, market_snapshot
Admin panel    -> user_card, permission_diff, audit_log_card
```

Ne pas créer uniquement des composants abstraits. Ajouter au moins quelques blocs pertinents pour l'application réelle.

### 29.12 Actions rapides et suggestions intelligentes

Le chatbot doit proposer des suggestions utiles, surtout dans l'état d'accueil.

Ces suggestions doivent être adaptées :

- à la page actuelle ;
- au rôle utilisateur si disponible ;
- aux entités visibles ;
- aux fonctionnalités de l'app ;
- aux tâches récurrentes probables.

Exemples génériques :

```text
Analyser cette page
Résumer les données affichées
Créer un rapport
Trouver les anomalies
M'aider à configurer cette section
Expliquer ce graphique
Préparer une action
```

Les suggestions doivent être des chips ou boutons modernes, pas une simple liste texte.

### 29.13 Intégration à l'application entière

Le chatbot doit être connecté à toute l'application via l'AG-UI App State Adapter et les tools.

Il doit recevoir au minimum :

- la route actuelle ;
- le titre de la page ;
- l'utilisateur courant si disponible ;
- les entités sélectionnées ;
- les filtres actifs ;
- les données visibles importantes ;
- les permissions utilisateur ;
- les actions disponibles ;
- le contexte métier détecté.

Cela permet à l'agent de répondre de manière contextuelle.

Exemple :

```text
Si l'utilisateur est sur une page facture, le chatbot doit comprendre qu'il peut aider sur cette facture.
Si l'utilisateur est sur un dashboard, il doit pouvoir expliquer les KPIs affichés.
Si l'utilisateur est dans un calendrier, il doit pouvoir aider à planifier ou modifier des événements selon permissions.
```

### 29.14 Human-in-the-loop dans le chatbot

Toutes les actions sensibles doivent être validées via une UIBlock de confirmation.

Exemples d'actions sensibles :

- suppression ;
- envoi d'email ;
- modification de données ;
- paiement ;
- publication ;
- changement de permission ;
- action irréversible ;
- appel API externe coûteux ;
- export massif de données ;
- action sur plusieurs entités.

Le chatbot doit afficher une confirmation claire avec :

- action prévue ;
- impact ;
- entités concernées ;
- bouton valider ;
- bouton annuler ;
- éventuellement bouton modifier.

### 29.15 États vides, erreurs et limites

Le chatbot doit gérer proprement :

- aucun historique ;
- erreur réseau ;
- endpoint AG-UI indisponible ;
- tool call échoué ;
- action refusée ;
- message trop long ;
- absence de permissions ;
- conversation supprimée ;
- streaming interrompu ;
- session expirée.

Chaque état doit avoir une micro-copy claire et utile.

Exemple :

```text
Impossible de joindre l'agent pour le moment. Vous pouvez réessayer dans quelques secondes.
```

Ne jamais afficher d'erreur brute, stacktrace ou secret côté utilisateur.

### 29.16 Accessibilité et responsive design

Le chatbot doit respecter les bases d'accessibilité :

- navigation clavier ;
- focus visible ;
- aria-labels pour les boutons iconiques ;
- labels pour le composer ;
- contraste suffisant ;
- support screen reader raisonnable ;
- `prefers-reduced-motion` pour les animations ;
- fermeture via Escape si modal/panel ;
- piège de focus si drawer/modal.

Responsive :

- desktop : dock/panel confortable ;
- mobile : plein écran ou bottom sheet lisible ;
- input toujours accessible ;
- messages non coupés ;
- UIBlocks adaptés à la largeur disponible.

### 29.17 Performance

Le chatbot ne doit pas ralentir l'application.

Règles :

- lazy-load du chatbot si possible ;
- chargement différé des composants lourds ;
- streaming efficace ;
- éviter les re-renders inutiles ;
- virtualisation si historique très long ;
- mémoïsation des UIBlocks lourds ;
- nettoyage des EventSource/fetch streams au démontage ;
- annulation propre des requêtes via AbortController si JavaScript/TypeScript.

### 29.18 Fichiers ou composants à créer/modifier

Selon la stack, créer l'équivalent de :

```text
components/agent/AgentDock.*
components/agent/AgentChat.*
components/agent/AgentLanding.*
components/agent/AgentMessageList.*
components/agent/AgentMessageBubble.*
components/agent/AgentComposer.*
components/agent/AgentThinkingIndicator.*
components/agent/AgentStreamingText.*
components/agent/AgentUIBlockRenderer.*
components/agent/blocks/*
hooks/useAgentConversation.*
hooks/useAgentStream.*
hooks/useAgentAppContext.*
lib/ag-ui/client.*
lib/ag-ui/types.*
lib/ag-ui/ui-blocks.*
lib/ag-ui/conversation-store.*
```

Adapter les noms et extensions à la stack.

### 29.19 Tests UX obligatoires du chatbot

Ajouter ou adapter des tests pour vérifier :

1. Le chatbot s'ouvre correctement.
2. Le landing state apparaît quand aucune conversation n'est active.
3. Une nouvelle conversation peut être créée.
4. Un message utilisateur apparaît à droite.
5. Un message assistant apparaît à gauche.
6. L'indicateur de réflexion apparaît avant le streaming.
7. L'indicateur de réflexion disparaît au premier delta texte.
8. Le texte stream progressivement.
9. Les UIBlocks autorisés se rendent correctement.
10. Les UIBlocks inconnus ne cassent pas l'interface.
11. Une action sensible affiche une confirmation.
12. Le mobile reste utilisable.
13. L'historique ne force pas l'utilisateur à atterrir au milieu d'une ancienne conversation sans contexte.

Si les tests E2E ne sont pas disponibles, documenter comment tester manuellement ces points dans `AG_UI_LOCAL_DOC.md`.

### 29.20 Critères d'acceptation supplémentaires

En plus de la Definition of Done de la section 25, l'intégration n'est complète que si :

- [ ] Un chatbot IA existe ou le chatbot existant a été amélioré.
- [ ] Le chatbot respecte la DA du projet.
- [ ] Le logo du projet est utilisé si disponible.
- [ ] Le chatbot possède un landing state intelligent.
- [ ] L'utilisateur n'atterrit pas automatiquement au milieu d'une ancienne conversation sans contexte.
- [ ] Les messages utilisateur sont à droite.
- [ ] Les messages assistant sont à gauche.
- [ ] Les bulles/blocs sont modernes, sans bordure lourde.
- [ ] Une animation de réflexion existe avant la réponse.
- [ ] L'animation de réflexion s'arrête au début du streaming.
- [ ] Le texte s'affiche progressivement via streaming AG-UI.
- [ ] Le composer est moderne et responsive.
- [ ] Les conversations sont gérées proprement.
- [ ] Les UIBlocks sont implémentés via une allowlist.
- [ ] Au moins 3 UIBlocks pertinents pour l'application réelle existent.
- [ ] Les actions sensibles utilisent des UIBlocks de confirmation.
- [ ] Les états d'erreur sont propres et ne montrent aucun secret.
- [ ] Le chatbot est utilisable en mobile.
- [ ] Les tests UX disponibles passent ou sont documentés.

### 29.21 Prompt complémentaire pour l'agent de code

Ajouter ces instructions à tout prompt d'exécution Codex ou Claude Code :

```text
En plus de l'intégration AG-UI technique, vérifie si l'application possède déjà un chatbot IA ou une interface conversationnelle.

Par défaut, configure le runtime LLM du chatbot AG-UI avec OpenAI `gpt-4o-mini` afin de réduire les coûts. Le modèle doit être défini par variable d'environnement `AG_UI_MODEL=gpt-4o-mini`, jamais hardcodé, et doit rester facilement remplaçable. Si aucune clé `OPENAI_API_KEY` n'est disponible en développement, crée un fallback mock propre. En production, affiche une erreur claire si la clé manque.

Si elle n'en possède pas, crée un chatbot IA complet, moderne et premium, connecté à AG-UI et à toute l'application.

Le chatbot doit respecter la direction artistique du projet : couleurs, typographies, composants, espacements, radius, mode clair/sombre et logo si disponible. Utilise le logo comme avatar, bouton, header ou élément de landing lorsque c'est pertinent.

L'expérience doit être proche des standards ChatGPT/Claude : landing state intelligent, gestion propre des conversations, nouvelle conversation, reprise de conversation, messages utilisateur à droite, messages assistant à gauche, bulles ou blocs modernes sans bordure lourde, composer auto-resize, streaming fluide, animation de réflexion avant la réponse, puis disparition de cette animation dès le premier delta texte et affichage progressif du message assistant.

Ne fais pas atterrir l'utilisateur au milieu d'une ancienne conversation sans contexte. À l'ouverture, choisis intelligemment entre une landing conversationnelle, une nouvelle conversation, une reprise de session ou une conversation active.

Implémente des UIBlocks AG-UI via une allowlist sécurisée. Le chatbot doit pouvoir afficher des cards, confirmations, tableaux, métriques, étapes, suggestions et composants métier adaptés à l'application. Ajoute au moins 3 UIBlocks réellement pertinents pour ce projet.

Toutes les actions sensibles doivent passer par une UIBlock de confirmation human-in-the-loop.

Teste l'expérience : ouverture, landing, message user à droite, message assistant à gauche, animation de réflexion, streaming, UIBlocks, confirmation, mobile, erreurs propres. Documente tout dans AG_UI_LOCAL_DOC.md.
```

