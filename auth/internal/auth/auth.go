package auth

import (
	"log"
	"net/http"
	"os"

	"github.com/gorilla/sessions"
	"github.com/joho/godotenv"
	"github.com/markbates/goth"
	"github.com/markbates/goth/gothic"
	"github.com/markbates/goth/providers/google"
)

const (
	key    = "infernodragon@megaknight"
	MaxAge = 86400 * 7
	IsProd = false
)

func NewAuth() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	googleClientId := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")

	if googleClientId == "" || googleClientSecret == "" {
		log.Fatal("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
	}

	// Get gateway URL from environment or use default
	gatewayURL := os.Getenv("GATEWAY_URL")
	if gatewayURL == "" {
		gatewayURL = "http://localhost:8000"
	}

	store := sessions.NewCookieStore([]byte(key))
	store.Options = &sessions.Options{
		Path:     "/",
		MaxAge:   MaxAge,
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
	}
	gothic.Store = store

	// CRITICAL FIX: Full callback URL pointing to gateway
	callbackURL := gatewayURL + "/auth/google/callback"
	log.Printf("🔐 Google OAuth Config:")
	log.Printf("   - Client ID: %s", googleClientId[:20]+"...")
	log.Printf("   - Callback URL: %s", callbackURL)

	goth.UseProviders(
		google.New(
			googleClientId,
			googleClientSecret,
			callbackURL,
			"email", "profile",
		),
	)
}
