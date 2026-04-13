package config

import (
	"log"
	"os"
	"strings"
)

type Config struct {
	Port             string
	DatabaseURL      string
	RedisAddr        string
	RedisPassword    string
	KafkaBrokers     []string
	PolygonRPCURL    string
	SignerPrivateKey  string
	ContractAddress  string
	SentryDSN        string
}

func Load() *Config {
	cfg := &Config{
		Port:            getEnv("PORT", "3004"),
		DatabaseURL:     mustEnv("DATABASE_URL"),
		RedisAddr:       getEnv("REDIS_HOST", "localhost") + ":" + getEnv("REDIS_PORT", "6379"),
		RedisPassword:   getEnv("REDIS_PASSWORD", ""),
		KafkaBrokers:    strings.Split(getEnv("KAFKA_BROKERS", "localhost:9092"), ","),
		PolygonRPCURL:   mustEnv("POLYGON_RPC_URL"),
		SignerPrivateKey: mustEnv("DEPLOYER_PRIVATE_KEY"),
		ContractAddress: mustEnv("MONDEGA_CONTRACT_ADDRESS"),
		SentryDSN:       getEnv("SENTRY_DSN", ""),
	}
	return cfg
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("Required environment variable %s is not set", key)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
