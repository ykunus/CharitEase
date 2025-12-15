# Architecture and Organization

## Files Inspected

1. `App.js` - Root component with providers
2. `src/context/AuthContext.js` - Central state management (2331 lines)
3. `src/config/supabase.js` - Database client configuration
4. `src/navigation/AppNavigator.js` - Navigation structure
5. `backend-example/server.js` - Express backend for Stripe
6. `database_schema.sql` - PostgreSQL schema definition
7. `src/components/DonationModal.js` - Payment integration component
8. `src/screens/` (11 screens) - UI screens
9. `package.json` - Frontend dependencies
10. `backend-example/package.json` - Backend dependencies
11. `add_user_id_to_posts.sql` - Database migration
12. `add_location_columns_to_charities.sql` - Database migration

---

## A) One-Sentence Summary

CharitEase is a React Native mobile app that connects donors with Middle Eastern charities, enabling donations, social posts, and following through Stripe payment processing.

---

## B) Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│         React Native Mobile App (Expo)          │
│  ┌──────────────┐      ┌──────────────────┐    │
│  │   Screens    │      │  AuthContext     │    │
│  │  (11 Views)  │◄─────┤  (State Mgmt)    │    │
│  └──────────────┘      └────────┬─────────┘    │
│                                 │               │
│  ┌──────────────────────────────┴──────────┐   │
│  │     React Navigation (Stack/Tabs)       │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬───────────────────────────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│ Supabase│  │ Express │  │  Stripe  │
│   (Auth │  │ Backend │  │  Connect │
│    +DB) │  │  :3000  │  │   API    │
└─────────┘  └─────────┘  └──────────┘
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
         ┌───────────────┐
         │  PostgreSQL   │
         │  (Supabase)   │
         └───────────────┘
```

---

## C) Major Components

**Frontend (React Native/Expo):**
- `src/screens/` - 11 screen components (Feed, Profile, Charities, SignIn, etc.)
- `src/components/` - Reusable UI components (PostCard, DonationModal, CommentModal)
- `src/navigation/AppNavigator.js` - Routing with Stack/Tab navigators

**State Management:**
- `src/context/AuthContext.js` (2331 lines) - Single context for auth, posts, donations, likes, comments

**Database/Auth:**
- Supabase (`src/config/supabase.js`) - PostgreSQL + Supabase Auth for authentication

**Backend:**
- Express server (`backend-example/server.js`) - Stripe Connect endpoints, runs on port 3000

**Payment Processing:**
- Stripe Connect via `@stripe/stripe-react-native` (configured in `App.js`, used in `DonationModal.js`)

**Storage:**
- Supabase Storage for images (`AuthContext.js` line 2137 handles uploads)

**Third-Party Services:**
- Expo SDK (image picker, location services)
- React Navigation for routing
- AsyncStorage for local fallback data

---

## D) Data Model

**Key Tables (from `database_schema.sql`):**
- `users` - Donor accounts (id, email, name, total_donated, followed_charities[])
- `charities` - Charity accounts (id, email, name, category, total_raised, followers, location_lat, location_lon)
- `posts` - Social posts (id, charity_id, user_id, content, image_url, likes_count)
- `donations` - Transaction records (id, user_id, charity_id, amount, message)
- `likes` - Post likes (user_id, post_id) - UNIQUE constraint prevents duplicates
- `comments` - Post comments (id, user_id, post_id, content)
- `follows` - User-charity follows (user_id, charity_id) - UNIQUE constraint

**Relationships:**
- Users → Charities (many-to-many via `follows` table)
- Users → Posts (one-to-many via `user_id` column)
- Charities → Posts (one-to-many)
- Users → Donations → Charities (many-to-many)

---

## E) Main User Flows

### 1. Donation Flow:
```
User taps "Donate" → DonationModal opens
  → Checks charity.stripe_account_id (line 78)
  → POST /charity-account-status (backend)
  → POST /create-donation-with-destination (backend)
  → Stripe payment sheet presented
  → Payment succeeds → onDonate callback
  → makeDonation() in AuthContext (line 1209)
  → INSERT into donations table
  → UPDATE users.total_donated, charities.total_raised
  → UI refreshes with new stats
```

### 2. Post Creation Flow:
```
User creates post → CreatePostScreen
  → createPost() in AuthContext (line 826)
  → Upload image to Supabase Storage (if present)
  → INSERT into posts table with user_id/charity_id
  → Add post ID to user.posts array
  → Update local posts state
  → Navigate back to Feed
  → FeedScreen renders from global posts array
```

### 3. Authentication Flow:
```
App start → checkAuthState() (line 37)
  → supabase.auth.getSession()
  → If session exists → loadUserProfile()
    → Check charities table by email
    → If charity: Load from charities table
    → If user: Load from users table
    → Set user state, setIsAuthenticated(true)
  → AppNavigator renders MainTabs (line 220)
```

---

## F) API Surface

**Frontend → Supabase (direct queries in `AuthContext.js`):**
- `supabase.auth.signUp()` / `signIn()` - Authentication
- `supabase.from('users').select()` - User queries
- `supabase.from('charities').select()` - Charity queries  
- `supabase.from('posts').select()` - Post queries
- `supabase.from('donations').insert()` - Create donations
- `supabase.from('likes').insert()` - Like posts
- `supabase.storage.from('avatars').upload()` - Image uploads

**Frontend → Express Backend (`backend-example/server.js`):**
- `POST /health` - Server status check
- `POST /create-charity-account` - Create Stripe Connect account
- `POST /charity-account-status` - Check payment readiness
- `POST /create-donation-with-destination` - Process payment with platform fee
- `POST /create-account-link` - Generate onboarding URL

---

## G) Repo Organization

```
CharitEase/
├── App.js                    # Root component, providers
├── src/
│   ├── screens/             # 11 screen components
│   ├── components/          # Reusable UI (PostCard, DonationModal, etc.)
│   ├── context/             # AuthContext.js (global state)
│   ├── navigation/          # AppNavigator.js (routing config)
│   ├── config/              # supabase.js (DB client)
│   ├── utils/               # formatters.js, geo.js
│   └── data/                # demoData.js (fallback data)
├── backend-example/         # Express server (Stripe integration)
│   ├── server.js            # API endpoints
│   └── package.json
├── *.sql                    # Database migrations
└── package.json             # Frontend dependencies
```

**Patterns:** Context-based state management (no Redux), direct Supabase queries (no service layer), component-based UI.

---

## H) Deployment/Runtime

- **Frontend:** Expo managed workflow (`app.json`), runs on iOS/Android/Web
- **Build:** `expo start` (development), EAS Build for production
- **Backend:** Node.js/Express on port 3000 (local IP: `172.20.241.124:3000`)
- **Database:** Supabase PostgreSQL (hosted)
- **Environment:** `.env` for backend (`STRIPE_SECRET_KEY`, `PORT`), hardcoded keys in `src/config/supabase.js` (should use env)
- **CI/CD:** Not found in repo

---

## I) Notable Design Decisions/Tradeoffs

1. **Single Context for All State (`AuthContext.js`):** Centralizes auth, posts, charities, donations. Tradeoff: Large file (2331 lines); consider splitting.

2. **Direct Supabase Queries in Context:** No service/API layer. Tradeoff: Simpler, but harder to mock/test; business logic mixed with UI.

3. **Lazy User Entry Creation for Charities (`AuthContext.js` line 1078):** Charities get a `users` entry on first like/comment. Tradeoff: Fewer duplicates, but async complexity.

4. **Global Posts Array with ID References (`user.posts` stores IDs only):** Single source of truth. Tradeoff: Consistent, but requires filtering on every render.

5. **Stripe Connect vs Direct Payments:** Backend handles Connect; demo mode allows direct payments. Tradeoff: Marketplace fees vs simpler flow.

---

## J) "Talk Track" (90 seconds max)

"CharitEase is a React Native app built with Expo that connects donors with charities in the Middle East. The architecture uses Supabase for authentication and PostgreSQL database, with direct client-side queries from our AuthContext—no separate API layer. This keeps it simple, though our 2300-line context file shows the tradeoff.

For payments, we run a separate Express backend that integrates with Stripe Connect, enabling marketplace-style donations where money goes directly to charities with platform fees. The mobile app communicates with this backend for payment processing while handling all other data operations directly with Supabase.

Navigation uses React Navigation with a bottom tab navigator and nested stack navigators, supporting both user and charity account types with different UI flows. State management is entirely through React Context—no Redux—which works for our scale but would need refactoring as we grow. The database schema supports posts, likes, comments, donations, and follows, with proper foreign keys and unique constraints preventing duplicate likes or follows.

We made design decisions like lazy-creating user entries for charities and maintaining a global posts array as a single source of truth. The app is ready for Expo deployment, with migrations tracked in SQL files for database schema changes."



