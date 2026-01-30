#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# MemoList MVP - Script de développement
# =============================================================================

show_help() {
    echo "Usage: ./scripts/dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  local     Démarre PostgreSQL + apps en local (npm run dev)"
    echo "  docker    Démarre tout via Docker Compose"
    echo "  db        Démarre uniquement PostgreSQL"
    echo "  setup     Configure l'environnement (install + migrations)"
    echo "  stop      Arrête tous les conteneurs"
    echo "  logs      Affiche les logs Docker"
    echo "  clean     Supprime volumes et conteneurs"
    echo ""
}

case "${1:-docker}" in
    local)
        echo "🚀 Démarrage mode local..."

        # Vérifier que le fichier .env existe pour l'API
        if [ ! -f "apps/api/.env" ]; then
            echo "⚠️  Fichier apps/api/.env manquant"
            echo "📝 Création depuis .env.example..."
            if [ -f "apps/api/.env.example" ]; then
                cp apps/api/.env.example apps/api/.env
            else
                echo "DATABASE_URL=postgresql://memolist:memolist@localhost:5432/memolist" > apps/api/.env
            fi
            echo "✅ Fichier .env créé"
        fi

        echo "📦 Lancement PostgreSQL..."
        docker compose -f docker-compose.dev.yml up -d

        echo "⏳ Attente de PostgreSQL..."
        sleep 5

        echo "📦 Vérification des dépendances..."
        if [ ! -d "apps/api/node_modules" ]; then
            echo "Installation des dépendances de l'API..."
            cd apps/api && npm install && cd ../..
        fi
        if [ ! -d "apps/web/node_modules" ]; then
            echo "Installation des dépendances du web..."
            cd apps/web && npm install && cd ../..
        fi

        echo "🔧 Génération du client Prisma..."
        cd apps/api && npx prisma generate && cd ../..

        echo "🔄 Migration Prisma..."
        cd apps/api && npx prisma migrate dev 2>/dev/null || npx prisma db push && cd ../..

        echo "🌐 Démarrage des apps..."
        echo "   Web: http://localhost:3000"
        echo "   API: http://localhost:3001"
        echo ""

        # Lancer les deux apps en parallèle
        (cd apps/web && npm run dev) &
        (cd apps/api && npm run dev) &

        wait
        ;;

    docker)
        echo "🐳 Démarrage Docker Compose complet..."
        docker compose up --build
        ;;

    db)
        echo "📦 Démarrage PostgreSQL uniquement..."
        docker compose -f docker-compose.dev.yml up -d
        echo "✅ PostgreSQL disponible sur localhost:5432"
        ;;

    stop)
        echo "🛑 Arrêt des conteneurs..."
        docker compose down 2>/dev/null || true
        docker compose -f docker-compose.dev.yml down 2>/dev/null || true
        ;;

    logs)
        docker compose logs -f
        ;;

    clean)
        echo "🧹 Nettoyage complet..."
        docker compose down -v 2>/dev/null || true
        docker compose -f docker-compose.dev.yml down -v 2>/dev/null || true
        echo "✅ Volumes et conteneurs supprimés"
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        echo "❌ Commande inconnue: $1"
        show_help
        exit 1
        ;;
esac
