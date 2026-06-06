# Instagram creator audit

Ce script collecte les statistiques d'un compte Instagram Business/Creator que vous administrez via l'API officielle Instagram Graph API.

Il ne demande jamais le mot de passe Instagram et ne contourne pas les protections d'Instagram. Pour un compte tiers, vous n'aurez pas les insights prives du createur.

## Prerequis

- Un compte Instagram Business ou Creator.
- Un token Meta/Instagram valide avec les permissions approuvees pour lire le profil, les medias et les insights.
- L'ID Instagram professionnel du compte (`INSTAGRAM_IG_USER_ID`).

Ajoutez les variables dans `.env` :

```bash
INSTAGRAM_ACCESS_TOKEN=EA...
INSTAGRAM_IG_USER_ID=1784...
INSTAGRAM_GRAPH_VERSION=v23.0
```

## Lancer une analyse

```bash
npm run instagram:audit -- --username moncompte --days 30 --limit 100
```

Sorties generees dans `data/instagram` :

- `<username>-audit-<date>.json` : rapport complet avec profil, insights, posts, top posts et warnings.
- `<username>-posts-<date>.csv` : tableau exploitable dans Excel/Sheets.
- `<username>-follower-history.csv` : historique local des abonnes a chaque execution.

## Donnees collectees

- Profil : username, bio, nombre d'abonnes, abonnements, nombre de medias.
- Evolution : croissance des abonnes exposee par l'API sur la periode demandee, plus snapshots locaux a chaque run.
- Posts : date, type, caption, likes, commentaires, lien, taux d'engagement.
- Insights quand disponibles : reach, views, saves, shares, total interactions, profile views, website clicks.
- Classements : meilleurs posts par engagement, likes, commentaires et vues.

Certaines metriques changent selon la version Graph API, le type de media et les droits du token. Le script ignore les metriques refusees et les liste dans `warnings`.

## Suivre l'evolution

L'API ne permet pas toujours de reconstruire tout l'historique total des abonnes avant votre premier releve. Pour suivre l'evolution proprement, planifiez le script tous les jours, puis utilisez `data/instagram/<username>-follower-history.csv`.
