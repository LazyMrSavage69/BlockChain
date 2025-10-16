package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	DB *sql.DB
}

// User struct to hold user data
type User struct {
	ID         int64
	GoogleID   sql.NullString
	Email      string
	Password   sql.NullString
	Name       string
	AvatarURL  string
	IsVerified bool
	CreatedAt  time.Time
}

func New() Service {
	dsn := "root:@tcp(127.0.0.1:3306)/miniprojet?parseTime=true"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping DB:", err)
	}
	return Service{DB: db}
}

// Health check
func (s Service) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()
	err := s.DB.PingContext(ctx)
	if err != nil {
		return map[string]string{
			"status":  "down",
			"message": fmt.Sprintf("db down: %v", err),
		}
	}
	return map[string]string{
		"status":  "up",
		"message": "It's healthy",
	}
}

// Find user by Google ID
func (s Service) FindUserByGoogleID(googleID string) (int, error) {
	var id int
	err := s.DB.QueryRow("SELECT id FROM users WHERE google_id = ?", googleID).Scan(&id)
	return id, err
}

// Insert a new user (Google OAuth)
func (s Service) CreateUser(googleID, email, name, picture string) (int, error) {
	res, err := s.DB.Exec("INSERT INTO users (google_id, email, name, picture) VALUES (?, ?, ?, ?)",
		googleID, email, name, picture)
	if err != nil {
		return 0, err
	}
	lastID, _ := res.LastInsertId()
	fmt.Println("User inserted")
	return int(lastID), nil
}

// ===== EMAIL/PASSWORD AUTH METHODS =====

// FindUserByEmail - Check if email exists
func (s Service) FindUserByEmail(email string) (*User, error) {
	query := `SELECT id, email, password, name, picture, google_id, verified FROM users WHERE email = ?`
	var user User
	var password sql.NullString
	var googleID sql.NullString
	var name sql.NullString
	var picture sql.NullString

	err := s.DB.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&password,
		&name,
		&picture,
		&googleID,
		&user.IsVerified,
	)

	if err != nil {
		log.Printf("Error scanning user for email %s: %v", email, err)
		return nil, err
	}

	user.Password = password
	user.GoogleID = googleID

	// Handle nullable fields
	if name.Valid {
		user.Name = name.String
	}
	if picture.Valid {
		user.AvatarURL = picture.String
	}

	return &user, nil
}

// CreateEmailUser - Create user with email and password
func (s Service) CreateEmailUser(email, password, name string) (int, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, fmt.Errorf("failed to hash password: %v", err)
	}

	res, err := s.DB.Exec(
		"INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
		email, string(hashedPassword), name,
	)
	if err != nil {
		return 0, err
	}

	lastID, _ := res.LastInsertId()
	fmt.Println("Email user created:", email)
	return int(lastID), nil
}

// VerifyPassword - Check if password matches
func (s Service) VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// MarkUserAsVerified - Set user as verified
func (s Service) MarkUserAsVerified(email string) error {
	_, err := s.DB.Exec("UPDATE users SET verified = 1 WHERE email = ?", email)
	if err != nil {
		return err
	}
	fmt.Println("User verified:", email)
	return nil
}

// ===== VERIFICATION CODE METHODS =====

// SaveVerificationCode - Store verification code
func (s Service) SaveVerificationCode(email, code string, expiresAt time.Time) error {
	_, err := s.DB.Exec(
		"INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
		email, code, expiresAt,
	)
	return err
}

// VerifyCode - Check if code is valid and not expired
func (s Service) VerifyCode(email, code string) (bool, error) {
	var id int
	var used bool
	var expiresAt time.Time

	query := `SELECT id, used, expires_at FROM verification_codes 
			  WHERE email = ? AND code = ? ORDER BY created_at DESC LIMIT 1`

	err := s.DB.QueryRow(query, email, code).Scan(&id, &used, &expiresAt)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}

	// Check if already used
	if used {
		return false, nil
	}

	// Check if expired
	if time.Now().After(expiresAt) {
		return false, nil
	}

	// Mark as used
	_, err = s.DB.Exec("UPDATE verification_codes SET used = TRUE WHERE id = ?", id)
	if err != nil {
		return false, err
	}

	return true, nil
}

// DeleteOldVerificationCodes - Clean up expired codes
func (s Service) DeleteOldVerificationCodes(email string) error {
	_, err := s.DB.Exec("DELETE FROM verification_codes WHERE email = ? AND expires_at < NOW()", email)
	return err
}

// ===== SESSION METHODS =====

// Create a session
func (s Service) CreateSession(userID int, token string, expiresAt string) error {
	_, err := s.DB.Exec("INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
		userID, token, expiresAt)
	fmt.Println("session inserted")
	return err
}

func (s Service) DeleteUserSessions(userID int) error {
	query := `DELETE FROM sessions WHERE user_id = ?`
	_, err := s.DB.Exec(query, userID)
	if err != nil {
		return err
	}
	fmt.Println("Old sessions deleted for user:", userID)
	return nil
}

// Get user by session token
func (s Service) GetUserBySessionToken(token string) (*User, error) {
	query := `
		SELECT u.id, u.google_id, u.email, u.name, u.picture
		FROM users u
		INNER JOIN sessions s ON u.id = s.user_id
		WHERE s.session_token = ? AND s.expires_at > NOW()
	`
	var user User
	var googleID sql.NullString
	var name sql.NullString
	var picture sql.NullString

	log.Printf("GetUserBySessionToken: Looking for token: %s", token[:10]+"...")

	err := s.DB.QueryRow(query, token).Scan(
		&user.ID,
		&googleID,
		&user.Email,
		&name,
		&picture,
	)
	if err != nil {
		log.Printf("GetUserBySessionToken: Query error: %v", err)
		return nil, err
	}

	user.GoogleID = googleID
	if name.Valid {
		user.Name = name.String
	}
	if picture.Valid {
		user.AvatarURL = picture.String
	}

	log.Printf("GetUserBySessionToken: User found: ID=%d, Email=%s", user.ID, user.Email)
	return &user, nil
}

// Delete session (logout)
func (s Service) DeleteSession(token string) error {
	query := `DELETE FROM sessions WHERE session_token = ?`
	_, err := s.DB.Exec(query, token)
	if err != nil {
		return err
	}
	fmt.Println("Session deleted")
	return nil
}

// Close database connection
func (s Service) Close() error {
	return s.DB.Close()
}
