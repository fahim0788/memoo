/**
 * Système de traduction centralisé pour MemoList
 *
 * Usage:
 *   import { t } from "@/lib/i18n";
 *   <button>{t.common.save}</button>
 */

// ============================================================================
// Types
// ============================================================================

export type Language = 'fr' | 'en';

export interface Translations {
  // Commun - Textes réutilisés partout
  common: {
    back: string;
    save: string;
    cancel: string;
    delete: string;
    confirm: string;
    edit: string;
    add: string;
    loading: string;
    error: string;
    success: string;
    close: string;
    search: string;
    filter: string;
    name: string;
    description: string;
    cards: string;
    card: string;
    remove: string;
  };

  // Authentification
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    loginButton: string;
    logoutButton: string;
    loginError: string;
    loginSuccess: string;
    register: string;
    registerButton: string;
    alreadyAccount: string;
    noAccount: string;
    loginTitle: string;
    registerTitle: string;
    tagline: string;
    footerText: string;
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
  };

  // Menu principal / Navigation
  menu: {
    title: string;
    myDecks: string;
    myLists: string;
    available: string;
    stats: string;
    settings: string;
    sync: string;
  };

  // Vue d'étude (StudyView)
  study: {
    question: string;
    answer: string;
    reference: string;
    validate: string;
    showAnswer: string;
    next: string;
    correct: string;
    incorrect: string;
    finished: string;
    noDueCards: string;
    todayLabel: string;
    typeYourAnswer: string;
    scramblePlaceholder: string;
    listenEn: string;
    listenFr: string;
    evaluating: string;
  };

  // Vue d'édition de deck (EditDeckView)
  edit: {
    deckName: string;
    editDeck: string;
    addCard: string;
    editCard: string;
    deleteCard: string;
    cardQuestion: string;
    cardAnswers: string;
    cardImage: string;
    searchCards: string;
    noCards: string;
    cardCount: string;
    questionRequired: string;
    errorUpdate: string;
    errorDelete: string;
    errorAdd: string;
    errorRename: string;
    confirmDelete: string;
    confirmDeleteMessage: string;
    moveUp: string;
    moveDown: string;
    deleteTooltip: string;
    clickToRename: string;
  };

  // Vue de création de deck (CreateDeckView)
  create: {
    title: string;
    deckName: string;
    deckDescription: string;
    create: string;
    cancel: string;
    nameRequired: string;
    errorCreate: string;
    jsonContent: string;
    namePlaceholder: string;
    creating: string;
    nameRequiredError: string;
    jsonRequiredError: string;
    jsonInvalidError: string;
    minOneCardError: string;
    cardFormatError: string;
    networkError: string;
    formatInvalid: string;
    csvInvalid: string;
    formatUnsupported: string;
    formatTitle: string;
    formatDesc: string;
    exampleTitle: string;
    exampleJson: string;
    exampleCsv: string;
    noteTitle: string;
    noteText: string;
    // Mode simple
    questionLabel: string;
    answerLabel: string;
    addCard: string;
    addAltAnswer: string;
    cardsCount: (n: number) => string;
    noCardsYet: string;
    advancedImport: string;
    createWithCount: (n: number) => string;
    removeCard: string;
    questionRequired: string;
    answerRequired: string;
  };

  // Vue des listes disponibles (AvailableView)
  available: {
    title: string;
    noDecks: string;
    activate: string;
    activated: string;
    cardCount: string;
    errorActivate: string;
    searchPlaceholder: string;
    publicLists: string;
    personalLists: string;
    createPersonal: string;
    noPersonalLists: string;
    allPublicActivated: string;
    addButton: string;
    confirmDelete: string;
    confirmDeleteMessage: string;
    privateBadge: string;
  };

  // Vue du menu (MenuView)
  menuView: {
    welcome: string;
    createNew: string;
    noDecks: string;
    noDecksCta: string;
    study: string;
    editList: string;
    deleteList: string;
    dueCards: string;
    confirmDelete: string;
    confirmDeleteMessage: string;
    errorDelete: string;
    searchPlaceholder: string;
    exploreAvailable: string;
    removeList: string;
    removeButton: string;
    moveUp: string;
    moveDown: string;
    removeConfirmMessage: string;
    legendNotStarted: string;
    legendInProgress: string;
    legendStudied: string;
  };

  // Statistiques (StatsCard)
  stats: {
    title: string;
    totalCards: string;
    dueToday: string;
    studied: string;
    mastered: string;
    streak: string;
    days: string;
    day: string;
    bestStreak: string;
    todayLabel: string;
    successRate: string;
    nextReviews: string;
  };

  // Synchronisation (SyncStatus)
  sync: {
    syncing: string;
    synced: string;
    offline: string;
    pending: string;
    error: string;
    offlinePrefix: string;
    operation: string;
    operations: string;
    errorRetry: string;
    revision: string;
    revisions: string;
    action: string;
    actions: string;
    synchronized: string;
  };

  // Dialogue de confirmation (ConfirmDialog)
  dialog: {
    confirm: string;
    cancel: string;
  };

  // Messages d'erreur génériques
  errors: {
    network: string;
    unauthorized: string;
    notFound: string;
    serverError: string;
    unknown: string;
  };

  // Paramètres (Settings)
  settings: {
    title: string;
    appearance: string;
    light: string;
    dark: string;
    account: string;
    logout: string;
    version: string;
    closeButton: string;
  };

  // Page d'aide (HelpView)
  help: {
    title: string;
    welcomeTitle: string;
    welcomeText: string;
    studyTitle: string;
    studyText: string;
    listsTitle: string;
    listsText: string;
    createTitle: string;
    createText: string;
    chaptersTitle: string;
    chaptersText: string;
    aiTitle: string;
    aiText: string;
    offlineTitle: string;
    offlineText: string;
    settingsTitle: string;
    settingsText: string;
    tipsTitle: string;
    tipsText: string;
  };

  // Chapitres (classification IA)
  chapters: {
    title: string;
    studyAll: string;
    classify: string;
    reclassify: string;
    classifying: string;
    cardCount: string;
    noChapters: string;
    errorClassify: string;
    other: string;
    dueLabel: string;
  };

  // Profil utilisateur
  profile: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    memberSince: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    save: string;
    saving: string;
    saved: string;
    errorUpdate: string;
    passwordMismatch: string;
    currentPasswordRequired: string;
  };

  // Classement (Leaderboard)
  leaderboard: {
    title: string;
    rank: string;
    name: string;
    score: string;
    successRate: string;
    noData: string;
    loading: string;
    you: string;
    reviews: string;
  };

  // Navigation bottom bar
  nav: {
    home: string;
    explore: string;
    add: string;
  };

  // Pluralisation
  plural: {
    cards: (count: number) => string;
    chapters: (count: number) => string;
    days: (count: number) => string;
    operations: (count: number) => string;
    revisions: (count: number) => string;
    actions: (count: number) => string;
  };
}

// ============================================================================
// Traductions françaises
// ============================================================================

const fr: Translations = {
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
    cards: "cartes",
    card: "carte",
    remove: "Retirer",
  },

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
    register: "Inscription",
    registerButton: "Créer mon compte",
    alreadyAccount: "Déjà inscrit ?",
    noAccount: "Pas encore de compte ?",
    loginTitle: "Connexion",
    registerTitle: "Créer un compte",
    tagline: "Apprends par répétition espacée",
    footerText: "Leçons populaires ou créez les vôtres avec vos propres cartes mémoire !",
    firstNamePlaceholder: "Jean",
    lastNamePlaceholder: "Dupont",
    emailPlaceholder: "jean@exemple.fr",
    passwordPlaceholder: "••••••••",
  },

  menu: {
    title: "Memoo",
    myDecks: "Mes études en cours",
    myLists: "Mes études en cours",
    available: "Listes disponibles",
    stats: "Statistiques",
    settings: "Paramètres",
    sync: "Synchronisation",
  },

  study: {
    question: "Question",
    answer: "Réponse",
    reference: "Réponse",
    validate: "Valider",
    showAnswer: "Voir la réponse",
    next: "Suivant",
    correct: "✅ Correct",
    incorrect: "❌ Incorrect",
    finished: "🎉 Terminé",
    noDueCards: "Aucune carte en attente pour le moment.",
    todayLabel: "Aujourd'hui : ",
    typeYourAnswer: "Tape ta réponse…",
    scramblePlaceholder: "Touche les mots dans l'ordre…",
    listenEn: "Écouter EN",
    listenFr: "Écouter FR",
    evaluating: "Vérification...",
  },

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
    moveUp: "Déplacer vers le haut",
    moveDown: "Déplacer vers le bas",
    deleteTooltip: "Supprimer définitivement",
    clickToRename: "Cliquer pour renommer",
  },

  create: {
    title: "Créer une liste personnalisée",
    deckName: "Nom de la liste",
    deckDescription: "Description (optionnel)",
    create: "Créer",
    cancel: "Annuler",
    nameRequired: "Le nom est requis",
    errorCreate: "Erreur lors de la création",
    jsonContent: "Contenu JSON",
    namePlaceholder: "Ma liste personnalisée",
    creating: "Création...",
    nameRequiredError: "Le nom de la liste est requis",
    jsonRequiredError: "Le contenu JSON est requis",
    jsonInvalidError: "Format JSON invalide. Vérifiez la syntaxe.",
    minOneCardError: "La liste doit contenir au moins une carte",
    cardFormatError: "Chaque carte doit avoir une question et au moins une réponse",
    networkError: "Erreur réseau",
    formatInvalid: "Fichier JSON invalide",
    csvInvalid: "Fichier CSV invalide. Vérifiez le format.",
    formatUnsupported: "Format non supporté. Utilisez JSON ou CSV.",
    formatTitle: "Format attendu",
    formatDesc: "Le contenu doit être au format JSON ou CSV :",
    exampleTitle: "Exemple",
    exampleJson: `[
  {
    "question": "Quelle est la capitale de la France ?",
    "answers": ["Paris"],
    "imageUrl": "https://exemple.com/image.jpg"
  }
]`,
    exampleCsv: `question,answers,imageUrl
"Quelle est la capitale de la France ?","Paris","https://exemple.com/image.jpg"`,
    noteTitle: "Note",
    noteText: "Vous pouvez importer un fichier JSON ou CSV en le déposant ici.",
    // Mode simple
    questionLabel: "Question",
    answerLabel: "Réponse",
    addCard: "Ajouter la carte",
    addAltAnswer: "+ réponse alternative",
    cardsCount: (n: number) => `Cartes (${n})`,
    noCardsYet: "Aucune carte ajoutée",
    advancedImport: "Import avancé (JSON / CSV)",
    createWithCount: (n: number) => `Créer la liste (${n} carte${n > 1 ? "s" : ""})`,
    removeCard: "Supprimer",
    questionRequired: "La question est requise",
    answerRequired: "Au moins une réponse est requise",
  },

  available: {
    title: "Listes disponibles",
    noDecks: "Aucune liste disponible pour le moment",
    activate: "Activer",
    activated: "Activée",
    cardCount: "cartes",
    errorActivate: "Erreur lors de l'activation",
    searchPlaceholder: "Rechercher une liste...",
    publicLists: "Listes publiques",
    personalLists: "Mes listes personnalisées",
    createPersonal: "Créer une liste",
    noPersonalLists: "Aucune liste personnalisée pour le moment.",
    allPublicActivated: "Toutes les listes publiques sont déjà activées.",
    addButton: "Étudier",
    confirmDelete: "Supprimer la liste ?",
    confirmDeleteMessage: "Êtes-vous sûr de vouloir supprimer définitivement cette liste ?",
    privateBadge: "privé",
  },

  menuView: {
    welcome: "Bienvenue",
    createNew: "+ Créer une nouvelle liste",
    noDecks: "Aucune liste pour le moment",
    noDecksCta: "Vous n'avez pas encore de liste. Explorez les listes disponibles ci-dessous.",
    study: "Étudier",
    editList: "Modifier",
    deleteList: "Supprimer",
    dueCards: "cartes dues",
    confirmDelete: "Supprimer la liste",
    confirmDeleteMessage: "Êtes-vous sûr de vouloir supprimer cette liste ?",
    errorDelete: "Erreur lors de la suppression",
    searchPlaceholder: "Rechercher...",
    exploreAvailable: "Explorer les listes disponibles",
    removeList: "Retirer la liste ?",
    removeButton: "Retirer",
    moveUp: "Déplacer vers le haut",
    moveDown: "Déplacer vers le bas",
    removeConfirmMessage: "Retirer \"{name}\" de vos listes ? Vous pourrez la rajouter plus tard.",
    legendNotStarted: "Non commencé",
    legendInProgress: "En cours",
    legendStudied: "Étudié",
  },

  stats: {
    title: "Statistiques",
    totalCards: "Cartes totales",
    dueToday: "À réviser aujourd'hui",
    studied: "Étudiées",
    mastered: "Maîtrisées",
    streak: "Streak",
    days: "jours",
    day: "jour",
    bestStreak: "Meilleure série",
    todayLabel: "Aujourd'hui",
    successRate: "Taux de réussite",
    nextReviews: "Prochaines révisions",
  },

  sync: {
    syncing: "Synchronisation...",
    synced: "✓ Synchronisé",
    offline: "Mode hors ligne",
    pending: "En attente",
    error: "Erreur de synchronisation",
    offlinePrefix: "Hors ligne •",
    operation: "opération",
    operations: "opérations",
    errorRetry: "en erreur (réessai automatique)",
    revision: "révision",
    revisions: "révisions",
    action: "action",
    actions: "actions",
    synchronized: "synchronisée",
  },

  dialog: {
    confirm: "Confirmer",
    cancel: "Annuler",
  },

  errors: {
    network: "Erreur réseau. Vérifiez votre connexion.",
    unauthorized: "Session expirée. Veuillez vous reconnecter.",
    notFound: "Ressource non trouvée.",
    serverError: "Erreur serveur. Veuillez réessayer.",
    unknown: "Une erreur inattendue s'est produite.",
  },

  settings: {
    title: "Paramètres",
    appearance: "Apparence",
    light: "Clair",
    dark: "Sombre",
    account: "Compte",
    logout: "Déconnexion",
    version: "Memoo v0.1.0",
    closeButton: "Fermer",
  },

  help: {
    title: "Aide",
    welcomeTitle: "Bienvenue sur Memoo",
    welcomeText: "Memoo est une application de mémorisation par répétition espacée. Elle vous aide à apprendre efficacement en vous présentant les cartes au bon moment, juste avant que vous ne les oubliez.",
    studyTitle: "Étudier une liste",
    studyText: "Sélectionnez une liste depuis l'écran principal, puis choisissez un chapitre ou \"Tout étudier\". Pour chaque carte, lisez la question, tapez votre réponse puis validez. L'app vous dira si c'est correct et planifiera la prochaine révision automatiquement.",
    listsTitle: "Gérer ses listes",
    listsText: "Depuis le menu principal, appuyez sur \"Explorer les listes disponibles\" pour découvrir les listes publiques et vos listes personnalisées. Ajoutez celles qui vous intéressent à vos études. Vous pouvez réorganiser vos listes avec les flèches et personnaliser leurs icônes.",
    createTitle: "Créer une liste personnalisée",
    createText: "Dans l'explorateur de listes, appuyez sur \"Créer une liste\". Donnez-lui un nom, puis importez vos cartes au format JSON ou CSV. Chaque carte doit avoir une question et au moins une réponse. Vous pouvez aussi ajouter des images.",
    chaptersTitle: "Chapitres",
    chaptersText: "Les listes avec beaucoup de cartes peuvent être organisées en chapitres. Avant d'étudier, vous voyez les chapitres disponibles et pouvez choisir lequel réviser. Les pastilles colorées indiquent votre progression.",
    aiTitle: "Organisation par IA",
    aiText: "Pour les listes sans chapitres, utilisez le bouton \"Organiser en chapitres (IA)\" pour que l'intelligence artificielle regroupe automatiquement vos cartes par thème. Vous pouvez réorganiser à tout moment.",
    offlineTitle: "Mode hors-ligne",
    offlineText: "Memoo fonctionne même sans connexion internet. Vos réponses sont enregistrées localement et synchronisées automatiquement dès que la connexion revient. La barre de statut en bas vous indique l'état de la synchronisation.",
    settingsTitle: "Paramètres",
    settingsText: "Cliquez sur l'icône d'engrenage pour accéder aux paramètres. Vous pouvez basculer entre le thème clair et sombre. Le bouton drapeau dans l'en-tête permet de changer la langue de l'interface entre français et anglais.",
    tipsTitle: "Astuces",
    tipsText: "Révisez un peu chaque jour plutôt que beaucoup d'un coup. La répétition espacée est plus efficace avec des sessions courtes et régulières. Consultez vos statistiques pour suivre votre progression et maintenir votre série de jours consécutifs.",
  },

  chapters: {
    title: "Chapitres",
    studyAll: "Tout étudier",
    classify: "Organiser en chapitres (IA)",
    reclassify: "Réorganiser (IA)",
    classifying: "Classification en cours...",
    cardCount: "cartes",
    noChapters: "Pas encore de chapitres. Utilisez l'IA pour organiser automatiquement.",
    errorClassify: "Erreur lors de la classification",
    other: "Autres",
    dueLabel: "à réviser",
  },

  profile: {
    title: "Profil",
    firstName: "Prénom",
    lastName: "Nom",
    email: "Email",
    memberSince: "Membre depuis",
    changePassword: "Changer le mot de passe",
    currentPassword: "Mot de passe actuel",
    newPassword: "Nouveau mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    save: "Enregistrer",
    saving: "Enregistrement...",
    saved: "Profil mis à jour",
    errorUpdate: "Erreur lors de la mise à jour",
    passwordMismatch: "Les mots de passe ne correspondent pas",
    currentPasswordRequired: "Mot de passe actuel requis",
  },

  leaderboard: {
    title: "Classement",
    rank: "#",
    name: "Nom",
    score: "Score",
    successRate: "Réussite",
    noData: "Personne n'a encore étudié cette liste.",
    loading: "Chargement du classement...",
    you: "(vous)",
    reviews: "révisions",
  },

  nav: {
    home: "Accueil",
    explore: "Explorer",
    add: "Ajouter",
  },

  plural: {
    cards: (count: number) => count === 1 ? "carte" : "cartes",
    chapters: (count: number) => count === 1 ? "chapitre" : "chapitres",
    days: (count: number) => count === 1 ? "jour" : "jours",
    operations: (count: number) => count === 1 ? "opération" : "opérations",
    revisions: (count: number) => count === 1 ? "révision" : "révisions",
    actions: (count: number) => count === 1 ? "action" : "actions",
  },
};

// ============================================================================
// English translations
// ============================================================================

const en: Translations = {
  common: {
    back: "← Back",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    edit: "Edit",
    add: "Add",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    close: "Close",
    search: "Search",
    filter: "Filter",
    name: "Name",
    description: "Description",
    cards: "cards",
    card: "card",
    remove: "Remove",
  },

  auth: {
    login: "Login",
    logout: "Logout",
    email: "Email",
    password: "Password",
    firstName: "First Name",
    lastName: "Last Name",
    loginButton: "Sign in",
    logoutButton: "Sign out",
    loginError: "Invalid email or password",
    loginSuccess: "Successfully logged in",
    register: "Sign up",
    registerButton: "Create my account",
    alreadyAccount: "Already have an account?",
    noAccount: "Don't have an account yet?",
    loginTitle: "Login",
    registerTitle: "Create an account",
    tagline: "Learn with spaced repetition",
    footerText: "Popular lessons or create your own with your own flashcards!",
    firstNamePlaceholder: "John",
    lastNamePlaceholder: "Doe",
    emailPlaceholder: "john@example.com",
    passwordPlaceholder: "••••••••",
  },

  menu: {
    title: "Memoo",
    myDecks: "My Current Studies",
    myLists: "My Current Studies",
    available: "Available Lists",
    stats: "Statistics",
    settings: "Settings",
    sync: "Synchronization",
  },

  study: {
    question: "Question",
    answer: "Answer",
    reference: "Answer",
    validate: "Validate",
    showAnswer: "Show answer",
    next: "Next",
    correct: "✅ Correct",
    incorrect: "❌ Incorrect",
    finished: "🎉 Finished",
    noDueCards: "No cards due at the moment.",
    todayLabel: "Today: ",
    typeYourAnswer: "Type your answer…",
    scramblePlaceholder: "Tap the words in order…",
    listenEn: "Listen EN",
    listenFr: "Listen FR",
    evaluating: "Checking...",
  },

  edit: {
    deckName: "List name",
    editDeck: "Edit list",
    addCard: "Add card",
    editCard: "Edit card",
    deleteCard: "Delete card",
    cardQuestion: "Question",
    cardAnswers: "Answers (comma-separated)",
    cardImage: "Image URL (optional, e.g.: https://memoo.fr/storage/flags/france.svg)",
    searchCards: "Search for a card...",
    noCards: "No cards in this list",
    cardCount: "card(s)",
    questionRequired: "Question and at least one answer required",
    errorUpdate: "Error updating card",
    errorDelete: "Error deleting card",
    errorAdd: "Error adding card",
    errorRename: "Error renaming list",
    confirmDelete: "Permanently delete card",
    confirmDeleteMessage: "Are you sure you want to delete this card?",
    moveUp: "Move up",
    moveDown: "Move down",
    deleteTooltip: "Delete permanently",
    clickToRename: "Click to rename",
  },

  create: {
    title: "Create a custom list",
    deckName: "List name",
    deckDescription: "Description (optional)",
    create: "Create",
    cancel: "Cancel",
    nameRequired: "Name is required",
    errorCreate: "Error creating list",
    jsonContent: "JSON content",
    namePlaceholder: "My custom list",
    creating: "Creating...",
    nameRequiredError: "List name is required",
    jsonRequiredError: "JSON content is required",
    jsonInvalidError: "Invalid JSON format. Check syntax.",
    minOneCardError: "List must contain at least one card",
    cardFormatError: "Each card must have a question and at least one answer",
    networkError: "Network error",
    formatInvalid: "Invalid JSON file",
    csvInvalid: "Invalid CSV file. Check format.",
    formatUnsupported: "Unsupported format. Use JSON or CSV.",
    formatTitle: "Expected format",
    formatDesc: "Content must be in JSON or CSV format:",
    exampleTitle: "Example",
    exampleJson: `[
  {
    "question": "What is the capital of France?",
    "answers": ["Paris"],
    "imageUrl": "https://example.com/image.jpg"
  }
]`,
    exampleCsv: `question,answers,imageUrl
"What is the capital of France?","Paris","https://example.com/image.jpg"`,
    noteTitle: "Note",
    noteText: "You can import a JSON or CSV file by dropping it here.",
    // Simple mode
    questionLabel: "Question",
    answerLabel: "Answer",
    addCard: "Add card",
    addAltAnswer: "+ alternative answer",
    cardsCount: (n: number) => `Cards (${n})`,
    noCardsYet: "No cards added yet",
    advancedImport: "Advanced import (JSON / CSV)",
    createWithCount: (n: number) => `Create list (${n} card${n > 1 ? "s" : ""})`,
    removeCard: "Remove",
    questionRequired: "Question is required",
    answerRequired: "At least one answer is required",
  },

  available: {
    title: "Available Lists",
    noDecks: "No lists available at the moment",
    activate: "Activate",
    activated: "Activated",
    cardCount: "cards",
    errorActivate: "Error activating list",
    searchPlaceholder: "Search for a list...",
    publicLists: "Public Lists",
    personalLists: "My Custom Lists",
    createPersonal: "Create a list",
    noPersonalLists: "No custom lists yet.",
    allPublicActivated: "All public lists are already activated.",
    addButton: "Study",
    confirmDelete: "Delete list?",
    confirmDeleteMessage: "Are you sure you want to permanently delete this list?",
    privateBadge: "private",
  },

  menuView: {
    welcome: "Welcome",
    createNew: "+ Create a new list",
    noDecks: "No lists yet",
    noDecksCta: "You don't have any lists yet. Explore available lists below.",
    study: "Study",
    editList: "Edit",
    deleteList: "Delete",
    dueCards: "cards due",
    confirmDelete: "Delete list",
    confirmDeleteMessage: "Are you sure you want to delete this list?",
    errorDelete: "Error deleting list",
    searchPlaceholder: "Search...",
    exploreAvailable: "Explore available lists",
    removeList: "Remove list?",
    removeButton: "Remove",
    moveUp: "Move up",
    moveDown: "Move down",
    removeConfirmMessage: "Remove \"{name}\" from your lists? You can add it back later.",
    legendNotStarted: "Not started",
    legendInProgress: "In progress",
    legendStudied: "Studied",
  },

  stats: {
    title: "Statistics",
    totalCards: "Total cards",
    dueToday: "Due today",
    studied: "Studied",
    mastered: "Mastered",
    streak: "Streak",
    days: "days",
    day: "day",
    bestStreak: "Best streak",
    todayLabel: "Today",
    successRate: "Success rate",
    nextReviews: "Next reviews",
  },

  sync: {
    syncing: "Synchronizing...",
    synced: "✓ Synchronized",
    offline: "Offline mode",
    pending: "Pending",
    error: "Synchronization error",
    offlinePrefix: "Offline •",
    operation: "operation",
    operations: "operations",
    errorRetry: "failed (auto-retry)",
    revision: "review",
    revisions: "reviews",
    action: "action",
    actions: "actions",
    synchronized: "synchronized",
  },

  dialog: {
    confirm: "Confirm",
    cancel: "Cancel",
  },

  errors: {
    network: "Network error. Check your connection.",
    unauthorized: "Session expired. Please log in again.",
    notFound: "Resource not found.",
    serverError: "Server error. Please try again.",
    unknown: "An unexpected error occurred.",
  },

  settings: {
    title: "Settings",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    account: "Account",
    logout: "Logout",
    version: "Memoo v0.1.0",
    closeButton: "Close",
  },

  help: {
    title: "Help",
    welcomeTitle: "Welcome to Memoo",
    welcomeText: "Memoo is a spaced repetition learning app. It helps you memorize effectively by showing you cards at the right time, just before you forget them.",
    studyTitle: "Study a list",
    studyText: "Select a list from the main screen, then choose a chapter or \"Study all\". For each card, read the question, type your answer and validate. The app will tell you if it's correct and automatically schedule the next review.",
    listsTitle: "Manage your lists",
    listsText: "From the main menu, tap \"Explore available lists\" to discover public lists and your custom lists. Add the ones you're interested in to your studies. You can reorder your lists with arrows and customize their icons.",
    createTitle: "Create a custom list",
    createText: "In the list explorer, tap \"Create a list\". Give it a name, then import your cards in JSON or CSV format. Each card must have a question and at least one answer. You can also add images.",
    chaptersTitle: "Chapters",
    chaptersText: "Lists with many cards can be organized into chapters. Before studying, you see available chapters and can choose which one to review. Colored dots indicate your progress.",
    aiTitle: "AI organization",
    aiText: "For lists without chapters, use the \"Organize into chapters (AI)\" button to let artificial intelligence automatically group your cards by theme. You can reorganize at any time.",
    offlineTitle: "Offline mode",
    offlineText: "Memoo works even without an internet connection. Your answers are saved locally and automatically synced when the connection returns. The status bar at the bottom shows the sync state.",
    settingsTitle: "Settings",
    settingsText: "Click the gear icon to access settings. You can switch between light and dark themes. The flag button in the header lets you change the interface language between French and English.",
    tipsTitle: "Tips",
    tipsText: "Review a little every day rather than a lot at once. Spaced repetition is more effective with short, regular sessions. Check your stats to track your progress and maintain your streak of consecutive days.",
  },

  chapters: {
    title: "Chapters",
    studyAll: "Study all",
    classify: "Organize into chapters (AI)",
    reclassify: "Reorganize (AI)",
    classifying: "Classifying...",
    cardCount: "cards",
    noChapters: "No chapters yet. Use AI to organize automatically.",
    errorClassify: "Error classifying cards",
    other: "Other",
    dueLabel: "due",
  },

  profile: {
    title: "Profile",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    memberSince: "Member since",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmPassword: "Confirm password",
    save: "Save",
    saving: "Saving...",
    saved: "Profile updated",
    errorUpdate: "Error updating profile",
    passwordMismatch: "Passwords do not match",
    currentPasswordRequired: "Current password required",
  },

  leaderboard: {
    title: "Leaderboard",
    rank: "#",
    name: "Name",
    score: "Score",
    successRate: "Success",
    noData: "No one has studied this list yet.",
    loading: "Loading leaderboard...",
    you: "(you)",
    reviews: "reviews",
  },

  nav: {
    home: "Home",
    explore: "Explore",
    add: "Add",
  },

  plural: {
    cards: (count: number) => count === 1 ? "card" : "cards",
    chapters: (count: number) => count === 1 ? "chapter" : "chapters",
    days: (count: number) => count === 1 ? "day" : "days",
    operations: (count: number) => count === 1 ? "operation" : "operations",
    revisions: (count: number) => count === 1 ? "review" : "reviews",
    actions: (count: number) => count === 1 ? "action" : "actions",
  },
};

// ============================================================================
// État global de la langue (localStorage)
// ============================================================================

const translations: Record<Language, Translations> = { fr, en };

let currentLanguage: Language = 'fr';

// Charger la langue depuis localStorage au démarrage
if (typeof window !== 'undefined') {
  const savedLang = localStorage.getItem('memoo-language') as Language | null;
  if (savedLang && (savedLang === 'fr' || savedLang === 'en')) {
    currentLanguage = savedLang;
  }
}

/**
 * Obtenir les traductions pour la langue actuelle
 */
export function getTranslations(): Translations {
  return translations[currentLanguage];
}

/**
 * Obtenir la langue actuelle
 */
export function getCurrentLanguage(): Language {
  return currentLanguage;
}

/**
 * Changer la langue
 */
export function setLanguage(lang: Language): void {
  currentLanguage = lang;
  if (typeof window !== 'undefined') {
    localStorage.setItem('memoo-language', lang);
    // Dispatch event pour forcer le re-render des composants
    window.dispatchEvent(new Event('language-change'));
  }
}

/**
 * Export par défaut pour usage simple (réactif)
 */
export const t = new Proxy({} as Translations, {
  get: (_target, prop: string) => {
    const translations = getTranslations();
    return (translations as any)[prop];
  },
});
