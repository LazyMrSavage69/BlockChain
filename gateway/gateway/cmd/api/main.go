package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

// --- CORS middleware for all requests ---
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
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

func main() {
	// Auth server URL
	authURL, err := url.Parse("http://localhost:3060")
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
		http.Redirect(w, r, "http://localhost:3000/avatar", http.StatusFound)
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

		resp, err := http.Post("http://localhost:3060/auth/login", "application/json", r.Body)
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
		req, err := http.NewRequest("GET", "http://localhost:3060/api/me", nil)
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

	// --- AVATAR SERVICE (NestJS) ---
	avatarsURL, err := url.Parse("http://localhost:5000")
	if err != nil {
		log.Fatalf("Failed to parse Avatars service URL: %v", err)
	}

	avatarsProxy := httputil.NewSingleHostReverseProxy(avatarsURL)

	// Important: remove conflicting CORS headers
	avatarsProxy.ModifyResponse = func(resp *http.Response) error {
		resp.Header.Del("Access-Control-Allow-Origin")
		resp.Header.Del("Access-Control-Allow-Methods")
		resp.Header.Del("Access-Control-Allow-Headers")
		resp.Header.Del("Access-Control-Allow-Credentials")
		return nil
	}

	// Route /api/avatars requests to the NestJS service
	mux.HandleFunc("/api/avatars", createProxyHandler(avatarsProxy))

	// Wrap all with CORS
	handler := corsMiddleware(mux)

	log.Println("Gateway running on :8000")
	log.Fatal(http.ListenAndServe(":8000", handler))
}
