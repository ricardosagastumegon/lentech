# ============================================================
# tx-engine — Multi-stage build (Go 1.22)
# ============================================================

FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates tzdata
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-w -s" -o /bin/tx-engine ./cmd/server

# ---- minimal runtime ----
FROM scratch AS runner
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /bin/tx-engine /tx-engine

EXPOSE 8090
ENV TZ=UTC
ENTRYPOINT ["/tx-engine"]
