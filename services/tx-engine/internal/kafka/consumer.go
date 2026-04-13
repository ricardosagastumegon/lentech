// ============================================================
// MONDEGA DIGITAL — Kafka Consumer (TX Engine)
// Consumes 'tx-execute' topic, processes transactions
// ============================================================

package kafka

import (
	"context"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
	"github.com/mondega/tx-engine/internal/config"
	"github.com/mondega/tx-engine/internal/engine"
)

const (
	TopicTxExecute   = "tx-execute"
	TopicTxCompleted = "tx-completed"
	TopicTxFailed    = "tx-failed"
	ConsumerGroup    = "tx-engine-group"
)

type Consumer struct {
	reader   *kafka.Reader
	writer   *kafka.Writer
	engine   *engine.Engine
}

func NewConsumer(cfg *config.Config, eng *engine.Engine) (*Consumer, error) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.KafkaBrokers,
		Topic:          TopicTxExecute,
		GroupID:        ConsumerGroup,
		MinBytes:       1,
		MaxBytes:       10e6, // 10 MB
		CommitInterval: 0,    // Manual commit — only after successful processing
	})

	writer := &kafka.Writer{
		Addr:                   kafka.TCP(cfg.KafkaBrokers...),
		Balancer:               &kafka.LeastBytes{},
		RequiredAcks:           kafka.RequireAll, // All replicas must ack (durability)
		AllowAutoTopicCreation: false,
	}

	return &Consumer{
		reader: reader,
		writer: writer,
		engine: eng,
	}, nil
}

func (c *Consumer) Start(ctx context.Context) error {
	log.Printf("Kafka consumer started — listening on topic '%s'", TopicTxExecute)

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil {
				return nil // Normal shutdown
			}
			log.Printf("Kafka fetch error: %v", err)
			continue
		}

		var req engine.ProcessRequest
		if err := json.Unmarshal(msg.Value, &req); err != nil {
			log.Printf("Invalid message on %s: %v | value: %s", TopicTxExecute, err, string(msg.Value))
			// Commit bad message to avoid reprocessing poison pills
			c.reader.CommitMessages(ctx, msg)
			continue
		}

		log.Printf("Kafka message received: tx=%s | offset=%d", req.TxID, msg.Offset)

		// Process synchronously — we commit only after completion
		result := c.engine.Process(ctx, req)

		// Publish result to appropriate topic
		topic := TopicTxCompleted
		if result.Status == engine.StatusFailed {
			topic = TopicTxFailed
		}

		resultBytes, _ := json.Marshal(result)
		c.writer.WriteMessages(ctx, kafka.Message{
			Topic: topic,
			Key:   []byte(result.TxID),
			Value: resultBytes,
		})

		// Commit offset — only after successful processing
		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			log.Printf("Failed to commit Kafka offset: %v", err)
		}
	}
}

func (c *Consumer) Close() {
	c.reader.Close()
	c.writer.Close()
}
