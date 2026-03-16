.PHONY: help up down logs producer spark dashboard api dbt-run dbt-test bq-setup clean

# ─── Colors ──────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

help: ## Show this help
	@echo ""
	@echo "  Ad Spend Optimizer — Dev Commands"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ─── Infrastructure ──────────────────────────────────────────
up: ## Start Kafka, Zookeeper, Spark via Docker Compose
	docker-compose up -d zookeeper kafka spark-master spark-worker kafka-ui
	@echo "✅  Kafka UI: http://localhost:8080"
	@echo "✅  Spark UI: http://localhost:8081"

down: ## Stop all Docker services
	docker-compose down

logs: ## Tail logs for all services
	docker-compose logs -f

# ─── Services ────────────────────────────────────────────────
producer: ## Run Kafka ad event producer
	cd kafka/producer && pip install -r requirements.txt -q && python producer.py

spark: ## Submit Spark streaming job
	spark-submit \
		--packages org.apache.spark:spark-sql-kafka-0-10_2.12:3.4.0,com.google.cloud.spark:spark-bigquery-with-dependencies_2.12:0.34.0 \
		spark/streaming_job.py

api: ## Run FastAPI backend (dev)
	cd api && pip install -r requirements.txt -q && uvicorn main:app --reload --port 8000

dashboard: ## Run React dashboard (dev)
	cd dashboard && npm install && npm run dev

# ─── Data / dbt ──────────────────────────────────────────────
bq-setup: ## Create BigQuery datasets and tables
	python bigquery/setup_schema.py

dbt-deps: ## Install dbt packages
	cd dbt && dbt deps

dbt-run: ## Run dbt models (dev)
	cd dbt && dbt run --target dev

dbt-test: ## Run dbt tests
	cd dbt && dbt test --target dev

dbt-docs: ## Serve dbt docs locally
	cd dbt && dbt docs generate && dbt docs serve --port 8082

# ─── Full local stack ─────────────────────────────────────────
start: up ## Start everything needed for local dev
	@echo ""
	@echo "  Next steps:"
	@echo "  1. make producer   (in a new terminal)"
	@echo "  2. make api        (in a new terminal)"
	@echo "  3. make dashboard  (in a new terminal)"
	@echo ""

# ─── Cleanup ─────────────────────────────────────────────────
clean: ## Remove build artifacts
	rm -rf dashboard/dist dashboard/node_modules
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete 2>/dev/null || true
	rm -rf dbt/target dbt/dbt_packages
