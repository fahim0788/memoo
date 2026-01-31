# =============================================================================
# Makefile - Commandes utiles pour le déploiement
# =============================================================================

.PHONY: help build-push deploy secrets status logs clean

# Variables
CONFIG_FILE ?= config.json
COMPOSE_FILE = docker-compose.prod.yml

help: ## Afficher l'aide
	@echo "Commandes disponibles:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Déploiement local -> Pi
# =============================================================================

secrets: ## Générer des secrets sécurisés
	@chmod +x scripts/generate-secrets.sh
	@./scripts/generate-secrets.sh

build-push: ## Build et transférer les images vers le Pi
	@chmod +x scripts/build-and-push.sh
	@./scripts/build-and-push.sh $(CONFIG_FILE)

# =============================================================================
# Commandes à exécuter sur le Pi (via SSH)
# =============================================================================

setup: ## Migration initiale (à exécuter sur le Pi)
	@chmod +x scripts/initial-setup.sh
	@./scripts/initial-setup.sh

deploy: ## Déploiement quotidien (à exécuter sur le Pi)
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh

deploy-quick: ## Déploiement sans backup ni migrations
	@chmod +x scripts/deploy.sh
	@./scripts/deploy.sh --skip-backup --skip-migrations

# =============================================================================
# Gestion des services (sur le Pi)
# =============================================================================

status: ## Voir l'état des conteneurs
	@docker-compose -f $(COMPOSE_FILE) ps

logs: ## Voir les logs en temps réel
	@docker-compose -f $(COMPOSE_FILE) logs -f

logs-api: ## Voir les logs de l'API
	@docker-compose -f $(COMPOSE_FILE) logs -f api

logs-web: ## Voir les logs du Web
	@docker-compose -f $(COMPOSE_FILE) logs -f web

logs-nginx: ## Voir les logs de Nginx
	@docker-compose -f $(COMPOSE_FILE) logs -f nginx

restart: ## Redémarrer tous les services
	@docker-compose -f $(COMPOSE_FILE) restart

restart-api: ## Redémarrer l'API
	@docker-compose -f $(COMPOSE_FILE) restart api

restart-web: ## Redémarrer le Web
	@docker-compose -f $(COMPOSE_FILE) restart web

stop: ## Arrêter tous les services
	@docker-compose -f $(COMPOSE_FILE) down

start: ## Démarrer tous les services
	@docker-compose -f $(COMPOSE_FILE) up -d

# =============================================================================
# Base de données (sur le Pi)
# =============================================================================

db-shell: ## Se connecter à la base de données
	@docker-compose -f $(COMPOSE_FILE) exec db psql -U memolist -d memolist

db-backup: ## Créer un backup de la base de données
	@mkdir -p backups
	@docker-compose -f $(COMPOSE_FILE) exec -T db pg_dump -U memolist memolist > backups/manual-backup-$$(date +%Y%m%d-%H%M%S).sql
	@echo "Backup créé dans backups/"

db-migrate: ## Exécuter les migrations Prisma
	@docker-compose -f $(COMPOSE_FILE) run --rm api npx prisma migrate deploy

# =============================================================================
# Nettoyage (sur le Pi)
# =============================================================================

clean: ## Nettoyer les images Docker inutilisées
	@docker image prune -a -f

clean-all: ## Nettoyage complet (ATTENTION!)
	@echo "⚠️  Ceci va supprimer toutes les images et volumes non utilisés"
	@read -p "Êtes-vous sûr? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker system prune -a --volumes -f; \
	fi

# =============================================================================
# Développement local
# =============================================================================

dev: ## Lancer l'environnement de développement local
	@docker-compose up -d

dev-logs: ## Voir les logs en développement
	@docker-compose logs -f

dev-down: ## Arrêter l'environnement de développement
	@docker-compose down
