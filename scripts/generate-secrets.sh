#!/bin/bash
# =============================================================================
# Générateur de secrets sécurisés
# Usage: ./scripts/generate-secrets.sh
# =============================================================================

echo "========================================="
echo "  Générateur de secrets sécurisés"
echo "========================================="
echo ""

# Vérifier si openssl est disponible
if ! command -v openssl &> /dev/null; then
    echo "❌ openssl n'est pas installé"
    exit 1
fi

echo "🔐 Génération des secrets..."
echo ""

# Générer un mot de passe pour PostgreSQL
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
echo "POSTGRES_PASSWORD:"
echo "$POSTGRES_PASSWORD"
echo ""

# Générer un secret JWT
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-48)
echo "JWT_SECRET:"
echo "$JWT_SECRET"
echo ""

# Afficher le format pour config.json
echo "========================================="
echo "Pour config.json:"
echo "========================================="
cat << EOF
{
  "database": {
    "password": "$POSTGRES_PASSWORD"
  },
  "security": {
    "jwt_secret": "$JWT_SECRET"
  }
}
EOF

echo ""
echo "========================================="
echo "Pour .env (sur le Pi):"
echo "========================================="
cat << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
DATABASE_URL=postgresql://memolist:$POSTGRES_PASSWORD@db:5432/memolist
EOF

echo ""
echo "⚠️  Copiez ces valeurs dans config.json et .env"
echo "⚠️  Ne partagez jamais ces secrets !"
echo ""
