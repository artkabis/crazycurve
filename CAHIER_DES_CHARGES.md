# Cahier des Charges — CrazyCurve
> Version 1.0 · Avril 2026

---

## 1. Vision & Objectifs

**CrazyCurve** est un jeu multijoueur en ligne temps réel inspiré de Curve Fever. Des courbes contrôlées par les joueurs se déplacent en continu en laissant une traîne ; le dernier survivant remporte la manche.

**Objectifs produit**
- Expérience de jeu fluide à 60 FPS côté client, tick serveur ≥ 30 Hz
- Accessible sans installation — navigateur web uniquement
- Parties rapides (2–6 joueurs, 2–5 min)
- Progressivement compétitif via un système ELO

---

## 2. Fonctionnalités

### 2.1 Gameplay de base

| Fonctionnalité | Détail |
|---|---|
| Déplacement | Courbe se déplace en continu à vitesse constante |
| Contrôle | Virage gauche / droite (touches clavier ou tactile) |
| Traîne | Chaque courbe laisse un sillage solide derrière elle |
| Trous | Gaps aléatoires dans la traîne — évite les blocages et crée des opportunités tactiques |
| Collision | Mort immédiate si on touche une traîne ou le bord de l'arène |
| Scoring | Points attribués selon l'ordre d'élimination |

### 2.2 Système de Power-ups

Les bonus apparaissent aléatoirement dans l'arène et s'activent au passage.

| Bonus | Effet | Portée |
|---|---|---|
| Vitesse+ | Accélération temporaire | Soi-même |
| Vitesse- | Ralentissement | Adversaires |
| Taille+ | Traîne plus épaisse | Adversaires |
| Taille- | Traîne plus fine | Soi-même |
| Gomme | Efface une zone de traîne | Autour du ramasseur |
| Bouclier | Immunité aux collisions (traversée) | Soi-même |
| Angle libre | Rotation dans toutes les directions | Soi-même |
| Traîne fantôme | Traîne invisible temporairement | Soi-même |
| Inverseur | Inverse les contrôles gauche/droite | Adversaires |

### 2.3 Modes de jeu

- **Classique** — Dernier survivant gagne la manche, 5 manches par partie
- **Équipes** — 2v2 ou 3v3, score cumulé par équipe
- **Solo Survie** — Joueur unique contre obstacles générés algorithmiquement

### 2.4 Rooms & Matchmaking

- Création de room publique ou privée (code d'accès)
- Matchmaking automatique par niveau ELO
- Spectateur : observation en cours de partie
- Rejoindre une partie déjà lancée en mode spectateur

### 2.5 Comptes & Progression

- Compte joueur (email / OAuth Google)
- Profil : pseudo, avatar, statistiques (victoires, ELO, parties jouées)
- Historique des parties
- Classement global (leaderboard)
- Cosmétiques : couleur et style de traîne, débloqués via XP

### 2.6 Interface

- Lobby : liste des rooms disponibles, création rapide
- HUD en jeu : scores, bonus actifs, chrono, positions
- Écran de résultats fin de manche et fin de partie
- Chat en partie (texte simple)

---

## 3. Architecture Technique

### 3.1 Vue d'ensemble

```
[Client Browser]  ←── WebSocket ──→  [Game Server]  ←──→  [DB / Cache]
   PixiJS/WebGL                         Node.js              PostgreSQL
   TypeScript                           TypeScript           Redis
```

### 3.2 Frontend

| Couche | Technologie |
|---|---|
| Rendu | PixiJS 8 (WebGL) |
| Langage | TypeScript 5 strict |
| UI (menus/lobby) | React 19 + Zustand 5 |
| Build | Vite 6 |
| Tests | Vitest |

### 3.3 Backend — Serveur de jeu

- **Runtime** : Node.js (TypeScript)
- **WebSocket** : Socket.io ou `ws` natif
- **Architecture** : Serveur autoritaire — source de vérité absolue
- **Game loop** : Tick fixe 30 Hz (33 ms/tick)
- **Isolation des rooms** : `worker_threads` ou clustering

### 3.4 Backend — API REST

- **Framework** : Fastify
- **Auth** : JWT + refresh tokens, OAuth2 (Google)
- **Endpoints** : comptes, classements, historique, rooms

### 3.5 Persistance

| Besoin | Technologie |
|---|---|
| Comptes, stats, historique | PostgreSQL |
| Sessions, état des rooms actives | Redis |
| Assets statiques | CDN (Cloudflare) |

### 3.6 Infrastructure

- Serveur de jeu scalable horizontalement (instances régionales)
- Reverse proxy : Nginx
- Déploiement : Docker + Docker Compose (dev), Kubernetes (prod)
- CI/CD : GitHub Actions

---

## 4. Défis Techniques Clés

### 4.1 Synchronisation Réseau _(défi principal)_

**Problèmes**
- Latence variable 10–200 ms selon les joueurs
- Perte de paquets → désynchronisation

**Solutions**
- **Architecture server-authoritative** : le serveur calcule tout, les clients envoient uniquement les inputs
- **Client-side prediction** : le client anticipe son propre déplacement sans attendre la confirmation serveur
- **Reconciliation** : à réception de l'état serveur, le client corrige discrètement les écarts
- **Interpolation des adversaires** : buffer 100 ms pour lisser le mouvement des autres joueurs
- **Delta compression** : envoi des changements d'état uniquement

**Protocole réseau**
```
Client → Serveur : { tick, inputs: { left, right } }
Serveur → Client : { tick, players: [{ id, x, y, angle, alive }], events: [...] }
```

### 4.2 Détection de Collision

La traîne peut représenter des dizaines de milliers de segments.

**Solution — Bitmap O(1)**
- Un `Uint8Array` miroir de l'arène : 0 = vide, N = ID du joueur
- Peindre un point = écrire des pixels dans le tableau
- Vérifier une collision = lire 1 pixel → O(1) constant, indépendant de la longueur des traînes
- Les trous sont gérés par un timer sur chaque `Curve` — pendant le gap, on ne peint pas

### 4.3 Game Loop Serveur & Fairness

- Tick rate fixe 30 Hz indépendant de la charge serveur (découplage update/render)
- Lag compensation : le serveur applique les inputs en tenant compte du RTT client
- Timeout : si un client ne répond plus pendant N ticks → mort automatique

### 4.4 Scalabilité des Rooms

- Chaque room tourne dans un worker isolé
- Serveur principal = routeur (quel worker gère quelle room)
- Redis Pub/Sub pour la communication inter-workers (spectateurs, chat)
- Auto-scaling si la charge dépasse un seuil

### 4.5 Sécurité & Anti-triche

- Validation de tous les inputs côté serveur (angle max/tick, vitesse max)
- Rate limiting sur les messages WebSocket
- Le client ne reçoit jamais la position des bonus non encore révélés
- Tokens de session à courte durée de vie, renouvelés automatiquement

---

## 5. Performances Cibles

| Métrique | Cible |
|---|---|
| FPS client | 60 FPS stable |
| Tick serveur | 30 Hz |
| Latence RTT acceptable | < 150 ms |
| Rooms simultanées/instance | 500 rooms × 6 joueurs |
| Temps de chargement initial | < 2 s |
| Bundle JS gzippé | < 500 KB |

---

## 6. UI/UX

- **Design** : Rétro-néon (fond sombre, courbes lumineuses) — univers Tron
- **Responsive** : desktop prioritaire, support mobile (boutons tactiles gauche/droite)
- **Accessibilité** : contraste WCAG AA, remapping des touches
- **Feedback visuel** : explosion à la mort, flash à la collecte de bonus, indicateur de round

---

## 7. Roadmap

### Phase 1 — Prototype local ✅ _(en cours)_
- [x] Moteur de jeu déterministe (`core/`)
- [x] Gameplay : déplacement, traîne, trous, collision bitmap
- [x] Rendu WebGL via PixiJS 8 (TrailLayer incrémental, têtes, HUD)
- [x] 2 joueurs local (même clavier)
- [x] Système de rounds & scoring
- [x] Menus HTML (Menu, GameOver)

### Phase 2 — Multijoueur en ligne _(à venir)_
- [ ] Serveur Node.js + WebSocket
- [ ] Game loop serveur autoritaire (30 Hz)
- [ ] Client-side prediction + interpolation
- [ ] Rooms : création, rejoindre, lobby

### Phase 3 — Features & Polish
- [ ] Système de power-ups (≥ 5 bonus)
- [ ] Comptes utilisateurs + OAuth
- [ ] ELO + leaderboard
- [ ] Mode équipes
- [ ] Chat en partie

### Phase 4 — Production
- [ ] Delta compression réseau
- [ ] Infrastructure Docker + CI/CD
- [ ] Tests de charge
- [ ] Cosmétiques & progression
- [ ] Bêta publique

---

## 8. Stack Recommandée (résumé)

```
Frontend      TypeScript · PixiJS 8 · React 19 · Zustand 5 · Vite 6
Backend       TypeScript · Node.js · Socket.io · Fastify
Persistence   PostgreSQL · Redis
Infra         Docker · Nginx · GitHub Actions
```
