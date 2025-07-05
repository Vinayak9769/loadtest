package auth

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

var secretKey []byte

func init() {
	//godotenv.Load() // Load environment variables from .env file
	key := os.Getenv("JWT_SECRET")
	if key == "" {
		panic("JWT_SECRET environment variable is required")
	}
	secretKey = []byte(key)
}

func GenerateJWT(userID string) (string, error) {
	claims := jwt.MapClaims{
		"ID": userID,
		"exp": time.Now().Add(24*time.Hour).Unix(),
		"iat": time.Now().Unix(),            	
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		return "", fmt.Errorf("error signing token: %w", err)
	}

	return signedToken, nil
}

func ValidateJWT(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return secretKey, nil
	})
	if err != nil {
		return "", fmt.Errorf("error parsing token: %w", err)
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		userID := claims["ID"].(string)
		return userID, nil
	}
	return "", fmt.Errorf("invalid token")
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err:= bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
