# CrazyCurve

> Multiplayer real-time Curve Fever clone — TypeScript · PixiJS 8 · Socket.io · Node.js

![Phase](https://img.shields.io/badge/phase-4%20%E2%80%93%20Bots%20%26%20Missiles-orange)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D22-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7%20strict-blue)

---

## Table des matières

- [Aperçu](#aperçu)
- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Power-ups](#power-ups)
- [Bots IA](#bots-ia)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Mode multijoueur](#mode-multijoueur)
- [Déploiement Docker](#déploiement-docker)
- [Déploiement O2Switch](#déploiement-o2switch)
- [Structure du projet](#structure-du-projet)
- [Roadmap](#roadmap)
- [FAQ](#faq)

---

## Aperçu

Les joueurs contrôlent une courbe qui se déplace en continu et laisse une traîne. Toucher une traîne ou un mur = mort. Dernier survivant = point. Premier à **5 points** gagne la partie. Des power-ups apparaissent sur l'arène et modifient les règles du jeu. Des **bots IA** peuvent remplacer n'importe quel joueur humain.

```
┌─────────────────────────────────────────┐
│  ···                               ···  │
│     ╲          ⚡FAST               ╱    │
│      ╲   P1 ●──────────          ╱      │
│       ╲    [SHIELD]    🤖BOT     ╱       │
│        ╲      🚀FIRE ●──────────╱        │
│         ──────────────────────          │
│  P1: FAST  GHOST        BOT: HARD       │
└─────────────────────────────────────────┘
   P1: ← →      P2: BOT (HARD)    Round 3 / 5
```

---

## Architecture

### Vue d'ensemble

```mermaid
graph TD
    subgraph Client["🖥️ Client (Browser)"]
        UI["DOM — Menus · Lobby · HUD · Effets actifs"]
        PIXI["PixiJS 8 WebGL\nTrailLayer · GameRenderer · PowerUpLayer"]
        ENGINE_C["GameEngine (local)"]
        BOT["BotController ×N\nRay-cast look-ahead"]
        NET["NetworkManager\nSocket.io-client"]
        AUDIO["AudioManager\nWeb Audio API"]
    end

    subgraph Server["⚙️ Server (Node.js / Docker)"]
        EXPRESS["Express\nServe dist/ en prod"]
        SIO["Socket.io Server"]
        RM["RoomManager"]
        ROOM["Room ×N — GameEngine @ 30 Hz\nPowerUpSystem · CollisionSystem · MissileSystem"]
    end

    UI --> PIXI
    PIXI --> ENGINE_C
    ENGINE_C --> AUDIO
    BOT --> ENGINE_C
    NET -->|"WebSocket / polling fallback"| SIO
    SIO --> RM --> ROOM
    EXPRESS -->|"dist/ statique"| Client
```

### Boucle de jeu (mode online)

```mermaid
sequenceDiagram
    participant C1 as Client P1
    participant SRV as Server Room (30 Hz)
    participant C2 as Client P2

    loop Toutes les 33 ms
        C1->>SRV: input { left, right, tick }
        C2->>SRV: input { left, right, tick }
        SRV->>SRV: engine.update() — collision + power-ups + missiles
        SRV->>C1: tick { players[], pickups[], missiles[], events[], scores }
        SRV->>C2: tick { players[], pickups[], missiles[], events[], scores }
    end
    C1->>C1: interpolation + TrailLayer.drawNewPoints() @ 60 fps
    C2->>C2: interpolation + TrailLayer.drawNewPoints() @ 60 fps
```

### Interpolation réseau

```
Server tick arrives (33 ms)      60 fps render frames
        │                         │    │    │    │
        ▼                         ▼    ▼    ▼    ▼
  prevPos = currentPos      x = lerp(prev, target, Δt/33ms)
  targetPos = snap.x/y      head moves smoothly between ticks
  lastTickAt = now()        trail painted at authoritative pos
```

Les positions `x/y/angle` de `ShadowCurve` sont des **getters** qui calculent `lerp(prev, target, α)` à chaque appel via `performance.now()` — fluidité 60 fps depuis des ticks 30 Hz sans client-side prediction.

### Collision — Bitmap O(1)

```
Arena 800×600 → Uint8Array (480 000 octets)
  0 = vide   1 = P1   2 = P2 … 6 = P6

paint(x, y, id, r)  → écriture circulaire rayon r (variable : THIN/THICK)
check(x, y)         → lecture 1 pixel → collision instantanée
erase(x, y, r)      → remise à 0 circulaire (power-up ERASE / missile)
```

---

## Fonctionnalités

### Phase 1 ✅ — Prototype local

| Feature | Détail |
|---|---|
| Moteur déterministe | `core/GameEngine` — sans dépendance DOM, réutilisable côté serveur |
| Rendu WebGL | PixiJS 8, TrailLayer incrémental sur RenderTexture |
| Collision bitmap | Uint8Array O(1), indépendant de la taille des traînes |
| Trous aléatoires | Gaps dans la traîne (mécanique tactique) |
| 2 joueurs local | P1 `← →` · P2 `A D` · même clavier |
| Rounds & scoring | 5 rounds pour gagner |

### Phase 2 ✅ — Multijoueur en ligne

| Feature | Détail |
|---|---|
| Serveur autoritaire | Node.js + Socket.io, boucle fixe 30 Hz |
| Rooms dynamiques | Jusqu'à 6 joueurs, auto-start à 2 |
| Protocol typé | Types Socket.io partagés client↔serveur (TypeScript) |
| Fallback polling | Compatible Passenger/Apache (O2Switch) |
| Lobby temps réel | Liste joueurs, code room, saisie du nom |
| IGameState interface | Renderer unique pour mode local ET réseau |
| Interpolation réseau | `ShadowCurve` lerp — 60 fps fluide depuis ticks 30 Hz |

### Phase 3 ✅ — Power-ups & UX

| Feature | Détail |
|---|---|
| 10 power-ups | FAST · SLOW · REV · FREEZE · GHOST · THIN · THICK · WARP · SHIELD · ERASE |
| Spawn dynamique | Toutes les ~6 s, max 5 actifs, position safe aléatoire |
| Radius variable | Traîne fine (×0.5) / épaisse (×2.5) — collision bitmap adapté |
| HUD effets actifs | Labels colorés pré-alloués au-dessus de chaque score |
| Flèche de direction | Flèche sur la tête pendant le décompte (Curve Fever classique) |
| Saisie du nom | `NameInputScene` — champ texte, touche Entrée, fallback aléatoire |
| Scoreboard final | Trié par score, noms réels + couleurs, 👑 gagnant |
| Sons Web Audio | 8 sons synthétisés — aucun fichier audio requis |
| Effets réseau | `erase_zone` · `pickup` propagés dans `TickPayload.events` |

### Phase 4 ✅ — Bots, Missiles, Docker, CI/CD

| Feature | Détail |
|---|---|
| Bots IA | Ray-cast look-ahead, 3 niveaux : EASY / MEDIUM / HARD |
| Bot setup UI | Toggle BOT par joueur dans `PlayerSetupScene`, sélection de difficulté |
| Missiles | Power-up FIRE — projectile à 3.5× la vitesse, tue au contact, efface la traîne |
| Missiles réseau | `missiles: MissileSnapshot[]` dans chaque `TickPayload`, `missile_hit` event |
| Docker | Multi-stage build Node 22 Alpine — image production légère |
| CI/CD | GitHub Actions : lint + test + `build:all` sur push `main`/`claude/**` |
| Son missile | `missileHit()` — carré 880 Hz + sawtooth 440 Hz |

---

## Power-ups

Les pickups apparaissent comme des cercles animés (pulsation) avec leur label. Collecte par proximité (rayon 12 px).

| Icône | Nom | Effet | Cible | Durée |
|---|---|---|---|---|
| ⚡ | **FAST** | Vitesse ×1.7 | Soi | 5 s |
| 🐌 | **SLOW** | Vitesse ×0.5 | Adversaires | 5 s |
| ↔ | **REV** | Contrôles inversés gauche↔droite | Adversaires | 4 s |
| ❄ | **FREEZE** | Immobilise complètement | Adversaires | 3 s |
| 👻 | **GHOST** | Traîne invisible, passe à travers les trails | Soi | 4 s |
| — | **THIN** | Traîne fine (radius ×0.5) | Soi | 6 s |
| █ | **THICK** | Traîne épaisse (radius ×2.5) | Adversaires | 4 s |
| ✦ | **WARP** | Téléportation aléatoire + gap de sécurité | Soi | instant |
| 🛡 | **SHIELD** | Absorbe 1 collision de traîne, puis se consomme | Soi | 10 s |
| ⊗ | **ERASE** | Efface traînes bitmap + visuel dans un disque 44 px | Soi | instant |
| 🚀 | **FIRE** | Lance un missile dans la direction actuelle | Soi | instant |

### Interactions remarquables

- **GHOST + THICK adversaire** : tu passes dans leur traîne épaisse sans mourir
- **SHIELD + REV** : bouclier actif mais contrôles inversés — désorientation totale
- **ERASE** : l'effacement visuel utilise `blendMode: 'erase'` PixiJS — les pixels deviennent transparents (pas juste masqués)
- **WARP** : la courbe réapparaît avec un gap temporaire (20 frames) pour éviter l'auto-collision
- **FIRE** : le missile voyage à 3.5× la vitesse de courbe ; contact direct = mort instantanée ; impact sur une traîne = érase un disque de 10 px sur le bitmap

---

## Bots IA

### Configuration

Dans l'écran de setup (`PlayerSetupScene`), chaque slot joueur dispose d'un bouton **BOT**. Quand il est activé (rouge), les boutons de touches sont remplacés par un sélecteur de difficulté.

```
┌─ PLAYER 2 ──────────────────────┐
│  [BOT ✓]  [EASY] [MEDIUM] [HARD]│
└─────────────────────────────────┘
```

### Algorithme — Ray-cast look-ahead

Le bot simule N pas devant lui dans 3 directions (tout droit, gauche×3, droite×3 fois le `turnRate`) en appelant `CollisionSystem.checkWall()` et `CollisionSystem.checkTrail()`. Il choisit la direction avec le plus de pas libres.

```
Difficulté  │ Pas scannés │ Bruit de décision
────────────┼─────────────┼───────────────────
EASY        │     12      │     ±25 %
MEDIUM      │     30      │     ±8 %
HARD        │     60      │      0 %
```

Les bots HARD traquent en plus le pickup le plus proche quand la voie droite est dégagée sur 20+ pas.

### Code

```typescript
// BotController.computeInput() — simplifié
const straight  = scan(x, y, angle,                 speed, r, collision);
const leftFree  = scan(x, y, angle - turnRate * 3,  speed, r, collision);
const rightFree = scan(x, y, angle + turnRate * 3,  speed, r, collision);
const best = Math.max(straight, leftFree, rightFree);
if (best === straight && straight > 4) return { left: false, right: false };
if (leftFree >= rightFree)             return { left: true,  right: false };
return                                        { left: false, right: true  };
```

---

## Sons

`AudioManager` utilise la **Web Audio API** pure — aucun fichier audio, sons synthétisés par oscillateurs.

| Évènement | Son |
|---|---|
| Décompte 3, 2, 1 | Bip carré court (523 Hz) |
| GO ! | Deux tons ascendants (784 → 1047 Hz) |
| Mort | Ton sawtooth grave descendant |
| Pickup standard | Deux bips aigus montants |
| SHIELD activé | Confirmation harmonique |
| ERASE | Deux tons descendants |
| **Impact missile** | **Carré 880 Hz + sawtooth 440 Hz** |
| Victoire round | Arpège montant 3 notes |
| Victoire partie | Arpège montant 4 notes |

> Le contexte audio est déverrouillé au premier `pointerdown` (contrainte navigateur).

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Rendu | PixiJS (WebGL) | 8.x |
| Frontend | TypeScript strict | 5.7 |
| Build | Vite | 6.x |
| Réseau client | Socket.io-client | 4.x |
| Serveur HTTP | Express | 4.x |
| Temps réel | Socket.io | 4.x |
| Runtime serveur | Node.js | 22 |
| Bundle prod | esbuild | 0.25 |
| Tests | Vitest | 2.x |
| Qualité | ESLint 9 + Prettier 3 | — |
| Conteneurisation | Docker (multi-stage) | — |
| CI/CD | GitHub Actions | — |

---

## Démarrage rapide

### Prérequis

```bash
node -v   # >= 22
npm -v    # >= 10
```

### Installation

```bash
git clone https://github.com/artkabis/crazycurve.git
cd crazycurve
git checkout claude/finalize-project-sZMVX
npm install
```

### Mode local (1–6 joueurs, humains et/ou bots)

```bash
npm run dev
# → http://localhost:5173   Cliquer "LOCAL"
# Dans PlayerSetupScene : activer BOT sur les slots voulus, choisir la difficulté
```

### Mode multijoueur (développement)

```bash
# Terminal 1
npm run server:dev

# Terminal 2
npm run dev
# Ouvrir 2 onglets sur http://localhost:5173 → ONLINE → saisir son nom → JOIN
```

| Joueur | Gauche | Droite |
|---|---|---|
| P1 | `←` | `→` |
| P2 | `A` | `D` (ou BOT) |
| Online | `←` | `→` (chaque joueur sur sa machine) |

---

## Mode multijoueur

### Flow de connexion

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant C as Client
    participant S as Serveur

    U->>C: Clic "ONLINE"
    C->>C: NameInputScene — saisie du nom
    C->>S: connect()
    S-->>C: connected
    C->>S: join { name }
    S-->>C: room_joined { roomId, yourPlayerId }
    C->>C: Affiche LobbyScene
    Note over S: 2e joueur rejoint → auto-start
    S-->>C: game_start
    C->>C: Lance NetworkGameScene
    loop 30 Hz (serveur) / 60 fps (rendu)
        C->>S: input { left, right, tick }
        S-->>C: tick { players, pickups, missiles, phase, scores, events }
        C->>C: interpolation lerp + rendu pickups + missiles + sons
    end
    S-->>C: event game_over → GameOverScene scoreboard
```

### Protocole réseau

**Client → Serveur**
```ts
socket.emit('join',  { name: string, roomId?: string })
socket.emit('input', { tick: number, left: boolean, right: boolean })
```

**Serveur → Client**
```ts
socket.on('room_joined',   ({ roomId, yourPlayerId, players }))
socket.on('player_joined', (player: PlayerInfo))
socket.on('game_start',    ())
socket.on('tick',          ({
  tick, phase, round, countdown,
  players:  PlayerSnapshot[],   // x, y, angle, trailRadius, ghostTrail, activeEffects
  pickups:  PickupSnapshot[],   // id, x, y, type
  missiles: MissileSnapshot[],  // id, x, y, angle, ownerId
  events:   NetGameEvent[],     // player_died | round_over | game_over | erase_zone | missile_hit
  scores:   Record<number, number>
}))
socket.on('error', (message: string))
```

---

## Déploiement Docker

```bash
# Construire l'image
docker build -t crazycurve .

# Lancer (port 3001 exposé)
docker run -p 3001:3001 crazycurve

# Ouvrir http://localhost:3001
```

Le `Dockerfile` utilise un **build multi-stage** :

1. `node:22-alpine` builder — `npm ci` + `npm run build:all`
2. Runtime image — copie uniquement `dist/` et `server/dist/` → image légère

### Docker Compose (optionnel)

```yaml
services:
  crazycurve:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---

## Déploiement O2Switch

> Architecture : **tout-en-un** — Express sert `dist/` (front) + Socket.io (back) sur le port géré par Phusion Passenger.

### Étape 1 — Builder en local

```bash
npm run build:all
# → dist/                    (frontend Vite)
# → server/dist/server.cjs   (backend bundlé esbuild, prêt pour Node)
```

### Étape 2 — Configurer dans cPanel

```
cPanel → Setup Node.js App → Create Application

  Node.js version   : 22.x
  Application mode  : Production
  Application root  : /home/<user>/crazycurve
  Application URL   : game.tondomaine.fr
  Startup file      : server/dist/server.cjs
```

**Variables d'environnement** (cPanel → Node.js App → Env Vars) :

```
NODE_ENV = production
```

> `PORT` est injecté automatiquement par Passenger — ne pas le redéfinir.

### Étape 3 — Déployer via SSH

```bash
ssh user@ssh.tonserveur.o2switch.net
cd ~/crazycurve
git pull origin claude/finalize-project-sZMVX
npm install --omit=dev
npm run build:all
# Puis : cPanel → Node.js App → Restart
```

### Étape 4 — Vérifier

```bash
curl https://game.tondomaine.fr/health
# {"status":"ok","uptime":12.3,"rooms":0}
```

### Notes spécifiques O2Switch

| Point | Comportement |
|---|---|
| WebSockets | Tentés en priorité via LiteSpeed |
| Fallback | Polling HTTP automatique si WS bloqués |
| PORT | Injecté par Passenger — ne pas hardcoder |
| Restart | cPanel ou `touch tmp/restart.txt` |
| Logs | cPanel → Errors / Node.js App logs |

---

## Structure du projet

```
crazycurve/
├── src/                           # Frontend
│   ├── core/                      # ← Isomorphe client/serveur
│   │   ├── constants.ts           # Arena, physics, palette, power-up configs, BotDifficulty
│   │   ├── types.ts               # IGameState, MissileRenderData, PowerUpType, GameEvents…
│   │   ├── EventEmitter.ts        # Émetteur générique typé
│   │   ├── GameEngine.ts          # Machine d'état + PowerUpSystem + MissileSystem intégrés
│   │   ├── ai/
│   │   │   └── BotController.ts   # Ray-cast look-ahead, 3 difficultés (easy/medium/hard)
│   │   ├── entities/
│   │   │   ├── Curve.ts           # Physique, gaps, effets actifs, bouclier, téléport
│   │   │   ├── PowerUp.ts         # Entité Pickup (id, position, type)
│   │   │   └── Missile.ts         # Projectile — avance, meurt aux bords de l'arène
│   │   └── systems/
│   │       ├── CollisionSystem.ts # Bitmap O(1) — paint / check / erase (radius variable)
│   │       ├── PowerUpSystem.ts   # Spawn · collecte · application · callbacks événements
│   │       ├── MissileSystem.ts   # Fire, update, kill curves, erase trail bitmap
│   │       └── ScoreSystem.ts
│   ├── renderer/
│   │   ├── TrailLayer.ts          # RenderTexture incrémentale + erase (blendMode)
│   │   ├── GameRenderer.ts        # IGameState → scène PixiJS, HUD effets, missiles
│   │   └── PowerUpLayer.ts        # Cercles pulsants animés pour les pickups
│   ├── audio/
│   │   └── AudioManager.ts        # Web Audio API — 9 sons synthétisés, unlock sur gesture
│   ├── input/InputManager.ts
│   ├── network/
│   │   ├── protocol.ts            # MissileSnapshot, TickPayload, NetGameEvent (missile_hit)
│   │   ├── NetworkManager.ts      # Client WS + polling fallback
│   │   └── NetworkGameState.ts    # IGameState ← ticks serveur + interpolation lerp + missiles
│   ├── scenes/
│   │   ├── MenuScene.ts           # Local / Online
│   │   ├── NameInputScene.ts      # Saisie du nom avant de rejoindre
│   │   ├── PlayerSetupScene.ts    # Setup joueurs — BOT toggle + sélecteur difficulté
│   │   ├── GameScene.ts           # Mode local — ticker PixiJS + injection inputs bots
│   │   ├── NetworkGameScene.ts    # Mode online — ticks · interpolation · sons · erase · missiles
│   │   ├── LobbyScene.ts          # Salle d'attente
│   │   └── GameOverScene.ts       # Scoreboard complet trié, 2–6 joueurs
│   ├── app.ts                     # Orchestrateur principal + câblage audio/events + bots
│   ├── main.ts
│   └── style.css
│
├── server/
│   ├── src/
│   │   ├── game/
│   │   │   ├── Room.ts            # Boucle 30 Hz, GameEngine, missiles → TickPayload
│   │   │   └── RoomManager.ts     # Registre rooms, auto-start à MIN_PLAYERS
│   │   └── server.ts              # Express + Socket.io + dist/ en prod + /health
│   └── tsconfig.json
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # lint + test + build:all sur push main/claude/**
│
├── Dockerfile                     # Multi-stage Node 22 Alpine — builder + runtime
├── index.html
├── package.json                   # Scripts : dev, build:all, start, server:dev
├── tsconfig.json
├── vite.config.ts                 # Proxy /socket.io → :3001 en dev
├── eslint.config.js
└── prettier.config.js
```

---

## Roadmap

```mermaid
gantt
    title CrazyCurve — Roadmap
    dateFormat  YYYY-MM
    section Phase 1
    Moteur + rendu local          :done, 2026-04, 1w
    section Phase 2
    Serveur + client réseau       :done, 2026-04, 1w
    Adaptation O2Switch           :done, 2026-04, 3d
    section Phase 3
    Power-ups (10 types)          :done, 2026-04, 1w
    HUD effets + sons + UX        :done, 2026-04, 1w
    Interpolation réseau          :done, 2026-04, 3d
    section Phase 4
    Bots IA (easy/medium/hard)    :done, 2026-05, 3d
    Missiles power-up             :done, 2026-05, 3d
    Docker + CI/CD                :done, 2026-05, 2d
    section Phase 5
    Comptes + OAuth               :2026-06, 2w
    ELO + leaderboard             :2026-06, 1w
    Delta compression ticks       :2026-07, 1w
    Bêta publique                 :milestone, 2026-08, 0d
```

---

## FAQ

<details>
<summary><strong>Le jeu fonctionne-t-il sans serveur ?</strong></summary>

Oui. Le mode **LOCAL** tourne entièrement dans le navigateur — moteur, collision, power-ups, bots IA, sons. Seul le mode **ONLINE** nécessite le serveur Node.js.

</details>

<details>
<summary><strong>Comment ajouter des bots en mode local ?</strong></summary>

Dans l'écran `PlayerSetupScene`, chaque joueur dispose d'un bouton **BOT**. Cliquer pour basculer le slot en bot. Choisir ensuite la difficulté : **EASY** (scan 12 pas, bruit ±25 %), **MEDIUM** (30 pas, ±8 %), **HARD** (60 pas, aucun bruit + tracking pickup).

</details>

<details>
<summary><strong>Les bots fonctionnent-ils en mode multijoueur ?</strong></summary>

Les bots sont une feature **client-side uniquement** (mode local). En mode ONLINE, chaque humain connecté contrôle sa courbe depuis sa machine — le serveur ne gère pas de bots.

</details>

<details>
<summary><strong>Comment fonctionne l'interpolation réseau ?</strong></summary>

`ShadowCurve` stocke `prevX/Y` et `targetX/Y`. Les propriétés `x`, `y`, `angle` sont des **getters** qui calculent `prev + (target - prev) × α` où `α = min(1, Δt / 33ms)`. Appelés 60 fois par seconde, ils retournent une position différente à chaque frame sans nouveau tick serveur — fluidité complète sans client-side prediction.

</details>

<details>
<summary><strong>Comment fonctionne le missile ?</strong></summary>

Le power-up **FIRE** (rouge, label « FIRE ») se collecte et lance immédiatement un projectile dans la direction de la courbe. Le missile voyage à 3.5× la vitesse de courbe. Il tue toute courbe touchée directement. S'il percute une traîne bitmap, il efface un disque de 10 px avant de disparaître. Il disparaît aux bords de l'arène.

</details>

<details>
<summary><strong>Combien de rooms simultanées sur O2Switch ?</strong></summary>

Chaque room consomme ~480 KB (bitmap collision) + CPU d'une boucle 30 Hz. Sur un mutualisé O2Switch, prévoir 20–50 rooms max. Pour plus, passer sur un VPS dédié ou utiliser Docker.

</details>

<details>
<summary><strong>Socket.io ne se connecte pas sur O2Switch — que faire ?</strong></summary>

1. Tester `/health` — si 200, le serveur tourne.
2. Console navigateur : si WebSocket échoue, Socket.io bascule en **polling HTTP** automatiquement.
3. Si même le polling échoue : vérifier que le sous-domaine pointe bien vers l'Application Root du Node.js App cPanel.

</details>

<details>
<summary><strong>Les sons ne jouent pas ?</strong></summary>

Les navigateurs bloquent `AudioContext` avant toute interaction utilisateur. `AudioManager.unlock()` est appelé sur le premier `pointerdown` (clic/tap). Si aucun son ne joue, cliquer une fois dans la page avant de lancer une partie.

</details>

<details>
<summary><strong>Comment redémarrer après un déploiement ?</strong></summary>

```bash
# Via SSH (Passenger détecte ce fichier)
touch ~/crazycurve/tmp/restart.txt

# Ou via cPanel → Setup Node.js App → Restart

# Ou Docker
docker restart crazycurve
```

</details>

<details>
<summary><strong>Les données sont-elles persistées ?</strong></summary>

Non — tout est en mémoire (perdu au restart). La Phase 5 introduira un backend persistant pour comptes, ELO et historique de parties.

</details>

---

<sub>CrazyCurve · TypeScript · PixiJS 8 · Socket.io · Vite · Node.js 22 · Docker</sub>
