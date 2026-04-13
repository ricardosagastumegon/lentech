package server

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/mondega/tx-engine/internal/config"
	"github.com/mondega/tx-engine/internal/engine"
)

type Server struct {
	cfg    *config.Config
	engine *engine.Engine
	http   *http.Server
}

func New(cfg *config.Config, eng *engine.Engine) *Server {
	s := &Server{cfg: cfg, engine: eng}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", s.healthHandler)
	mux.HandleFunc("/metrics", s.metricsHandler)

	s.http = &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.Port),
		Handler: mux,
	}

	return s
}

func (s *Server) Start() error {
	return s.http.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.http.Shutdown(ctx)
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	health := s.engine.Health()
	allOK := true
	for _, v := range health {
		if v != "ok" {
			allOK = false
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if !allOK {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(health)
}

func (s *Server) metricsHandler(w http.ResponseWriter, r *http.Request) {
	// In production: expose Prometheus metrics
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}
