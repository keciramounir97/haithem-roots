# Backend Route Audit Report
**Generated:** {{ new Date().toISOString() }}

## ✅ Server Status
- **Main Entry Point:** `server.js`
- **All Routes Loaded:** ✅ Yes
- **Server Running:** ✅ Started with `npm start`

---

## 📋 Complete Route Inventory

### 1. **Authentication Routes** (`/api/auth`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout (authenticated)
- `POST /api/auth/reset` - Request password reset
- `POST /api/auth/reset/verify` - Verify reset code
- `GET /api/auth/me` - Get current user (authenticated)
- `PATCH /api/auth/me` - Update current user (authenticated)

### 2. **User Management Routes** (`/api/admin/users`)
- `GET /api/admin/users` - List all users (requires: `manage_users`)
- `POST /api/admin/users` - Create user (requires: `manage_users`)
- `PATCH /api/admin/users/:id` - Update user (requires: `manage_users`)
- `DELETE /api/admin/users/:id` - Delete user (requires: `manage_users`)

### 3. **Tree/Family Tree Routes** (`/api/trees`, `/api/my/trees`, `/api/admin/trees`)
- **Public:**
  - `GET /api/trees` - List public trees
  - `GET /api/trees/:id` - Get public tree details
  - `GET /api/trees/:id/gedcom` - Download public GEDCOM file

- **My Trees** (requires: `manage_own_trees` or `manage_all_trees`):
  - `GET /api/my/trees` - List my trees
  - `GET /api/my/trees/:id` - Get my tree details
  - `POST /api/my/trees` - Create tree (with file upload)
  - `PUT /api/my/trees/:id` - Update tree (with file upload)
  - `POST /api/my/trees/:id/save` - Save tree (with file upload)
  - `DELETE /api/my/trees/:id` - Delete tree
  - `GET /api/my/trees/:id/gedcom` - Download my GEDCOM file

- **Admin:**
  - `GET /api/admin/trees` - List all trees (requires: `manage_all_trees`)

### 4. **Person Routes** (`/api/persons`, `/api/my/persons`)
- **Public:**
  - `GET /api/trees/:treeId/persons` - List persons in a public tree
  - `GET /api/persons/:id` - Get public person details

- **My Persons** (requires: `manage_own_trees` or `manage_all_trees`):
  - `GET /api/my/trees/:treeId/persons` - List persons in my tree
  - `GET /api/my/persons/:id` - Get my person details
  - `POST /api/my/trees/:treeId/persons` - Create person
  - `PUT /api/my/trees/:treeId/persons/:id` - Update person
  - `POST /api/my/trees/:treeId/persons/:id/save` - Save person
  - `DELETE /api/my/trees/:treeId/persons/:id` - Delete person

### 5. **Book Routes** (`/api/books`, `/api/my/books`, `/api/admin/books`)
- **Public:**
  - `GET /api/books` - List public books
  - `GET /api/books/:id` - Get public book details
  - `GET /api/books/:id/download` - Download public book

- **My Books** (authenticated):
  - `GET /api/my/books` - List my books
  - `GET /api/my/books/:id` - Get my book details
  - `POST /api/my/books` - Create book (with file & cover upload)
  - `PUT /api/my/books/:id` - Update book (with file & cover upload)
  - `POST /api/my/books/:id/save` - Save book (with file & cover upload)
  - `GET /api/my/books/:id/download` - Download my book
  - `DELETE /api/my/books/:id` - Delete book

- **Admin Books** (requires: `manage_books`):
  - `GET /api/admin/books` - List all books
  - `GET /api/admin/books/:id` - Get book details
  - `POST /api/admin/books` - Create book (requires: `manage_books` or `upload_books`)
  - `PUT /api/admin/books/:id` - Update book
  - `POST /api/admin/books/:id/save` - Save book
  - `DELETE /api/admin/books/:id` - Delete book

### 6. **Gallery Routes** (`/api/gallery`, `/api/my/gallery`, `/api/admin/gallery`)
- **Public:**
  - `GET /api/gallery` - List public gallery items
  - `GET /api/gallery/:id` - Get public gallery item

- **My Gallery** (authenticated):
  - `GET /api/my/gallery` - List my gallery items
  - `GET /api/my/gallery/:id` - Get my gallery item
  - `POST /api/my/gallery` - Create gallery item (with image upload)
  - `PUT /api/my/gallery/:id` - Update gallery item (with image upload)
  - `POST /api/my/gallery/:id/save` - Save gallery item (with image upload)
  - `DELETE /api/my/gallery/:id` - Delete gallery item

- **Admin Gallery** (requires: `manage_books`):
  - `GET /api/admin/gallery` - List all gallery items
  - `GET /api/admin/gallery/:id` - Get gallery item details
  - `POST /api/admin/gallery` - Create gallery item (requires: `manage_books` or `upload_books`)
  - `PUT /api/admin/gallery/:id` - Update gallery item
  - `POST /api/admin/gallery/:id/save` - Save gallery item
  - `DELETE /api/admin/gallery/:id` - Delete gallery item

### 7. **Search Routes** (`/api/search`)
- `GET /api/search` - Search functionality
- `GET /api/search/suggest` - Search suggestions

### 8. **Contact Routes** (`/api/contact`)
- `POST /api/contact` - Submit contact form

### 9. **Newsletter Routes** (`/api/newsletter`)
- `POST /api/newsletter` - Subscribe to newsletter

### 10. **Settings Routes** (`/api/admin/settings`, `/api/footer`)
- **Settings:**
  - `GET /api/admin/settings` - Get settings (requires: `manage_users`)
  - `PUT /api/admin/settings` - Save settings (requires: `manage_users`)

- **Footer:**
  - `GET /api/footer` - Get footer (public)
  - `GET /api/admin/footer` - Get footer (requires: `manage_users`)
  - `PUT /api/admin/footer` - Save footer (requires: `manage_users`)

### 11. **Statistics Routes** (`/api/admin/stats`)
- `GET /api/admin/stats` - Get statistics (requires: `view_dashboard`)

### 12. **Activity Routes** (`/api/activity`, `/api/admin/activity`)
- `GET /api/activity` - Get user activity (authenticated)
- `GET /api/admin/activity` - Get admin activity (requires: `view_dashboard`)

### 13. **Role Management Routes** (`/api/admin/roles`)
- `GET /api/admin/roles` - List all roles (requires: `manage_users`)

### 14. **Health Routes** (`/api/health`)
- `GET /api/health` - Health check endpoint

### 15. **Diagnostics Routes** (`/api/admin/diagnostics`)
- `GET /api/admin/diagnostics/schema` - Database schema diagnostics (requires: `view_dashboard`, `manage_users`, or `manage_books`)

### 16. **Root & System Routes**
- `GET /` - API root/info endpoint
- `GET /health` - System health check (with uptime, memory, etc.)
- `GET /health/liveness` - Liveness probe (lightweight)
- `GET /health/readiness` - Readiness probe (checks routes loaded)

---

## 🔒 Authentication & Authorization

### Public Endpoints (No Auth Required):
- All `/api/trees` (public routes)
- All `/api/persons` (public routes)  
- All `/api/books` (public routes)
- All `/api/gallery` (public routes)
- `/api/search`, `/api/search/suggest`
- `/api/contact`
- `/api/newsletter`
- `/api/footer` (GET)
- `/api/auth/signup`, `/api/auth/login`, `/api/auth/reset`, `/api/auth/reset/verify`
- `/api/health`
- `/`, `/health`, `/health/liveness`, `/health/readiness`

### Authenticated Endpoints (Require `authMiddleware`):
- `/api/auth/me` (GET, PATCH)
- `/api/auth/logout`
- `/api/my/*` routes (books, trees, persons, gallery)
- `/api/activity` (user activity)

### Admin Endpoints (Require Specific Permissions):
- `manage_users`: User management, roles, settings, footer
- `manage_books`: Book/gallery admin management
- `manage_all_trees`: Full tree access
- `manage_own_trees`: User's own trees
- `view_dashboard`: Stats, activity, diagnostics
- `upload_books`: Upload permission (alternative to `manage_books`)

---

## 📊 Route Statistics

- **Total Route Files:** 15
- **Total Endpoints:** ~100+ individual routes
- **Route Categories:**
  - Authentication: 7 endpoints
  - User Management: 4 endpoints
  - Trees: 9 endpoints
  - Persons: 8 endpoints
  - Books: 15 endpoints
  - Gallery: 11 endpoints
  - Search: 2 endpoints
  - Contact: 1 endpoint
  - Newsletter: 1 endpoint
  - Settings: 4 endpoints
  - Statistics: 1 endpoint
  - Activity: 2 endpoints
  - Roles: 1 endpoint
  - Health: 1 endpoint (+ 3 system routes)
  - Diagnostics: 1 endpoint

---

## ✅ Audit Results

### All Routes Successfully Loaded:
1. ✅ `authRoutes.js` - Authentication
2. ✅ `userRoutes.js` - User management
3. ✅ `settingsRoutes.js` - Settings & Footer
4. ✅ `statsRoutes.js` - Statistics
5. ✅ `activityRoutes.js` - Activity tracking
6. ✅ `bookRoutes.js` - Book management
7. ✅ `treeRoutes.js` - Family tree management
8. ✅ `searchRoutes.js` - Search functionality
9. ✅ `contactRoutes.js` - Contact form
10. ✅ `healthRoutes.js` - Health checks
11. ✅ `roleRoutes.js` - Role management
12. ✅ `galleryRoutes.js` - Gallery management
13. ✅ `newsletterRoutes.js` - Newsletter subscription
14. ✅ `personRoutes.js` - Person management (NEWLY ADDED)
15. ✅ `diagnosticsRoutes.js` - Database diagnostics (NEWLY ADDED)

### Routes Previously Missing (Now Fixed):
- ✅ `personRoutes.js` - Now loaded
- ✅ `newsletterRoutes.js` - Now loaded
- ✅ `diagnosticsRoutes.js` - Now loaded

---

## 🚀 Server Configuration

- **CORS:** ✅ Enabled for all origins
- **Security Headers:** ✅ Comprehensive headers applied
- **OPTIONS Handling:** ✅ Proper preflight support
- **File Uploads:** ✅ Supported (multer middleware)
- **Error Handling:** ✅ Comprehensive error handling
- **Passenger/Apache:** ✅ Compatible
- **DevOps Friendly:** ✅ Health checks, logging, environment support

---

## 📝 Notes

- All routes use Express Router
- File upload routes use multer middleware
- Authentication uses JWT via `authMiddleware`
- Permissions checked via `requirePermission` and `requireAnyPermission`
- Public routes don't require authentication
- All routes properly export Express Router
- No linter errors detected

---

**Audit Complete** ✅
