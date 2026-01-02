package auth

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestAuthConfiguration(t *testing.T) {
	// Set environment variables for testing
	os.Setenv("GOOGLE_CLIENT_ID", "test-client-id")
	os.Setenv("GOOGLE_CLIENT_SECRET", "test-client-secret")
	os.Setenv("GATEWAY_URL", "http://localhost:test")

	// Verify env vars are set
	assert.Equal(t, "test-client-id", os.Getenv("GOOGLE_CLIENT_ID"))
	assert.Equal(t, "test-client-secret", os.Getenv("GOOGLE_CLIENT_SECRET"))
	assert.Equal(t, "http://localhost:test", os.Getenv("GATEWAY_URL"))
}

func TestConstants(t *testing.T) {
	assert.Equal(t, 86400*7, MaxAge)
	assert.Equal(t, false, IsProd)
}
