/**
 * Système de traduction centralisé pour MemoList
 *
 * Usage:
 *   import { t } from "@/lib/i18n";
 *   <button>{t.common.save}</button>
 */

export const translations = {
  // ============================================================================
  // Commun - Textes réutilisés partout
  // ============================================================================
  common: {
    back: "← Retour",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    confirm: "Confirmer",
    edit: "Modifier",
    add: "Ajouter",
    loading: "Chargement...",
    error: "Erreur",
    success: "Succès",
    close: "Fermer",
    search: "Rechercher",
    filter: "Filtrer",
    name: "Nom",
    description: "Description",
  },

  // ============================================================================
  // Authentification
  // ============================================================================
  auth: {
    login: "Connexion",
    logout: "Déconnexion",
    email: "Email",
    password: "Mot de passe",
    firstName: "Prénom",
    lastName: "Nom",
    loginButton: "Se connecter",
    logoutButton: "Se déconnecter",
    loginError: "Email ou mot de passe incorrect",
    loginSuccess: "Connexion réussie",
  },

  // ============================================================================
  // Menu principal / Navigation
  // ============================================================================
  menu: {
    title: "Memoo",
    myDecks: "Mes listes",
    available: "Listes disponibles",
    stats: "Statistiques",
    settings: "Paramètres",
    sync: "Synchronisation",
  },

  // ============================================================================
  // Vue d'étude (StudyView)
  // ============================================================================
  study: {
    question: "Question",
    answer: "Réponse",
    reference: "Référence : ",
    validate: "Valider",
    showAnswer: "Voir la réponse",
    next: "Suivant",
    correct: "✅ Correct",
    incorrect: "❌ Incorrect",
    finished: "🎉 Terminé",
    noDueCards: "Aucune carte en attente pour le moment.",
    todayLabel: "Aujourd'hui : ",
    typeYourAnswer: "Tape ta réponse…",
  },

  // ============================================================================
  // Vue d'édition de deck (EditDeckView)
  // ============================================================================
  edit: {
    deckName: "Nom de la liste",
    editDeck: "Modifier la liste",
    addCard: "Ajouter une carte",
    editCard: "Modifier la carte",
    deleteCard: "Supprimer la carte",
    cardQuestion: "Question",
    cardAnswers: "Réponses (séparées par des virgules)",
    cardImage: "URL de l'image (optionnel, ex: https://memoo.fr/storage/flags/france.svg)",
    searchCards: "Rechercher une carte...",
    noCards: "Aucune carte dans cette liste",
    cardCount: "carte(s)",
    questionRequired: "Question et au moins une réponse requises",
    errorUpdate: "Erreur lors de la modification",
    errorDelete: "Erreur lors de la suppression",
    errorAdd: "Erreur lors de l'ajout",
    errorRename: "Erreur lors du renommage",
    confirmDelete: "Supprimer définitivement la carte",
    confirmDeleteMessage: "Êtes-vous sûr de vouloir supprimer cette carte ?",
  },

  // ============================================================================
  // Vue de création de deck (CreateDeckView)
  // ============================================================================
  create: {
    title: "Créer une nouvelle liste",
    deckName: "Nom de la liste",
    deckDescription: "Description (optionnel)",
    create: "Créer",
    cancel: "Annuler",
    nameRequired: "Le nom est requis",
    errorCreate: "Erreur lors de la création",
  },

  // ============================================================================
  // Vue des listes disponibles (AvailableView)
  // ============================================================================
  available: {
    title: "Listes disponibles",
    noDecks: "Aucune liste disponible pour le moment",
    activate: "Activer",
    activated: "Activée",
    cardCount: "cartes",
    errorActivate: "Erreur lors de l'activation",
  },

  // ============================================================================
  // Vue du menu (MenuView)
  // ============================================================================
  menuView: {
    welcome: "Bienvenue",
    createNew: "+ Créer une nouvelle liste",
    noDecks: "Aucune liste pour le moment",
    study: "Étudier",
    editList: "Modifier",
    deleteList: "Supprimer",
    dueCards: "cartes dues",
    confirmDelete: "Supprimer la liste",
    confirmDeleteMessage: "Êtes-vous sûr de vouloir supprimer cette liste ?",
    errorDelete: "Erreur lors de la suppression",
  },

  // ============================================================================
  // Statistiques (StatsCard)
  // ============================================================================
  stats: {
    title: "Statistiques",
    totalCards: "Cartes totales",
    dueToday: "À réviser aujourd'hui",
    studied: "Étudiées",
    mastered: "Maîtrisées",
    streak: "Série",
    days: "jours",
    bestStreak: "Meilleure série",
  },

  // ============================================================================
  // Synchronisation (SyncStatus)
  // ============================================================================
  sync: {
    syncing: "Synchronisation...",
    synced: "✓ Synchronisé",
    offline: "Mode hors ligne",
    pending: "En attente",
    error: "Erreur de synchronisation",
  },

  // ============================================================================
  // Dialogue de confirmation (ConfirmDialog)
  // ============================================================================
  dialog: {
    confirm: "Confirmer",
    cancel: "Annuler",
  },

  // ============================================================================
  // Messages d'erreur génériques
  // ============================================================================
  errors: {
    network: "Erreur réseau. Vérifiez votre connexion.",
    unauthorized: "Session expirée. Veuillez vous reconnecter.",
    notFound: "Ressource non trouvée.",
    serverError: "Erreur serveur. Veuillez réessayer.",
    unknown: "Une erreur inattendue s'est produite.",
  },
} as const;

// Export par défaut pour usage simple
export const t = translations;

// Type pour l'autocomplétion TypeScript
export type Translations = typeof translations;
