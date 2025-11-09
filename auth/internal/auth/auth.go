/*
Ce fichier gère la configuration et l’initialisation du système d’authentification OAuth2 via Google.
*/

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
	key    = "infernodragon@megaknight" //clé secrete
	MaxAge = 86400 * 7                  // durée max du cookie
	IsProd = false                      // en dévéloppement et non production
)

/*
Tente de charger les variables depuis le fichier .env
Récupère le Client ID et le Client Secret du compte OAuth2 Google.
Récupère l’URL du gateway
Crée un cookie store sécurisé pour conserver les sessions des utilisateurs authentifiés.
Construit l’URL de rappel complète que Google utilisera après l’authentification.
Les scopes "email" et "profile" permettent de récupérer l’adresse e-mail et le nom de l’utilisateur.
*/

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

	callbackURL := gatewayURL + "/auth/google/callback"
	goth.UseProviders(
		google.New(
			googleClientId,
			googleClientSecret,
			callbackURL,
			"email", "profile",
		),
	)
}
