/*
Ce fichier implémente un service d’envoi d’e-mails utilisant l’API Resend,
 principalement destiné à envoyer des codes de vérification lors de l’inscription
 ou de la vérification d’adresse e-mail d’un utilisateur
*/

package database

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/resend/resend-go/v2"
)

// Cette structure encapsule le client Resend, qui sera utilisé pour toutes les requêtes d’envoi d’e-mails.
type EmailService struct {
	Client *resend.Client
}

/*
Crée une nouvelle instance du service d’e-mail :

Elle lit la clé API Resend à partir de la variable d’environnement ResendAPI.

Elle initialise un client Resend pour l’utiliser dans le reste du service.

pour des raisons de securité elle est stocké dans .env file
*/
func NewEmailService() *EmailService {
	return &EmailService{
		Client: resend.NewClient(os.Getenv("ResendAPI")),
	}
}

/*
Cette fonction génère un code à 6 chiffres aléatoire :
Elle utilise l’horloge du système (UnixNano) comme graine aléatoire.
Elle garantit que le code est toujours compris entre 100000 et 999999.
*/
func GenerateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	code := rand.Intn(900000) + 100000
	return fmt.Sprintf("%d", code)
}

/*
La fonction prend deux paramètres :

toEmail : l’adresse du destinataire.

code : le code de vérification généré précédemment.

Elle crée un objet SendEmailRequest contenant :

Expéditeur (From) : SmartEther <no-reply@smartether.app> .

Destinataire (To) : la liste des e-mails à qui envoyer.

Sujet : "Verify your email address".

Contenu HTML : un message formaté contenant le code de vérification.
*/

func (e *EmailService) SendVerificationEmail(toEmail, code string) error {
	ctx := context.TODO()

	params := &resend.SendEmailRequest{
		From:    "SmartEther <no-reply@smartether.app>",
		To:      []string{toEmail},
		Subject: "Verify your email address",
		Html: fmt.Sprintf(`
			<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
				<h2>Email Verification</h2>
				<p>Thank you for registering! Please use the following code to verify your email:</p>
				<div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
					%s
				</div>
				<p>This code will expire in 10 minutes.</p>
				<p>If you didn't request this code, please ignore this email.</p>
			</div>
		`, code),
	}

	sent, err := e.Client.Emails.SendWithContext(ctx, params)
	if err != nil {
		return fmt.Errorf("failed to send verification email: %v", err)
	}

	fmt.Println("Verification email sent to:", toEmail)
	fmt.Println("Resend email ID:", sent.Id)
	return nil
}
