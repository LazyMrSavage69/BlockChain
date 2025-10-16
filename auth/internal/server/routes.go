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
	"time"

	"auth/internal/database"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/markbates/goth/gothic"
)

func (s *Server) RegisterRoutes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:8000"}, // Only allow gateway
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "Cookie"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/", s.HelloWorldHandler)
	r.Get("/health", s.healthHandler)

	// --- GOOGLE AUTH ROUTES ---
	r.Get("/auth/{provider}", func(w http.ResponseWriter, r *http.Request) {
		gothic.BeginAuthHandler(w, r)
	})
	r.Get("/auth/{provider}/callback", s.getAuthCallBackFunction)

	// --- EMAIL/PASSWORD AUTH ROUTES ---
	r.Post("/auth/register", s.registerHandler)
	r.Post("/auth/verify", s.verifyEmailHandler)
	r.Post("/auth/login", s.loginHandler)
	r.Post("/auth/resend-code", s.resendCodeHandler)

	// --- COMMON ROUTES ---
	r.Post("/auth/logout", s.logoutHandler)
	r.Get("/api/me", s.getCurrentUser)

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

// Google OAuth callback
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

	expiresAt := "2030-01-01 00:00:00"
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

// Register new user with email/password
func (s *Server) registerHandler(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" || req.Name == "" {
		respondWithError(w, http.StatusBadRequest, "Email, password, and name are required")
		return
	}

	if len(req.Password) < 6 {
		respondWithError(w, http.StatusBadRequest, "Password must be at least 6 characters")
		return
	}

	// Check if email already exists
	existingUser, _ := s.db.FindUserByEmail(req.Email)
	if existingUser != nil {
		respondWithError(w, http.StatusConflict, "Email already registered")
		return
	}

	// Create user
	userID, err := s.db.CreateEmailUser(req.Email, req.Password, req.Name)
	if err != nil {
		log.Println("Failed to create user:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to create user")
		return
	}

	// Generate and send verification code
	code := database.GenerateVerificationCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	err = s.db.SaveVerificationCode(req.Email, code, expiresAt)
	if err != nil {
		log.Println("Failed to save verification code:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save verification code")
		return
	}

	// Send email
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

// Verify email with code
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

	// Verify the code (this also marks it as used)
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

	// Mark email as verified
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

// Login with email/password
func (s *Server) loginHandler(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	log.Printf("Login attempt for email: %s", req.Email) // Debug log

	if req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Email and password are required")
		return
	}

	// Find user
	user, err := s.db.FindUserByEmail(req.Email)
	if err != nil {
		log.Printf("FindUserByEmail error: %v", err) // Debug log
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	log.Printf("User found: ID=%d, Email=%s, IsVerified=%v", user.ID, user.Email, user.IsVerified) // Debug log

	// Check if user registered with Google
	if user.GoogleID.Valid && user.GoogleID.String != "" {
		respondWithError(w, http.StatusBadRequest, "This email is registered with Google. Please use Google sign-in.")
		return
	}

	// Verify password
	if !user.Password.Valid || !s.db.VerifyPassword(user.Password.String, req.Password) {
		log.Println("Password verification failed") // Debug log
		respondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	log.Println("Password verified successfully") // Debug log

	// Check if email is verified
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

// Resend verification code
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

	// Check if user exists
	user, err := s.db.FindUserByEmail(req.Email)
	if err != nil {
		respondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	// Check if already verified
	if user.GoogleID.Valid && user.GoogleID.String == "1" {
		respondWithError(w, http.StatusBadRequest, "Email already verified")
		return
	}

	// Delete old codes
	s.db.DeleteOldVerificationCodes(req.Email)

	// Generate new code
	code := database.GenerateVerificationCode()
	expiresAt := time.Now().Add(10 * time.Minute)

	err = s.db.SaveVerificationCode(req.Email, code, expiresAt)
	if err != nil {
		log.Println("Failed to save verification code:", err)
		respondWithError(w, http.StatusInternalServerError, "Failed to save verification code")
		return
	}

	// Send email
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

// Get current user from session
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

// Logout handler
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

// ===== HELPER FUNCTIONS =====

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
