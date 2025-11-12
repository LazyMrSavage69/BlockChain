package main

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
)

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// Get environment variable with fallback
func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// CORS middleware for the official frontend
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, Stripe-Signature")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Reverse-proxy helper (keeps body/headers intact; removes backend CORS headers)
func createProxyHandler(proxy *httputil.ReverseProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// X-Forwarded headers
		r.Header.Set("X-Forwarded-Host", r.Host)
		r.Header.Set("X-Forwarded-Proto", "http")
		r.Header.Set("X-Forwarded-For", r.RemoteAddr)

		// Strip CORS headers from upstream to avoid conflicts
		proxy.ModifyResponse = func(resp *http.Response) error {
			resp.Header.Del("Access-Control-Allow-Origin")
			resp.Header.Del("Access-Control-Allow-Methods")
			resp.Header.Del("Access-Control-Allow-Headers")
			resp.Header.Del("Access-Control-Allow-Credentials")
			return nil
		}
		proxy.ServeHTTP(w, r)
	}
}

// Simple backend proxy that builds the target URL and forwards cookies/headers
func createBackendProxyHandler(backendServiceURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Gateway received request: %s %s", r.Method, r.URL.Path)

		backendURL := backendServiceURL + r.URL.Path
		if r.URL.RawQuery != "" {
			backendURL += "?" + r.URL.RawQuery
		}

		// Read the body to preserve it
		bodyBytes, err := io.ReadAll(r.Body)
		if err != nil {
			log.Printf("Failed to read request body: %v", err)
			http.Error(w, "Failed to read request body", http.StatusInternalServerError)
			return
		}
		r.Body.Close()

		// Create new request with the body
		req, err := http.NewRequest(r.Method, backendURL, bytes.NewReader(bodyBytes))
		if err != nil {
			log.Printf("Failed to create request: %v", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}
		
		// Set Content-Length header
		req.ContentLength = int64(len(bodyBytes))
		
		// Ensure Content-Type is set
		if r.Header.Get("Content-Type") == "" {
			req.Header.Set("Content-Type", "application/json")
		}

		// Copy headers (but don't overwrite Content-Type if we just set it)
		for name, values := range r.Header {
			if name == "Content-Type" && req.Header.Get("Content-Type") != "" {
				continue
			}
			for _, value := range values {
				req.Header.Add(name, value)
			}
		}

		// Forward session cookie if present
		if cookie, err := r.Cookie("session_token"); err == nil {
			req.AddCookie(cookie)
			log.Printf("Forwarding session cookie to backend")
		}

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Failed to reach backend: %v", err)
			http.Error(w, "Failed to reach backend", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read response: %v", err)
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("Backend response status: %d", resp.StatusCode)

		// Copy headers (skip CORS - handled here)
		for name, values := range resp.Header {
			if name == "Access-Control-Allow-Origin" ||
				name == "Access-Control-Allow-Methods" ||
				name == "Access-Control-Allow-Headers" ||
				name == "Access-Control-Allow-Credentials" {
				continue
			}
			for _, value := range values {
				w.Header().Add(name, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
}

func main() {
	// Service URLs
	authServiceURL := getEnv("AUTH_SERVICE_URL", "http://localhost:3060")
	backendServiceURL := getEnv("BACKEND_SERVICE_URL", "http://localhost:5000")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
	port := getEnv("PORT", "8000")

	log.Printf("🚀 Starting Gateway on port %s", port)
	log.Printf("📡 Auth Service: %s", authServiceURL)
	log.Printf("📡 Backend Service: %s", backendServiceURL)
	log.Printf("🌐 Frontend: %s", frontendURL)

	// Auth reverse proxy
	authURL, err := url.Parse(authServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse Auth server URL: %v", err)
	}
	authProxy := httputil.NewSingleHostReverseProxy(authURL)
	authProxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Credentials")
		return nil
	}

	mux := http.NewServeMux()

	// --- GOOGLE AUTH ---
	mux.HandleFunc("/auth/google", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/google/callback", createProxyHandler(authProxy))

	// OAuth callback: set cookie and redirect to frontend
	mux.HandleFunc("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    token,
			Path:     "/",
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   86400 * 7,
		})
		http.Redirect(w, r, frontendURL+"/avatar", http.StatusFound)
	})

	// --- EMAIL/PASSWORD AUTH ---
	mux.HandleFunc("/auth/register", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/verify", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/resend-code", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/logout", createProxyHandler(authProxy))

	// Login: proxy and set cookie on success
	mux.HandleFunc("/auth/login", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		resp, err := http.Post(authServiceURL+"/auth/login", "application/json", r.Body)
		if err != nil {
			http.Error(w, "Failed to reach auth server", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		if resp.StatusCode == http.StatusOK {
			var result map[string]interface{}
			if err := json.Unmarshal(body, &result); err == nil {
				if token, ok := result["token"].(string); ok {
					http.SetCookie(w, &http.Cookie{
						Name:     "session_token",
						Value:    token,
						Path:     "/",
						HttpOnly: true,
						Secure:   false,
						SameSite: http.SameSiteLaxMode,
						MaxAge:   86400 * 7,
					})
					delete(result, "token")
					body, _ = json.Marshal(result)
				}
			}
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	})

	// --- ME endpoint (reads session cookie, asks Auth) ---
	mux.HandleFunc("/api/me", func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Println("No session cookie found in request")
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		log.Printf("Found session cookie: %s", cookie.Value[:min(10, len(cookie.Value))]+"...")

		req, err := http.NewRequest("GET", authServiceURL+"/api/me", nil)
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}
		req.AddCookie(cookie)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to reach auth server:", err)
			http.Error(w, "Failed to reach auth server", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("Auth server response status: %d", resp.StatusCode)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	})

	// --- USER SEARCH (Auth/Go - MySQL) ---
	// Must be before generic /api/ route
	mux.HandleFunc("/api/users/search", createProxyHandler(authProxy))

	// --- SUBSCRIPTIONS SERVICE (NestJS) ---
	// Important: register before generic /api/ so they are not captured by Auth
	mux.HandleFunc("/api/subscriptions/webhook", createBackendProxyHandler(backendServiceURL))
	mux.HandleFunc("/api/subscriptions/checkout", createBackendProxyHandler(backendServiceURL))
	mux.HandleFunc("/api/subscriptions/", createBackendProxyHandler(backendServiceURL))

	// --- AVATAR SERVICE (NestJS) ---
	avatarHandler := func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Gateway received request: %s %s", r.Method, r.URL.Path)

		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Println("No session cookie found in gateway request")
			http.Error(w, `{"error":"Unauthorized - No cookie"}`, http.StatusUnauthorized)
			return
		}

		log.Printf("Found session cookie in gateway: %s...", cookie.Value[:min(10, len(cookie.Value))])

		backendURL := backendServiceURL + r.URL.Path
		req, err := http.NewRequest(r.Method, backendURL, r.Body)
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}
		for name, values := range r.Header {
			for _, value := range values {
				req.Header.Add(name, value)
			}
		}
		req.AddCookie(cookie)

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to reach NestJS backend:", err)
			http.Error(w, "Failed to reach backend", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("NestJS backend response status: %d", resp.StatusCode)
		log.Printf("Response body: %s", string(body))

		for name, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(name, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	}
	mux.HandleFunc("/api/avatars", avatarHandler)
	mux.HandleFunc("/api/avatars/", avatarHandler)

	// --- GENERIC /api/ to Auth (keep after specific service routes) ---
	mux.HandleFunc("/api/", createProxyHandler(authProxy))

	// --- CONTRACTS SERVICE (NestJS) ---
	mux.HandleFunc("/contracts", createBackendProxyHandler(backendServiceURL))
	mux.HandleFunc("/contracts/", createBackendProxyHandler(backendServiceURL))

	// --- FRIENDS SERVICE (NestJS) ---
	mux.HandleFunc("/friends", createBackendProxyHandler(backendServiceURL))
	mux.HandleFunc("/friends/", createBackendProxyHandler(backendServiceURL))

	// --- MESSAGES SERVICE (NestJS) ---
	mux.HandleFunc("/messages", createBackendProxyHandler(backendServiceURL))
	mux.HandleFunc("/messages/", createBackendProxyHandler(backendServiceURL))

	handler := corsMiddleware(mux)

	log.Printf("✅ Gateway running on :%s", port)
	log.Printf("📋 Routes configured:")
	log.Printf("   - /auth/* (Auth/Go)")
	log.Printf("   - /api/me (Auth/Go)")
	log.Printf("   - /api/users/search (Auth/Go)")
	log.Printf("   - /api/subscriptions/* (NestJS)")
	log.Printf("   - /api/avatars (NestJS)")
	log.Printf("   - /contracts/* (NestJS)")

	log.Fatal(http.ListenAndServe(":"+port, handler))
}
