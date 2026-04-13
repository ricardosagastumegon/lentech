// ============================================================
// MONDEGA DIGITAL — TX Engine (Go)
// High-performance transaction processor
// Port: 3004 | Kafka consumer for blockchain execution
// ============================================================

package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/mondega/tx-engine/internal/config"
	"github.com/mondega/tx-engine/internal/engine"
	"github.com/mondega/tx-engine/internal/kafka"
	"github.com/mondega/tx-engine/internal/server"
)

func main() {
	cfg := config.Load()

	log.Printf("🚀 Mondega TX Engine starting on port %s", cfg.Port)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize transaction engine
	txEngine, err := engine.New(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize TX engine: %v", err)
	}

	// Start Kafka consumer for incoming transaction requests
	consumer, err := kafka.NewConsumer(cfg, txEngine)
	if err != nil {
		log.Fatalf("Failed to initialize Kafka consumer: %v", err)
	}

	// Start HTTP health/metrics server
	srv := server.New(cfg, txEngine)

	// Start all services
	go func() {
		if err := consumer.Start(ctx); err != nil {
			log.Printf("Kafka consumer error: %v", err)
			cancel()
		}
	}()

	go func() {
		if err := srv.Start(); err != nil {
			log.Printf("HTTP server error: %v", err)
			cancel()
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

	select {
	case <-quit:
		log.Println("Shutdown signal received")
	case <-ctx.Done():
		log.Println("Context cancelled")
	}

	log.Println("Shutting down TX Engine gracefully...")
	cancel()
	consumer.Close()
	if err := srv.Shutdown(context.Background()); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}
	log.Println("TX Engine stopped")
}
