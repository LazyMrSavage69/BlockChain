/*
Ce fichier est le point d’entrée principal du microservice d’authentification (auth).
Il initialise les composants internes du service, lance le serveur HTTP,

	et gère un arrêt gracieux (graceful shutdown) lorsque le système reçoit un signal d’interruption
*/
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"auth/internal/auth"
	"auth/internal/server"
)

/*
Cette fonction assure que le serveur s’arrête proprement lorsque le programme reçoit un signal d’arrêt.
Donne au serveur 5 secondes pour terminer les requêtes en cours avant de forcer l’arrêt.
*/
func gracefulShutdown(apiServer *http.Server, done chan bool) {
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := apiServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	log.Println("Server exiting")

	done <- true
}

/*
Initialise le module d’authentification,
Crée une instance du serveur HTTP configuré
Lance une goroutine qui surveille les signaux d’arrêt du système.
*/

func main() {
	auth.NewAuth()
	server := server.NewServer()

	done := make(chan bool, 1)

	go gracefulShutdown(server, done)

	err := server.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		panic(fmt.Sprintf("http server error: %s", err))
	}

	<-done
	log.Println("Graceful shutdown complete.")
}
