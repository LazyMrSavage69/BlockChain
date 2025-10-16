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
        log.Fatal("Erreur du chargement du fichier .env")
    }
    googleClientId := os.Getenv("GOOGLE_CLIENT_ID")
    googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
    
    store := sessions.NewCookieStore([]byte(key))
    store.Options = &sessions.Options{
        Path:     "/",
        MaxAge:   MaxAge,
        HttpOnly: true,
        Secure:   false,
        SameSite: http.SameSiteLaxMode,
    }
    gothic.Store = store
    
    goth.UseProviders(
        google.New(
            googleClientId,
            googleClientSecret,
            "http://localhost:8000/auth/google/callback",  // Changed to gateway
            "email", "profile",
        ),
    )
}