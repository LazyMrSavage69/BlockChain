package database

import (
	"context"
	"log"
	"os"
	"testing"
	"time"

	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/mysql"
	"github.com/testcontainers/testcontainers-go/wait"
)

func mustStartMySQLContainer() (func(context.Context) error, error) {
	var (
		dbName = "database"
		dbPwd  = "password"
		dbUser = "user"
	)

	dbContainer, err := mysql.Run(context.Background(),
		"mysql:8.0.36",
		mysql.WithDatabase(dbName),
		mysql.WithUsername(dbUser),
		mysql.WithPassword(dbPwd),
		testcontainers.WithWaitStrategy(wait.ForLog("port: 3306  MySQL Community Server - GPL").WithStartupTimeout(30*time.Second)),
	)
	if err != nil {
		return nil, err
	}

	os.Setenv("BLUEPRINT_DB_DATABASE", dbName)
	os.Setenv("BLUEPRINT_DB_PASSWORD", dbPwd)
	os.Setenv("BLUEPRINT_DB_USERNAME", dbUser)

	dbHost, err := dbContainer.Host(context.Background())
	if err != nil {
		return dbContainer.Terminate, err
	}

	dbPort, err := dbContainer.MappedPort(context.Background(), "3306/tcp")
	if err != nil {
		return dbContainer.Terminate, err
	}

	os.Setenv("BLUEPRINT_DB_HOST", dbHost)
	os.Setenv("BLUEPRINT_DB_PORT", dbPort.Port())

	return func(ctx context.Context) error {
		return dbContainer.Terminate(ctx)
	}, err
}

func TestMain(m *testing.M) {
	teardown, err := mustStartMySQLContainer()
	if err != nil {
		log.Fatalf("could not start mysql container: %v", err)
	}

	m.Run()

	if teardown != nil && teardown(context.Background()) != nil {
		log.Fatalf("could not teardown mysql container: %v", err)
	}
}

func TestNew(t *testing.T) {
	srv := New()
	if srv == nil {
		t.Fatal("New() returned nil")
	}
}

func TestHealth(t *testing.T) {
	srv := New()

	stats := srv.Health()

	if stats["status"] != "up" {
		t.Fatalf("expected status to be up, got %s", stats["status"])
	}

	if _, ok := stats["error"]; ok {
		t.Fatalf("expected error not to be present")
	}

	if stats["message"] != "It's healthy" {
		t.Fatalf("expected message to be 'It's healthy', got %s", stats["message"])
	}
}

func TestClose(t *testing.T) {
	srv := New()

	if srv.Close() != nil {
		t.Fatalf("expected Close() to return nil")
	}
}
