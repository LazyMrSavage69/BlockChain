package main

import (
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

// --- CORS middleware for all requests ---
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// Custom proxy handler that ensures CORS headers are preserved
func createProxyHandler(proxy *httputil.ReverseProxy) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Add X-Forwarded headers so backend knows original request details
		r.Header.Set("X-Forwarded-Host", r.Host)
		r.Header.Set("X-Forwarded-Proto", "http")
		r.Header.Set("X-Forwarded-For", r.RemoteAddr)

		// Store original response writer
		proxy.ModifyResponse = func(resp *http.Response) error {
			// Remove any CORS headers from auth server to avoid conflicts
			resp.Header.Del("Access-Control-Allow-Origin")
			resp.Header.Del("Access-Control-Allow-Methods")
			resp.Header.Del("Access-Control-Allow-Headers")
			resp.Header.Del("Access-Control-Allow-Credentials")
			return nil
		}
		proxy.ServeHTTP(w, r)
	}
}

// Generic backend proxy handler for NestJS endpoints
func createBackendProxyHandler(backendServiceURL string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Gateway received request: %s %s", r.Method, r.URL.Path)

		// Create new request to NestJS backend
		backendURL := backendServiceURL + r.URL.Path
		if r.URL.RawQuery != "" {
			backendURL += "?" + r.URL.RawQuery
		}

		req, err := http.NewRequest(r.Method, backendURL, r.Body)
		if err != nil {
			log.Printf("Failed to create request: %v", err)
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		// Copy headers
		for name, values := range r.Header {
			for _, value := range values {
				req.Header.Add(name, value)
			}
		}

		// Forward cookie if present (for authenticated endpoints)
		if cookie, err := r.Cookie("session_token"); err == nil {
			req.AddCookie(cookie)
			log.Printf("Forwarding session cookie to backend")
		}

		// Make request
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Printf("Failed to reach NestJS backend: %v", err)
			http.Error(w, "Failed to reach backend", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Read response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Printf("Failed to read response: %v", err)
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("NestJS backend response status: %d", resp.StatusCode)

		// Copy response headers BUT skip CORS headers (handled by our middleware)
		for name, values := range resp.Header {
			// Skip CORS headers to avoid conflicts with our middleware
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
	// Get URLs from environment variables
	authServiceURL := getEnv("AUTH_SERVICE_URL", "http://localhost:3060")
	backendServiceURL := getEnv("BACKEND_SERVICE_URL", "http://localhost:5000")
	frontendURL := getEnv("FRONTEND_URL", "http://localhost:3000")
	port := getEnv("PORT", "8000")

	log.Printf("🚀 Starting Gateway on port %s", port)
	log.Printf("📡 Auth Service: %s", authServiceURL)
	log.Printf("📡 Backend Service: %s", backendServiceURL)
	log.Printf("🌐 Frontend: %s", frontendURL)

	// Auth server URL
	authURL, err := url.Parse(authServiceURL)
	if err != nil {
		log.Fatalf("Failed to parse Auth server URL: %v", err)
	}

	authProxy := httputil.NewSingleHostReverseProxy(authURL)

	// Modify response to remove conflicting CORS headers
	authProxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Credentials")
		return nil
	}

	// Mux to handle all routes
	mux := http.NewServeMux()

	// --- GOOGLE AUTH ---
	mux.HandleFunc("/auth/google", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/google/callback", createProxyHandler(authProxy))

	mux.HandleFunc("/auth/callback", func(w http.ResponseWriter, r *http.Request) {
		// Just redirect to frontend with token
		token := r.URL.Query().Get("token")
		http.SetCookie(w, &http.Cookie{
			Name:     "session_token",
			Value:    token,
			Path:     "/",
			HttpOnly: true,
			Secure:   false,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   86400 * 7, // 7 days
		})
		http.Redirect(w, r, frontendURL+"/avatar", http.StatusFound)
	})

	// --- EMAIL/PASSWORD AUTH (using proxy handler) ---
	mux.HandleFunc("/auth/register", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/verify", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/resend-code", createProxyHandler(authProxy))
	mux.HandleFunc("/auth/logout", createProxyHandler(authProxy))

	// --- LOGIN (special: intercept response to set cookie) ---
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
			// Extract token and set cookie
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

		// Set Content-Type header
		w.Header().Set("Content-Type", "application/json")
		// Don't copy Content-Length - let Go calculate it automatically
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	})

	// --- PROXY ANY OTHER API ROUTES ---
	mux.HandleFunc("/api/me", func(w http.ResponseWriter, r *http.Request) {
		// Get cookie from request
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Println("No session cookie found in request")
			http.Error(w, `{"error":"Unauthorized"}`, http.StatusUnauthorized)
			return
		}

		log.Printf("Found session cookie: %s", cookie.Value[:10]+"...") // Log first 10 chars

		// Create new request to auth server
		req, err := http.NewRequest("GET", authServiceURL+"/api/me", nil)
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		// Forward the cookie
		req.AddCookie(cookie)

		// Make request
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to reach auth server:", err)
			http.Error(w, "Failed to reach auth server", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Read response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("Auth server response status: %d", resp.StatusCode)

		// Set content type
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	})

	mux.HandleFunc("/api/", createProxyHandler(authProxy))

	// --- AVATAR SERVICE (NestJS) - Custom handler with explicit cookie forwarding ---
	mux.HandleFunc("/api/avatars", func(w http.ResponseWriter, r *http.Request) {
		log.Printf("Gateway received request: %s %s", r.Method, r.URL.Path)

		// Get cookie from request
		cookie, err := r.Cookie("session_token")
		if err != nil {
			log.Println("No session cookie found in gateway request")
			http.Error(w, `{"error":"Unauthorized - No cookie"}`, http.StatusUnauthorized)
			return
		}

		log.Printf("Found session cookie in gateway: %s...", cookie.Value[:min(10, len(cookie.Value))])

		// Create new request to NestJS backend
		backendURL := backendServiceURL + r.URL.Path
		req, err := http.NewRequest(r.Method, backendURL, r.Body)
		if err != nil {
			http.Error(w, "Failed to create request", http.StatusInternalServerError)
			return
		}

		// Copy headers
		for name, values := range r.Header {
			for _, value := range values {
				req.Header.Add(name, value)
			}
		}

		// EXPLICITLY forward the cookie
		req.AddCookie(cookie)
		log.Printf("Forwarding cookie to backend: %s", req.Header.Get("Cookie"))

		// Make request
		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			log.Println("Failed to reach NestJS backend:", err)
			http.Error(w, "Failed to reach backend", http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		// Read response
		body, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, "Failed to read response", http.StatusInternalServerError)
			return
		}

		log.Printf("NestJS backend response status: %d", resp.StatusCode)
		log.Printf("Response body: %s", string(body))

		// Copy response headers
		for name, values := range resp.Header {
			for _, value := range values {
				w.Header().Add(name, value)
			}
		}

		w.WriteHeader(resp.StatusCode)
		w.Write(body)
	})

	// --- CONTRACTS SERVICE (NestJS) ---
	// Handle /contracts (get all contracts)
	mux.HandleFunc("/contracts", createBackendProxyHandler(backendServiceURL))

	// Handle /contracts/:id (get contract by ID) - must be registered after /contracts
	mux.HandleFunc("/contracts/", createBackendProxyHandler(backendServiceURL))

	// Wrap all with CORS
	handler := corsMiddleware(mux)

	log.Printf("✅ Gateway running on :%s", port)
	log.Printf("📋 Routes configured:")
	log.Printf("   - /auth/*")
	log.Printf("   - /api/me")
	log.Printf("   - /api/avatars")
	log.Printf("   - /contracts")
	log.Printf("   - /contracts/:id")

	log.Fatal(http.ListenAndServe(":"+port, handler))
}
