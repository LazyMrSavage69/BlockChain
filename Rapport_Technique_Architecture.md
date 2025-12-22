# Rapport d'Architecture Technique - Plateforme de Gestion de Contrats Intelligents

## 1. Description Générale du Projet

### Objectif Fonctionnel
Ce projet consiste en la conception et le développement d'une plateforme web distribuée permettant la création, la gestion, et la signature de contrats (légaux et "Smart Contracts"). L'application intègre une place de marché (Marketplace) pour l'achat et la vente de modèles de contrats, ainsi que des fonctionnalités sociales (gestion d'amis, messagerie) et un système d'abonnement.

### Problématique Adressée
Le projet répond à la complexité croissante de la gestion contractuelle et de l'intégration de la technologie Blockchain pour les utilisateurs non-experts. Il vise à automatiser la génération de documents juridiques, sécuriser les signatures via la Blockchain, et faciliter l'accès à des modèles validés à travers une architecture modulaire et évolutive.

### Public Cible
La plateforme s'adresse aux particuliers et aux petites entreprises souhaitant sécuriser leurs accords sans expertise juridique ou technique approfondie, ainsi qu'aux créateurs de contenus (juristes) souhaitant monétiser leurs modèles sur la Marketplace.

---

## 2. Architecture Technique

Le projet repose sur une architecture **Micro-services** moderne, entièrement conteneurisée. Ce choix structurel permet de découpler les fonctionnalités métiers, d'assurer une scalabilité ciblée et de faciliter la maintenance.

### Justification de l'Architecture Micro-services
*   **Hétérogénéité Technologique** : Utilisation de **Go** pour les services critiques nécessitant de la performance (Gateway, Auth) et de **TypeScript (NestJS/Next.js)** pour la logique métier complexe et l'interface utilisateur.
*   **Scalabilité Indépendante** : Chaque service peut être mis à l'échelle individuellement selon sa charge (ex: le service Gateway peut être répliqué sans dupliquer le Frontend).
*   **Cycle de Vie Indépendant** : Le développement, les tests et le déploiement de chaque brique sont autonomes.

### Conteneurisation et Isolation (Docker)
**Docker** est la pierre angulaire de l'infrastructure. Chaque micro-service possède son propre `Dockerfile` :
*   Les services (Backend, Frontend, Auth, Gateway) sont isolés dans des conteneurs distincts.
*   L'orchestration locale est gérée par **Docker Compose**, qui définit les réseaux (`miniprojet-net`) et les volumes de persistance (pour MySQL).
*   Cette approche garantit la parité entre les environnements de développement, de test et de production ("Build once, run anywhere").

### Communication Inter-services
La communication repose sur des protocoles standards :
*   **API REST (HTTP/JSON)** : Utilisé pour la majorité des échanges synchrones entre services.
*   **API Gateway** : Le service `gateway` (en Go) agit comme point d'entrée unique (`Edge Service`). Il route les requêtes du Frontend vers les services appropriés (`backend_nest`, `auth-service`), gère le CORS et potentiellement l'agrégation de données.
*   **Réseau Docker** : Les services communiquent via un réseau privé virtuel (`bridge`), utilisant les noms de services comme résolutions DNS (ex: `http://auth-service:3060`), assurant que seuls les ports nécessaires sont exposés à l'hôte.

### Gestion de la Configuration
*   **Variables d'Environnement** : Externalisation stricte de la configuration (URLs, clés API, secrets DB) via des fichiers `.env` non versionnés.
*   **Injection au Runtime** : `docker-compose.yml` injecte ces variables dans les conteneurs au démarrage, permettant de changer de configuration (Dev vs Prod) sans rebuilder les images.

---

## 3. Organisation du Projet

Le code est organisé en **Monorepo**, facilitant la gestion globale du projet tout en maintenant une séparation claire des responsabilités dans des dossiers racines distincts.

### Découpage des Micro-services

1.  **Frontend (`/frontend`)**
    *   **Techno** : Next.js (React), TailwindCSS.
    *   **Rôle** : Interface utilisateur, rendu côté serveur (SSR), interaction avec le Gateway.

2.  **API Gateway (`/gateway`)**
    *   **Techno** : Go (Golang).
    *   **Rôle** : Point d'entrée unique, routing, proxy inverse vers les services backend.

3.  **Auth Service (`/auth`)**
    *   **Techno** : Go.
    *   **Rôle** : Gestion des identités, authentification, tokens JWT, interactions avec la base de données utilisateurs (MySQL).

4.  **Backend Core (`/backend_nest`)**
    *   **Techno** : NestJS (TypeScript).
    *   **Rôle** : Logique métier principale (Contrats, Abonnements Stripe, Amis, Marketplace), intégration avec Supabase (PostgreSQL) et services tiers.

5.  **Blockchain (`/blockchain`)**
    *   **Techno** : Hardhat, Solidity.
    *   **Rôle** : Développement, test et déploiement des Smart Contracts sur le réseau Ethereum (ou testnet local).

6.  **Persistence**
    *   **MySQL** : Stockage relationnel principal pour l'authentification (service `auth`).
    *   **Supabase** : Plateforme Backend-as-a-Service pour les données métier riches (Contrats, Profils) et temps réel.

### Organisation du Code
Chaque service suit les standards de son écosystème :
*   **Go** : Structure idiomatique (`cmd/`, `internal/`) avec Makefile pour l'automatisation.
*   **NestJS** : Architecture modulaire (`Modules`, `Controllers`, `Services`, `DTOs`).
*   **Next.js** : Architecture par pages/composants (`app/`, `components/`).

---

## 4. Stratégie de Tests

Une stratégie de test multi-niveaux est mise en place pour assurer la robustesse de l'application distribuée.

### Tests Unitaires
*   **Backend NestJS** : Utilisation de **Jest**. Chaque service/contrôleur possède son fichier `.spec.ts` pour valider la logique isolée.
*   **Services Go** : Utilisation du module de test natif `testing`. Commandes via `make test` (`go test ./...`).

### Tests d'Intégration
*   **Persistence** : Validation des interactions avec les bases de données (MySQL/Supabase). Le `Makefile` du service Auth inclut une cible `itest` dédiée.
*   **Smart Contracts** : Tests rigoureux des contrats Solidity via Hardhat (Mocha/Chai) avant tout déploiement, cruciaux vu l'immutabilité de la Blockchain.

### Tests End-to-End (E2E)
*   **Backend** : NestJS fournit un environnement de test E2E (`/test/app.e2e-spec.ts`) utilisant Supertest pour simuler des requêtes HTTP complètes sur l'API lancée.
*   **Flux Utilisateur** : Validation des scénarios critiques (Inscription -> Achat Template -> Signature) à travers l'ensemble de la stack.

---

## 5. CI/CD et Déploiement (Pipeline Typique)

L'automatisation du cycle de vie logiciel est assurée par une chaîne d'intégration et de déploiement continu (ex: GitHub Actions ou GitLab CI).

### Étapes du Pipeline Automatisé
1.  **Lint & Analyse Statique** : Vérification de la qualité du code (ESLint, Go Vet) à chaque push.
2.  **Tests Automatisés** : Exécution parallèle des tests unitaires et d'intégration pour chaque micro-service. Le build échoue si un test ne passe pas.
3.  **Build Docker** : Construction des images Docker pour chaque service (`docker build`).
4.  **Publication** : Push des images versionnées vers un registre d'images (Docker Hub / Container Registry).
5.  **Déploiement** : Mise à jour de l'environnement de production (VPS/Cloud) via `docker-compose` ou un orchestrateur (K8s/Swarm), tirant les nouvelles images (`docker-compose pull && docker-compose up -d`).

---

## 6. Niveau de Difficulté et Analyse

### Niveau Technique
Ce projet est d'un **niveau avancé**, typique d'une fin de cycle ingénieur (Bac+5). Il dépasse le simple CRUD en intégrant :
*   Une architecture distribuée complexe (Micro-services).
*   La persistance polyglotte (SQL relationnel + BaaS).
*   L'intégration Web3 (Blockchain).
*   La maîtrise de deux langages typés forts (Go, TypeScript).

### Compétences Requises et Acquises
*   **Architecture Logicielle** : Conception de systèmes distribués, patterns API Gateway.
*   **Backend Engineering** : Maîtrise de Go, NestJS, et des bases de données SQL.
*   **DevOps** : Conteneurisation (Docker), orchestration, CI/CD.
*   **Web3** : Compréhension des Smart Contracts et de l'interaction Blockchain.

### Comparaison vs Monolithe
Contrairement à un monolithe où tout le code réside dans un seul processus, ce projet force l'étudiant à gérer la **complexité accidentelle** des systèmes distribués (latence réseau, cohérence éventuelle, déploiements coordonnés), offrant une expérience beaucoup plus proche de la réalité industrielle des grandes plateformes Tech.

---

## Conclusion
Ce projet représente une synthèse complète des compétences attendues d'un ingénieur logiciel moderne. Il démontre non seulement une maîtrise technique du codage Fullstack, mais aussi une compréhension profonde des enjeux d'architecture, d'industrialisation et de déploiement dans un environnement complexe.
