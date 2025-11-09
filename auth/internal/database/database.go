/*
Ce fichier définit la couche d’accès à la base de données pour le microservice auth.
Il :

Initialise la connexion MySQL.

Gère toutes les opérations CRUD liées aux utilisateurs, sessions et codes de vérification.

Fournit des fonctions pour l’authentification (Google et email/mot de passe).
*/

package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
)

// Structure principale contenant une instance de la base de données.
type Service struct {
	DB *sql.DB
}

// Représente un utilisateur avec ses données essentielles.
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

/*
Crée une connexion à MySQL et retourne un Service connecté.
Construction du DSN
Connexion et vérification :
*/
func New() Service {
	dbHost := os.Getenv("BLUEPRINT_DB_HOST")
	dbPort := os.Getenv("BLUEPRINT_DB_PORT")
	dbUser := os.Getenv("BLUEPRINT_DB_USERNAME")
	dbPass := os.Getenv("BLUEPRINT_DB_PASSWORD")
	dbName := os.Getenv("BLUEPRINT_DB_DATABASE")

	if dbHost == "" {
		dbHost = "127.0.0.1"
	}
	if dbPort == "" {
		dbPort = "3306"
	}
	if dbUser == "" {
		dbUser = "root"
	}
	if dbName == "" {
		dbName = "miniprojet"
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to DB:", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal("Failed to ping DB:", err)
	}

	log.Println("Successfully connected to database!")
	return Service{DB: db}
}

/*
Vérifie si la base de données est accessible dans un délai d’une seconde.
*/

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

// Cherche un utilisateur à partir de son identifiant Google OAuth :
func (s Service) FindUserByGoogleID(googleID string) (int, error) {
	var id int
	err := s.DB.QueryRow("SELECT id FROM users WHERE google_id = ?", googleID).Scan(&id)
	return id, err
}

// Insère un utilisateur provenant de Google
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

// Récupère un utilisateur via son email (auth locale).
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

	if name.Valid {
		user.Name = name.String
	}
	if picture.Valid {
		user.AvatarURL = picture.String
	}

	return &user, nil
}

/*
Crée un utilisateur classique (email + mot de passe) :
Hash du mot de passe avec bcrypt.
*/
func (s Service) CreateEmailUser(email, password, name string) (int, error) {
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

/*
	Compare un mot de passe utilisateur avec le hash stocké

exemple :
$2b$12$s5nS5JYMSNCKGpU7M5k/7uB5V5e5V5e5V5e5V5e5V5e5V5e5V5e
\__/\/ \____________________/\_____________________________/

	|  |         |                         |
	|  |         |                         +--- Hash chiffré (31 chars)
	|  |         +--- Salt (22 chars)
	|  +--- Coût (4-31)
	+--- Version (2a, 2b, 2y)
	
	La fonction CompareHashAndPassword :
	    // Étape 1: Extraire le salt du hash stocké
	    // Étape 2: Extraire le coût (cost factor)
		// Étape 3: Re-hacher le mot de passe fourni avec le même salt
		// Étape 4: Comparer les deux hashs
*/
func (s Service) VerifyPassword(hashedPassword, password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}

// Marque un utilisateur comme vérifié
func (s Service) MarkUserAsVerified(email string) error {
	_, err := s.DB.Exec("UPDATE users SET verified = 1 WHERE email = ?", email)
	if err != nil {
		return err
	}
	fmt.Println("User verified:", email)
	return nil
}

/*
Sauvegarde un code temporaire pour vérification
*/
func (s Service) SaveVerificationCode(email, code string, expiresAt time.Time) error {
	_, err := s.DB.Exec(
		"INSERT INTO verification_codes (email, code, expires_at) VALUES (?, ?, ?)",
		email, code, expiresAt,
	)
	return err
}

/*
Sélection du dernier code envoyé (ORDER BY created_at DESC LIMIT 1)

Vérifie :

# S’il existe

# S’il n’a pas déjà été utilisé

S’il n’est pas expiré
*/
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

	if used {
		return false, nil
	}

	if time.Now().After(expiresAt) {
		return false, nil
	}

	_, err = s.DB.Exec("UPDATE verification_codes SET used = TRUE WHERE id = ?", id)
	if err != nil {
		return false, err
	}

	return true, nil
}

// Nettoie les anciens codes expirés
func (s Service) DeleteOldVerificationCodes(email string) error {
	_, err := s.DB.Exec("DELETE FROM verification_codes WHERE email = ? AND expires_at < NOW()", email)
	return err
}

// Crée une nouvelle session après authentification
func (s Service) CreateSession(userID int, token string, expiresAt string) error {
	_, err := s.DB.Exec("INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
		userID, token, expiresAt)
	fmt.Println("session inserted")
	return err
}

// Supprime toutes les sessions précédentes d’un utilisateur (avant login ou logout)
func (s Service) DeleteUserSessions(userID int) error {
	query := `DELETE FROM sessions WHERE user_id = ?`
	_, err := s.DB.Exec(query, userID)
	if err != nil {
		return err
	}
	fmt.Println("Old sessions deleted for user:", userID)
	return nil
}

// Récupère l’utilisateur à partir d’un token de session valide
// Vérifie que la session n’est pas expirée
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

// Supprime une session spécifique (déconnexion).
func (s Service) DeleteSession(token string) error {
	query := `DELETE FROM sessions WHERE session_token = ?`
	_, err := s.DB.Exec(query, token)
	if err != nil {
		return err
	}
	fmt.Println("Session deleted")
	return nil
}

// Ferme proprement la connexion à la base de données :
func (s Service) Close() error {
	return s.DB.Close()
}
