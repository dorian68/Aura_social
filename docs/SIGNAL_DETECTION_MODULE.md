# Aura — Module de Détection de Signaux Sociaux

**Version:** 1.0  
**Statut:** Implémenté (migration v6)

---

## 1. Vision

Un fan connecte son Instagram. Il publie une story mentionnant le créateur.
Aura le détecte, valide automatiquement le défi "Post une story", lui attribue 200 pts.
Sans aucune intervention humaine.

C'est le cœur de l'OS Superfan : **la plateforme voit tout ce que les fans font, partout**.

---

## 2. Architecture générale

```
Fans (leurs réseaux connectés)
        │
        ▼
┌───────────────────────────────────────────────────────┐
│              SIGNAL SCANNERS (par plateforme)          │
│  Instagram  │  TikTok  │  YouTube  │  Twitch  │  Discord│
└───────────┬───────────────────────────────────────────┘
            │  RawSignal[]
            ▼
┌───────────────────────────┐
│     SIGNAL MATCHER        │  ← compare aux SignalRules du créateur
│  keywords · type · maxs   │
└───────────┬───────────────┘
            │  matched RawSignal + Rule
            ▼
┌───────────────────────────┐
│     SIGNAL PROCESSOR      │
│  dedup · INSERT · award   │
└───────────┬───────────────┘
            │
            ▼
        sf_platform_signals  +  sf_points_transactions
```

### Modes de déclenchement

| Mode | Mécanisme | Latence |
|---|---|---|
| **Pull / Scan manuel** | `POST /api/admin/signals/scan/[communityId]` | On-demand |
| **Scan schedulé** | Cron externe (ex: GitHub Actions toutes les 4h) | ~4h |
| **Webhook** | Plateforme pousse les événements en temps réel | <5s |

---

## 3. Modèle de données

### `sf_signal_rules`
Règles configurées par le créateur : quel signal → combien de points.

| Colonne | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID |
| `community_id` | TEXT FK | Communauté cible |
| `challenge_id` | TEXT FK? | Défi lié (auto-complété si signal matche) |
| `platform` | TEXT | instagram \| tiktok \| youtube \| twitch \| discord |
| `signal_type` | TEXT | post \| story \| video \| comment \| clip \| raid \| message |
| `keywords` | TEXT | JSON array — `[]` = tous les signaux de ce type qualifient |
| `points_reward` | INTEGER | Points attribués par signal détecté |
| `max_per_fan` | INTEGER? | Limite cumulative par fan (null = illimité) |
| `max_per_day` | INTEGER? | Limite globale par jour toutes sources confondues |
| `is_active` | INTEGER | 1 = actif |

### `sf_platform_signals`
Chaque action détectée (1 ligne = 1 contenu unique d'un fan).

| Colonne | Type | Description |
|---|---|---|
| `id` | TEXT PK | UUID |
| `fan_id` | TEXT FK | Fan concerné |
| `community_id` | TEXT FK | Communauté |
| `platform` | TEXT | Plateforme source |
| `signal_type` | TEXT | Type d'action |
| `content_id` | TEXT | ID natif du contenu (post_id, video_id…) |
| `content_url` | TEXT? | URL publique du contenu |
| `content_text` | TEXT? | Caption/titre/description — utilisé pour le matching |
| `matched_rule_id` | TEXT FK? | Règle qui a matché |
| `rewarded` | INTEGER | 0 ou 1 |
| `points_awarded` | INTEGER | Points réellement attribués |
| `detected_at` | TEXT | ISO timestamp |
| `rewarded_at` | TEXT? | ISO timestamp |
| UNIQUE | | `(fan_id, platform, content_id)` — protection anti-doublon absolue |

---

## 4. Système de règles (SignalRules)

### Logique de matching

```
Pour chaque signal détecté sur un fan :
  → Charger les rules actives pour la communauté (même plateforme)
  → Pour chaque rule :
      1. signal.signalType === rule.signalType ?
      2. keywords vide OU au moins un keyword dans contentText ?
      3. Fan n'a pas dépassé rule.maxPerFan ?
      4. Quota journalier rule.maxPerDay non atteint ?
  → Première rule qui matche → AWARD
```

### Exemples de règles

```json
[
  {
    "platform": "instagram",
    "signalType": "post",
    "keywords": ["@dorian_aura", "#aurafan"],
    "pointsReward": 150,
    "maxPerFan": null
  },
  {
    "platform": "instagram",
    "signalType": "story",
    "keywords": [],
    "pointsReward": 50,
    "maxPerFan": 1,
    "challengeId": "chal_story_weekly"
  },
  {
    "platform": "tiktok",
    "signalType": "video",
    "keywords": ["#aurafan", "aura by dorian"],
    "pointsReward": 300,
    "maxPerFan": null
  },
  {
    "platform": "youtube",
    "signalType": "video",
    "keywords": ["aura", "dorian"],
    "pointsReward": 200,
    "maxPerFan": 3
  },
  {
    "platform": "twitch",
    "signalType": "clip",
    "keywords": [],
    "pointsReward": 100,
    "maxPerFan": null
  },
  {
    "platform": "discord",
    "signalType": "message",
    "keywords": ["@everyone", "fan"],
    "pointsReward": 25,
    "maxPerFan": 5
  }
]
```

---

## 5. Implémentation par plateforme

### 5.1 Instagram

**Mode:** Pull (access_token fan) + Webhook (mentions)

**Endpoint pull:**
```
GET https://graph.instagram.com/me/media
  ?fields=id,caption,timestamp,media_type,permalink
  &access_token={FAN_TOKEN}
  &since={UNIX_TIMESTAMP_LAST_SCAN}
```

**Signaux produits:**
- `media_type = IMAGE | CAROUSEL_ALBUM` → `signal_type: "post"`
- `media_type = VIDEO` → `signal_type: "post"` (Reels)
- `media_type = STORY` → `signal_type: "story"` (si accessible)

**Matching:** caption du post (hashtags, mentions @handle)

**Webhook Instagram:**
```
POST /api/signals/webhook/instagram
  X-Hub-Signature-256: sha256(payload, META_APP_SECRET)
Body: { object: "instagram", entry: [{ changes: [{ field: "mentions" }] }] }
```

**Pré-requis:** Meta App en mode Live, `instagram_manage_mentions` scope

**Token expiry:** Basic Display API tokens → 60 jours (long-lived). À rafraîchir avec:
```
GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token={TOKEN}
```

---

### 5.2 TikTok

**Mode:** Pull (access_token fan)

**Endpoint pull:**
```
POST https://open.tiktokapis.com/v2/video/list/
Headers: Authorization: Bearer {FAN_TOKEN}
Body: { fields: ["id","title","create_time","share_url","description"], max_count: 20 }
```

**Signaux produits:**
- Toute vidéo → `signal_type: "video"`

**Matching:** `title` + `description` du post

**Token expiry:** TikTok access_tokens → 24h. Refresh via:
```
POST https://open.tiktokapis.com/v2/oauth/token/
  grant_type=refresh_token&refresh_token={TOKEN}&client_key=...&client_secret=...
```

**Note:** TikTok sandbox ne donne accès qu'aux vidéos du même développeur. En production, demander `video.list` scope approuvé.

---

### 5.3 YouTube

**Mode:** Pull (access_token fan via Google OAuth)

**Étapes:**
1. Récupérer channel ID : `GET /youtube/v3/channels?part=id&mine=true`
2. Lister les vidéos récentes : `GET /youtube/v3/search?part=snippet&channelId={ID}&type=video&order=date&publishedAfter={DATE}`

**Signaux produits:**
- Upload vidéo → `signal_type: "video"`
- Commentaire (scope `youtube.force-ssl`) → `signal_type: "comment"`

**Matching:** `snippet.title` + `snippet.description`

**Token expiry:** Google OAuth access_tokens → 1h. Refresh automatique si `refresh_token` présent.

---

### 5.4 Twitch

**Mode:** Pull (token créateur pour clips) + EventSub (raids/subscriptions)

**Pull clips du canal créateur:**
```
GET https://api.twitch.tv/helix/clips
  ?broadcaster_id={CREATOR_TWITCH_ID}
  &started_at={ISO_DATE}
Headers: Authorization: Bearer {CREATOR_TOKEN}, Client-Id: {TWITCH_CLIENT_ID}
```
→ Filtrer les clips dont `creator_id` matche l'ID Twitch du fan.

**Signaux produits:**
- Clip créé → `signal_type: "clip"`, `contentId: clip.id`

**EventSub (webhook temps réel):**
```
POST https://api.twitch.tv/helix/eventsub/subscriptions
  type: "channel.raid" (fan raid vers créateur)
  type: "channel.subscribe" (fan s'abonne)
```

**Pré-requis:** App Twitch validée, `clips:read` scope, EventSub nécessite URL HTTPS publique.

---

### 5.5 Discord

**Mode:** Bot webhook (event-driven, pas de pull)

**Architecture:**
1. Créateur invite le bot Aura dans son serveur Discord
2. Bot écoute tous les messages dans les channels configurés
3. Bot détecte keywords → POST `/api/signals/webhook/discord` avec `{ userId, guildId, messageId, content }`
4. Aura mappe `userId` (Discord ID du fan stocké dans `sf_fan_platform_accounts.metadata.discord_id`)

**Signaux produits:**
- Message avec keyword → `signal_type: "message"`, `contentId: message_id`

**Bot token:** Variable d'env `DISCORD_BOT_TOKEN` (séparé du OAuth client).

**Note:** Le bot nécessite les intents `GUILD_MESSAGES` + `MESSAGE_CONTENT` (intent privilégié, à activer dans le portail Discord Developer).

---

## 6. Protection anti-doublon

### Niveau DB
```sql
UNIQUE(fan_id, platform, content_id)
```
Un `INSERT OR IGNORE` suffit — si le contenu a déjà été vu, il n'est pas réinséré.

### Niveau règle
- `max_per_fan` : comptage de `sf_platform_signals WHERE fan_id=? AND matched_rule_id=? AND rewarded=1`
- `max_per_day` : comptage sur `WHERE matched_rule_id=? AND DATE(detected_at)=DATE('now')`

### Niveau token
- Si le token a expiré → skip le scan, log `"token_expired"` dans metadata, ne pas marquer comme erreur fatale
- Si l'API retourne 429 (rate limit) → retry après 60s, max 2 retries

---

## 7. Flux complet (exemple Instagram)

```
1. Admin crée une règle :
   platform=instagram, signalType=post, keywords=["#aurafan"], pointsReward=150

2. Fan Marie connecte son Instagram via OAuth →
   sf_fan_platform_accounts(fan_id=marie, platform=instagram, access_token=xxx)

3. Marie publie un post avec caption "Trop bien ce club ! #aurafan"

4. Scan déclenché (manuel ou cron) :
   scanCommunity("community-123")
   → getFansInCommunity("community-123") [Marie...]
   → getFanPlatformToken(marie, "instagram") → access_token
   → instagram.scan(token, last_scanned_at)
     → GET graph.instagram.com/me/media?since=...
     → Reçoit { id: "17890", caption: "Trop bien ce club ! #aurafan", timestamp: ... }
   → RawSignal { platform: "instagram", contentId: "17890", contentText: "...", signalType: "post" }

5. matchSignal(signal, rules)
   → rule: instagram/post/["#aurafan"]/150pts
   → "#aurafan" IN "Trop bien ce club ! #aurafan" ✓
   → fan_count(marie, rule) = 0 < max_per_fan (null) ✓
   → MATCH

6. processSignal(marie, community, signal, rule)
   → INSERT INTO sf_platform_signals (fan_id=marie, content_id="17890", rewarded=0)
   → Signal nouveau ? OUI
   → awardPoints(marie, community, 150, "instagram_signal", signal_id, "#aurafan post détecté")
   → UPDATE sf_platform_signals SET rewarded=1, points_awarded=150, rewarded_at=NOW()
   → Si challengeId dans rule → createCompletion(challengeId, marie) + approveCompletion()

7. updateFanPlatformLastScanned(marie, "instagram")

8. Marie reçoit +150 pts sans rien faire manuellement.
```

---

## 8. API Reference

| Route | Méthode | Description |
|---|---|---|
| `/api/admin/signals/rules/[communityId]` | GET | Lister les règles d'une communauté |
| `/api/admin/signals/rules/[communityId]` | POST | Créer une règle |
| `/api/admin/signals/rules/[ruleId]` | PATCH | Modifier une règle |
| `/api/admin/signals/rules/[ruleId]` | DELETE | Désactiver une règle |
| `/api/admin/signals/scan/[communityId]` | POST | Déclencher un scan manuel |
| `/api/admin/signals/[communityId]` | GET | Lister les signaux détectés |
| `/api/signals/webhook/instagram` | GET+POST | Endpoint webhook Instagram (vérification + événements) |
| `/api/signals/webhook/tiktok` | POST | Endpoint webhook TikTok |
| `/api/signals/webhook/discord` | POST | Endpoint webhook Discord bot |

---

## 9. Variables d'environnement requises

```env
# Instagram / Meta (déjà présents)
META_APP_ID=...
META_APP_SECRET=...

# TikTok
TIKTOK_CLIENT_KEY=...
TIKTOK_CLIENT_SECRET=...

# YouTube / Google (déjà présents)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...

# Twitch
TWITCH_CLIENT_ID=...
TWITCH_CLIENT_SECRET=...

# Discord
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_BOT_TOKEN=...        # Bot token (séparé de l'OAuth client)
DISCORD_WEBHOOK_SECRET=...   # Secret HMAC pour valider les payloads du bot

# Sécurité webhooks
SIGNAL_WEBHOOK_SECRET=...    # Secret partagé pour valider les webhooks entrants
```

---

## 10. Limites actuelles et roadmap

| Limite | Raison | Solution future |
|---|---|---|
| Instagram Stories non accessibles via API | Basic Display API ne les expose pas | Passer à l'API Creator/Business après vérification Meta |
| TikTok vidéos privées non lisibles | Token fan ne donne accès qu'aux vidéos publiques | RAS (comportement voulu) |
| Discord nécessite un bot invité | Discord ne permet pas de lire les messages sans bot | Guide d'invitation bot dans le dashboard |
| Twitch clips pull = 4h de latence | Pull-based uniquement | Implémenter EventSub HTTPS webhooks |
| Pas de refresh token automatique | Non implémenté v1 | Cron de refresh + alerte si token expiré |
| YouTube comments non scannés | Scope `youtube.force-ssl` non demandé | Ajouter le scope + commenter detection |
