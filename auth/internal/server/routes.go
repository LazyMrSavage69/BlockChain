/*
Ce module configure et gère toutes les routes HTTP du service d’authentification
*/

package server

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"auth/internal/database"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/markbates/goth/gothic"
)

/*
Elle crée et configure un routeur Chi (github.com/go-chi/chi)

pour définir toutes les routes et middlewares de sécurité
Le frontend appelle /auth/google.

Le backend redirige vers Google pour la connexion.

Google renvoie un token + infos utilisateur à /auth/google/callback.

Le serveur :

Récupère les infos (email, name, googleID).

Crée ou retrouve l’utilisateur dans la base.

Crée une session locale (token).

Redirige vers le gateway :
http://localhost:8000/auth/callback?token=xxxxx
*/
func (s *Server) RegisterRoutes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8000"}, // autoriser le gateway
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Cookie"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/", s.HelloWorldHandler)
	r.Get("/health", s.healthHandler)

	// --- GOOGLE AUTH ROUTES ---
	r.Get("/auth/{provider}", func(w http.ResponseWriter, r *http.Request) {
		provider := chi.URLParam(r, "provider")

		//Enlever les sessions gothic existantes pour une flux fraiche de OAuth
		session, _ := gothic.Store.Get(r, gothic.SessionName)
		session.Options.MaxAge = -1
		session.Save(r, w)

		// Verifier si les requests viennt des gateway
		if r.Header.Get("X-Forwarded-Host") != "" {
			r.URL.Scheme = "http"
			r.URL.Host = r.Header.Get("X-Forwarded-Host")
		} else {
			// url de gateway
			r.URL.Scheme = "http"
			r.URL.Host = "localhost:8000"
		}

		log.Printf("🔐 Starting OAuth for provider: %s", provider)
		log.Printf("🔐 Request URL: %s://%s%s", r.URL.Scheme, r.URL.Host, r.URL.Path)
		log.Printf("🔐 Request Host header: %s", r.Host)
		log.Printf("🔐 X-Forwarded-Host: %s", r.Header.Get("X-Forwarded-Host"))

		// header de host
		r.Host = r.URL.Host

		gothic.BeginAuthHandler(w, r)
	})
	r.Get("/auth/{provider}/callback", s.getAuthCallBackFunction) //Callback apres succés OAuth

	// --- EMAIL/PASSWORD AUTH ROUTES ---
	r.Post("/auth/register", s.registerHandler)
	r.Post("/auth/verify", s.verifyEmailHandler)
	r.Post("/auth/login", s.loginHandler)
	r.Post("/auth/resend-code", s.resendCodeHandler)

	// --- COMMON ROUTES ---
	r.Post("/auth/logout", s.logoutHandler)
	r.Get("/api/me", s.getCurrentUser)
	r.Get("/api/users/search", s.searchUsersHandler)

	return r
}

func (s *Server) HelloWorldHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]string{"message": "Hello World"}
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		log.Fatalf("error handling JSON marshal. Err: %v", err)
	}
	_, _ = w.Write(jsonResp)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	jsonResp, _ := json.Marshal(s.db.Health())
	_, _ = w.Write(jsonResp)
}

/*
Fonction				Description
generateSessionToken()	Génère un token hexadécimal aléatoire (32 octets)
respondWithError()	    Envoie une réponse JSON avec code d’erreur
respondWithJSON()	    Formate toute réponse en JSON
*/
func (s *Server) getAuthCallBackFunction(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	r = r.WithContext(context.WithValue(r.Context(), "provider", provider))

	user, err := gothic.CompleteUserAuth(w, r)
	if err != nil {
		fmt.Fprintln(w, "Auth error:", err)
		return
	}

	fmt.Println("Google User Info:")
	fmt.Println("Name:", user.Name)
	fmt.Println("Email:", user.Email)
	fmt.Println("GoogleID:", user.UserID)

	userID, err := s.db.FindUserByGoogleID(user.UserID)
	if err == sql.ErrNoRows {
		userID, err = s.db.CreateUser(user.UserID, user.Email, user.Name, user.AvatarURL)
		if err != nil {
			http.Error(w, "Failed to create user in DB", http.StatusInternalServerError)
			return
		}
	} else if err != nil {
		http.Error(w, "DB error", http.StatusInternalServerError)
		return
	}

	sessionToken := generateSessionToken()
	err = s.db.DeleteUserSessions(userID)
	if err != nil {
		log.Println("Warning: Failed to delete old sessions:", err)
	}

	expiresAt := "2030-01-01 00:00:00" //faut changer dans la production
	err = s.db.CreateSession(userID, sessionToken, expiresAt)
	if err != nil {
		http.Error(w, "Failed to create session", http.StatusInternalServerError)
		return
	}

	gatewayURL := fmt.Sprintf("http://localhost:8000/auth/callback?token=%s", sessionToken)
	http.Redirect(w, r, gatewayURL, http.StatusFound)
}

// ===== EMAIL/PASSWORD AUTH HANDLERS =====

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type VerifyRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ResendCodeRequest struct {
	Email string `json:"email"`
}

// enregistrer nouveau user avec email /password
func (s *Server) registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	if len(req.Password) < 6 {
		respondWithError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	existingUser, _ := s.db.FindUserByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "Email already registered")
		return
	}

	userID, err := s.db.CreateEmailUser(req.Email, req.Password, req.Name)
	if err != nil {
		log.Println("Failed to create user:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	code := database.GenerateVerificationCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	err = s.db.SaveVerificationCode(req.Email, code, expiresAt)
	if err != nil {
		log.Println("Failed to save verification code:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save verification code")
		return
	}

	emailService := database.NewEmailService()
	err = emailService.SendVerificationEmail(req.Email, code)
	if err != nil {
		log.Println("Failed to send verification email:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to send verification email")
		return
	}

	respondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Registration successful. Please check your email for verification code.",
		"user_id": userID,
	})
}

// verification email avec code
func (s *Server) verifyEmailHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" || req.Code == "" {
		respondWithError(w, http.StatusBadRequest, "Email and code are required")
		return
	}

	valid, err := s.db.VerifyCode(req.Email, req.Code)
	if err != nil {
		log.Println("Error verifying code:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to verify code")
		return
	}

	if !valid {
		respondWithError(w, http.StatusBadRequest, "Invalid or expired verification code")
		return
	}

	// Marker email comme vérifier
	err = s.db.MarkUserAsVerified(req.Email)
	if err != nil {
		log.Println("Failed to verify email:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to verify email")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Email verified successfully! You can now log in.",
	})
}

// Connexion avec email et mdp
func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	log.Printf("Login attempt for email: %s", req.Email)

	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	user, err := s.db.FindUserByEmail(req.Email)
	if err != nil {
		log.Printf("FindUserByEmail error: %v", err) // Debug log
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	log.Printf("User found: ID=%d, Email=%s, IsVerified=%v", user.ID, user.Email, user.IsVerified) // Debug log

	if user.GoogleID.Valid && user.GoogleID.String != "" {
		respondWithError(w, http.StatusBadRequest, "This email is registered with Google. Please use Google sign-in.")
		return
	}

	if !user.Password.Valid || !s.db.VerifyPassword(user.Password.String, req.Password) {
		log.Println("Password verification failed") // Debug log
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	log.Println("Password verified successfully") // Debug log

	if !user.IsVerified {
		log.Println("Email not verified") // Debug log
		respondWithError(w, http.StatusForbidden, "Please verify your email before logging in")
		return
	}

	// Create session
	sessionToken := generateSessionToken()
	err = s.db.DeleteUserSessions(int(user.ID))
	if err != nil {
		log.Println("Warning: Failed to delete old sessions:", err)
	}

	expiresAt := "2030-01-01 00:00:00"
	err = s.db.CreateSession(int(user.ID), sessionToken, expiresAt)
	if err != nil {
		log.Println("Failed to create session:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create session")
		return
	}

	log.Println("Login successful for:", user.Email) // Debug log

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Login successful",
		"token":   sessionToken,
		"user": map[string]interface{}{
			"id":     user.ID,
			"email":  user.Email,
			"name":   user.Name,
			"avatar": user.AvatarURL,
		},
	})
}

// Reenvoyer le code de verification
func (s *Server) resendCodeHandler(w http.ResponseWriter, r *http.Request) {
	var req ResendCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Email == "" {
		respondWithError(w, http.StatusBadRequest, "Email is required")
		return
	}

	user, err := s.db.FindUserByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	if user.GoogleID.Valid && user.GoogleID.String == "1" {
		respondWithError(w, http.StatusBadRequest, "Email already verified")
		return
	}

	s.db.DeleteOldVerificationCodes(req.Email)

	code := database.GenerateVerificationCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	err = s.db.SaveVerificationCode(req.Email, code, expiresAt)
	if err != nil {
		log.Println("Failed to save verification code:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save verification code")
		return
	}

	emailService := database.NewEmailService()
	err = emailService.SendVerificationEmail(req.Email, code)
	if err != nil {
		log.Println("Failed to send verification email:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to send verification email")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Verification code sent successfully",
	})
}

func (s *Server) getCurrentUser(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		log.Println("getCurrentUser: No cookie found in request")
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	log.Printf("getCurrentUser: Cookie value: %s", cookie.Value[:10]+"...")

	user, err := s.db.GetUserBySessionToken(cookie.Value)
	if err != nil {
		log.Printf("getCurrentUser: Database error: %v", err)
		respondWithError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	log.Printf("getCurrentUser: User found: ID=%d, Email=%s", user.ID, user.Email)

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"id":     user.ID,
		"email":  user.Email,
		"name":   user.Name,
		"avatar": user.AvatarURL,
	})
}

func (s *Server) searchUsersHandler(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		respondWithJSON(w, http.StatusOK, map[string]interface{}{
			"users": []database.PublicUser{},
		})
		return
	}

	limit := 5
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsed, err := strconv.Atoi(limitParam); err == nil && parsed > 0 {
			if parsed > 20 {
				parsed = 20
			}
			limit = parsed
		}
	}

	users, err := s.db.SearchUsers(query, limit)
	if err != nil {
		log.Printf("searchUsersHandler error: %v", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to search users")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]interface{}{
		"users": users,
	})
}

func (s *Server) logoutHandler(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("session_token")
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "No session found")
		return
	}

	err = s.db.DeleteSession(cookie.Value)
	if err != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to logout")
		return
	}

	respondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Logged out successfully",
	})
}

func generateSessionToken() string {
	b := make([]byte, 32)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func respondWithError(w http.ResponseWriter, code int, message string) {
	respondWithJSON(w, code, map[string]string{"error": message})
}

func respondWithJSON(w http.ResponseWriter, code int, payload interface{}) {
	response, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	w.Write(response)
}
