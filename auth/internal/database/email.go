package database

import (
	"context"
	"fmt"
	"math/rand"
	"os"
	"time"

	"github.com/resend/resend-go/v2"
)

type EmailService struct {
	Client *resend.Client
}

func NewEmailService() *EmailService {
	return &EmailService{
		Client: resend.NewClient(os.Getenv("ResendAPI")), 
	}
}

// GenerateVerificationCode - Generate 6-digit code
func GenerateVerificationCode() string {
	rand.Seed(time.Now().UnixNano())
	code := rand.Intn(900000) + 100000
	return fmt.Sprintf("%d", code)
}

// SendVerificationEmail - Send code via Resend SDK
func (e *EmailService) SendVerificationEmail(toEmail, code string) error {
	ctx := context.TODO()

	params := &resend.SendEmailRequest{
		From:    "SmartEther <no-reply@smartether.app>", // must match verified domain
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
