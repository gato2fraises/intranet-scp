# SCPRP Intranet - Système de Gestion Complet

Système web complet pour la gestion d'une Fondation SCP avec frontend React + Tailwind CSS et backend Express + SQLite.

## 🎯 Fonctionnalités

### Modules Disponibles
- **Documents** : Gestion des documents classifiés avec niveaux de clearance
- **Messagerie** : Système de messages interne
- **RH** : Gestion du personnel et des autorisations (Admin+ seulement)
- **Staff** : Supervision et logs système (Staff seulement)

### Système de Sécurité
- ✅ Authentication JWT (24h d'expiration)
- ✅ Hachage bcrypt des mots de passe
- ✅ Contrôle d'accès basé sur les rôles (RBAC)
- ✅ Niveaux de clearance (0-6)
- ✅ Audit logging avec IP
- ✅ CORS configuré

## 🚀 Installation & Démarrage

### Prérequis
- Node.js 16+
- npm

### Frontend

```bash
cd gato_intranet_scp
npm install
npm run dev
```

Le frontend sera accessible sur `http://localhost:5173`

### Backend

```bash
cd gato_intranet_scp/backend
npm install
npm run dev
```

Le backend sera accessible sur `http://localhost:3000`

**⚠️ Important** : Le backend doit être lancé AVANT le frontend pour que les API calls fonctionnent.

## 🔐 Identifiants de Test

**Compte Demo (Scientifique)**
- Username: `test`
- Password: `password`
- Clearance: 2
- Role: Scientifique

Pour ajouter d'autres utilisateurs, modifiez le fichier `backend/src/index.ts` dans la fonction `start()`.

## 📚 Architecture API

### Base URL
```
http://localhost:3000/api
```

### Authentification
Tous les endpoints sauf `/auth/login` nécessitent le header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints

#### Auth
```
POST /auth/login
  Body: { username: string, password: string }
  Response: { token: string, user: User }
```

#### Documents
```
GET /documents
  Query: ?limit=10&offset=0 (optionnel)
  Response: { documents: Document[] }

GET /documents/:id
  Response: { document: Document }

POST /documents
  Body: { title, body, type, clearance }
  Requires: clearance >= 3

PATCH /documents/:id/archive
  Requires: clearance >= 3
```

#### Messages
```
GET /messages/inbox
  Response: { messages: Message[] }

POST /messages/send
  Body: { recipient_id, subject, body }

PATCH /messages/:id/read
  Mark message as read

PATCH /messages/:id/archive
  Archive message
```

#### Gestion du Personnel (RH)
```
GET /rh/users
  Requires: admin+ only
  Response: { users: User[] }

GET /rh/users/:id
  Requires: admin+ only
  Response: { user: User, notes: RHNote[] }

PATCH /rh/users/:id/clearance
  Body: { clearance: number }
  Requires: admin+ only

POST /rh/users/:id/notes
  Body: { note: string }
  Requires: admin+ only

PATCH /rh/users/:id/suspend
  Requires: admin+ only

PATCH /rh/users/:id/unsuspend
  Requires: admin+ only
```

#### Logs (Staff seulement)
```
GET /logs
  Query: ?limit=50&offset=0 (optionnel)
  Requires: staff only
  Response: { logs: Log[] }
```

## 📊 Schéma Base de Données

### Users
```
id (PK)
username (UNIQUE)
password (bcrypt)
role (scientifique|securite|direction|admin|staff|IA)
clearance (0-6)
department
suspended (0/1)
created_at
updated_at
```

### Documents
```
id (PK)
title
body
type
clearance (required to view)
author_id (FK)
archived (0/1)
created_at
```

### Messages
```
id (PK)
sender_id (FK)
recipient_id (FK)
subject
body
is_read (0/1)
archived (0/1)
created_at
```

### RH Notes
```
id (PK)
user_id (FK)
author_id (FK)
note
created_at
```

### Logs
```
id (PK)
action
user_id (FK, nullable)
details
ip_address
created_at
```

## 🔧 Configuration

### Backend (.env)
```
PORT=3000
JWT_SECRET=your-secret-key-here-min-32-chars
NODE_ENV=development
```

### Frontend (vite.config.ts)
```typescript
// Configure dans AuthContext.tsx
const API_URL = 'http://localhost:3000/api'
```

## 🎨 Système de Design

- **Couleur Primaire** : Foundation (gris-bleu professionnel)
- **Framework CSS** : Tailwind CSS 3
- **Framework UI** : React 18 + TypeScript
- **Bundler** : Vite 5

Palette de couleurs personnalisée dans `tailwind.config.ts`

## 📦 Technologies Utilisées

### Frontend
- React 18
- TypeScript
- Tailwind CSS 3
- Vite 5
- Context API (state management)

### Backend
- Express.js
- TypeScript
- SQLite3
- JWT (jsonwebtoken)
- bcryptjs
- CORS

## 🧪 Test des APIs

### Avec cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"password"}'

# Get documents (avec token)
curl http://localhost:3000/api/documents \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get logs (staff only)
curl "http://localhost:3000/api/logs?limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Avec Postman
1. Collection pré-configurée disponible en demande
2. Environment variables: 
   - `BASE_URL` = `http://localhost:3000/api`
   - `TOKEN` = copier depuis la réponse login

## 📁 Structure du Projet

```
gato_intranet_scp/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Dashboard/
│   │       ├── Documents.tsx
│   │       ├── Mail.tsx
│   │       ├── RH.tsx
│   │       └── Staff.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── App.tsx
│   └── main.tsx
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── documents.ts
│   │   │   ├── messages.ts
│   │   │   ├── rh.ts
│   │   │   └── logs.ts
│   │   ├── database.ts
│   │   ├── types.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   ├── data/ (auto-créé avec intranet.db)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## 🐛 Troubleshooting

### Backend ne démarre pas
```bash
# Vérifier les dépendances
npm install

# Supprimer le cache
rm -rf node_modules package-lock.json
npm install

# Vérifier le port 3000 n'est pas utilisé
netstat -an | grep 3000
```

### Frontend ne se connecte pas au backend
- Vérifier que le backend est en cours d'exécution sur `localhost:3000`
- Vérifier CORS dans `backend/src/index.ts`
- Vérifier les headers Authorization dans les requests

### Erreur SQLite
- Base de données se crée automatiquement dans `backend/data/intranet.db`
- Si la base est corrompue, la supprimer pour la régénérer

## 📝 Notes de Développement

### Ajouter un nouvel utilisateur
Modifier `backend/src/index.ts` fonction `start()`:

```typescript
await runAsync(
  `INSERT INTO users (username, password, role, clearance, department, suspended)
   VALUES (?, ?, ?, ?, ?, ?)`,
  ['newuser', hashedPassword, 'role', 2, 'department', 0]
)
```

### Ajouter un nouveau module
1. Créer la table dans `backend/src/database.ts`
2. Ajouter le type dans `backend/src/types.ts`
3. Créer les routes dans `backend/src/routes/`
4. Monter la route dans `backend/src/index.ts`
5. Créer le composant React dans `src/pages/Dashboard/`

### Modifier les permissions
Les rôles et clearances sont définis dans les routes. Modifier les vérifications dans chaque endpoint selon vos besoins.

## 🔐 Sécurité

- ✅ Mots de passe hachés avec bcrypt (10 rounds)
- ✅ JWT tokens avec expiration 24h
- ✅ CORS restreint à localhost:5173 en développement
- ✅ Audit logging de toutes les actions
- ✅ Vérification des permissions avant chaque opération
- ✅ SQL injection protection via prepared statements

**À faire en production:**
- Configurer les variables d'environnement (secrets)
- Activer HTTPS
- Configurer CORS avec domaines autorisés
- Mettre en place rate limiting
- Configurer les backups de base de données
- Implémenter la rotation des tokens
- Ajouter l'authentification 2FA

## 📞 Support

Pour toute question ou bug, consultez la documentation ou modifiez directement les fichiers source.

---

**Version** : 1.0.0  
**Dernière mise à jour** : 2024-02-01  
**Status** : Production-ready
