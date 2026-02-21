import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité – Memoo",
  description: "Comment Memoo collecte, protège et utilise vos données personnelles.",
};

const CONTACT_EMAIL = "contact@memoo.fr";
const LAST_UPDATED = "21 février 2026";

export default function PrivacyPage() {
  return (
    <div className="app">
      <div
        className="container"
        style={{
          maxWidth: 740,
          margin: "0 auto",
          padding: "2rem 1.25rem 4rem",
          minHeight: "100dvh",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <Link
            href="/"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              fontSize: "0.875rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.375rem",
              marginBottom: "1.5rem",
            }}
          >
            ← Retour
          </Link>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
            Politique de confidentialité
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <Section>
          <p>
            Memoo (<strong>memoo.fr</strong>) est une application d'apprentissage par
            flashcards. La présente politique explique quelles données nous collectons,
            pourquoi, comment nous les protégeons et quels droits vous avez sur vos
            informations personnelles, conformément au Règlement Général sur la
            Protection des Données (RGPD – UE 2016/679).
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>Responsable du traitement :</strong> Memoo – {CONTACT_EMAIL}
          </p>
        </Section>

        {/* 1 – Données collectées */}
        <Section title="1. Données collectées">
          <SubTitle>Compte utilisateur</SubTitle>
          <ul>
            <li>Adresse e-mail (identifiant unique)</li>
            <li>Prénom et nom (optionnels à l'inscription)</li>
            <li>Mot de passe chiffré (voir §3) – uniquement pour les inscriptions par e-mail</li>
            <li>Fournisseur d'authentification (e-mail, Google, Facebook ou LinkedIn)</li>
            <li>Date de création et de dernière modification du compte</li>
          </ul>

          <SubTitle>Données d'apprentissage</SubTitle>
          <ul>
            <li>Listes et cartes mémo créées ou importées</li>
            <li>Historique de révision : réponses, scores, horodatages</li>
            <li>Position et organisation des listes</li>
          </ul>

          <SubTitle>Données analytiques anonymes</SubTitle>
          <p>
            Nous enregistrons des événements de navigation (pages visitées, étapes
            d'inscription, connexions réussies / échouées) liés à un identifiant de
            session aléatoire généré côté client. <strong>Aucune adresse IP n'est
            collectée ni stockée.</strong> Ces données servent uniquement à améliorer
            l'application.
          </p>

          <SubTitle>Données non collectées</SubTitle>
          <ul>
            <li>Adresse IP</li>
            <li>Géolocalisation</li>
            <li>Cookies publicitaires ou de pistage tiers</li>
          </ul>
        </Section>

        {/* 2 – Finalités */}
        <Section title="2. Pourquoi nous utilisons ces données">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Th>Finalité</Th>
                <Th>Base légale</Th>
              </tr>
            </thead>
            <tbody>
              <TableRow
                left="Création et gestion du compte"
                right="Exécution du contrat"
              />
              <TableRow
                left="Authentification et sécurité"
                right="Exécution du contrat"
              />
              <TableRow
                left="Synchronisation des données d'apprentissage"
                right="Exécution du contrat"
              />
              <TableRow
                left="Envoi d'e-mails transactionnels (vérification, réinitialisation)"
                right="Exécution du contrat"
              />
              <TableRow
                left="Analyse anonyme des parcours utilisateurs"
                right="Intérêt légitime"
              />
            </tbody>
          </table>
        </Section>

        {/* 3 – Sécurité & stockage */}
        <Section title="3. 🔒 Sécurité et stockage des données">
          <SubTitle>Base de données</SubTitle>
          <p>
            Toutes les données sont stockées dans une base PostgreSQL hébergée sur un
            serveur dédié avec accès réseau restreint (pas d'exposition publique des
            ports de base de données). Les connexions entre services sont chiffrées.
          </p>

          <SubTitle>Mots de passe</SubTitle>
          <p>
            Les mots de passe ne sont <strong>jamais stockés en clair</strong>. Ils sont
            hachés avec <strong>bcrypt (10 rounds)</strong> avant toute persistance. Même
            notre équipe ne peut pas lire votre mot de passe.
          </p>

          <SubTitle>Tokens d'authentification (JWT)</SubTitle>
          <p>
            Après connexion, un jeton JWT signé (expiration : 7 jours) est émis. Il est
            stocké dans le <code>localStorage</code> de votre navigateur et envoyé en
            en-tête HTTP chiffré via HTTPS. Un cookie de signal (<code>has_token=1</code>)
            aide le serveur à valider les redirections côté serveur ; il ne contient
            aucune donnée personnelle.
          </p>

          <SubTitle>Transport</SubTitle>
          <p>
            Toutes les communications entre votre navigateur et nos serveurs sont
            chiffrées via <strong>TLS (HTTPS)</strong> avec des certificats Let's Encrypt
            renouvelés automatiquement.
          </p>

          <SubTitle>Limitation des tentatives</SubTitle>
          <p>
            Les points d'accès sensibles (connexion, inscription, vérification) sont
            protégés par un système de <strong>rate limiting</strong> côté serveur pour
            prévenir les attaques par force brute.
          </p>
        </Section>

        {/* 4 – OAuth tokens */}
        <Section title="4. 🔑 Protection des tokens OAuth (Google, Facebook, LinkedIn)">
          <p>
            Lorsque vous vous connectez via Google, Facebook ou LinkedIn, voici ce qui
            se passe :
          </p>
          <ol>
            <li>
              Le fournisseur (Google, Facebook ou LinkedIn) émet un <strong>token
              d'accès temporaire</strong> directement dans votre navigateur.
            </li>
            <li>
              Ce token est transmis <strong>une seule fois</strong> à notre serveur via
              HTTPS pour vérification.
            </li>
            <li>
              Nous vérifions uniquement votre e-mail et votre nom auprès du fournisseur,
              puis nous <strong>supprimons immédiatement le token</strong> – il n'est
              jamais persisté en base de données.
            </li>
            <li>
              Un JWT Memoo est alors émis à la place pour gérer votre session.
            </li>
          </ol>
          <p style={{ marginTop: "0.75rem" }}>
            Nous n'accédons à <strong>aucune autre donnée</strong> de votre compte social
            (amis, publications, photos, etc.).
          </p>

          <InfoBox>
            Memoo utilise Facebook Login uniquement pour récupérer votre e-mail et
            votre nom. Aucune donnée Facebook n'est publiée, partagée ou stockée
            au-delà de la connexion initiale.
          </InfoBox>
        </Section>

        {/* 5 – Services tiers */}
        <Section title="5. Services tiers">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Th>Service</Th>
                <Th>Usage</Th>
                <Th>Données transmises</Th>
              </tr>
            </thead>
            <tbody>
              <TableRow3
                a="Google OAuth"
                b="Connexion sociale"
                c="E-mail, prénom, nom"
              />
              <TableRow3
                a="Facebook Login"
                b="Connexion sociale"
                c="E-mail, prénom, nom"
              />
              <TableRow3
                a="LinkedIn OIDC"
                b="Connexion sociale"
                c="E-mail, prénom, nom"
              />
              <TableRow3
                a="Brevo (Sendinblue)"
                b="E-mails transactionnels"
                c="Adresse e-mail"
              />
              <TableRow3
                a="OpenAI"
                b="Synthèse vocale (TTS) des cartes"
                c="Texte des cartes mémo"
              />
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
            Ces prestataires traitent les données conformément à leurs propres politiques
            de confidentialité. Memoo ne vend aucune donnée à des tiers.
          </p>
        </Section>

        {/* 6 – Durée de conservation */}
        <Section title="6. 📅 Durée de conservation des données">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Th>Données</Th>
                <Th>Durée</Th>
              </tr>
            </thead>
            <tbody>
              <TableRow
                left="Compte actif (données profil + apprentissage)"
                right="Durée de vie du compte"
              />
              <TableRow
                left="Compte non vérifié (sans confirmation e-mail)"
                right="21 jours, puis suppression automatique"
              />
              <TableRow
                left="Codes de vérification / réinitialisation"
                right="15 minutes, puis expiration automatique"
              />
              <TableRow
                left="Tokens OAuth tiers"
                right="Non conservés (supprimés après vérification)"
              />
              <TableRow
                left="Journaux d'événements anonymes"
                right="12 mois glissants"
              />
              <TableRow
                left="Données après suppression du compte"
                right="Suppression immédiate (sous 30 jours)"
              />
            </tbody>
          </table>
        </Section>

        {/* 7 – Vos droits */}
        <Section title="7. Vos droits (RGPD)">
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul>
            <li><strong>Accès</strong> – obtenir une copie de vos données personnelles</li>
            <li><strong>Rectification</strong> – corriger des informations inexactes</li>
            <li><strong>Effacement</strong> – demander la suppression de votre compte et de toutes vos données</li>
            <li><strong>Portabilité</strong> – recevoir vos données dans un format structuré</li>
            <li><strong>Opposition</strong> – vous opposer à certains traitements fondés sur l'intérêt légitime</li>
            <li><strong>Limitation</strong> – restreindre un traitement spécifique</li>
          </ul>
          <p style={{ marginTop: "0.75rem" }}>
            Pour exercer ces droits, contactez-nous à{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-success)" }}>
              {CONTACT_EMAIL}
            </a>
            . Nous répondrons dans un délai maximum de <strong>30 jours</strong>.
          </p>
          <p style={{ marginTop: "0.75rem" }}>
            Vous pouvez également introduire une réclamation auprès de la{" "}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-success)" }}
            >
              CNIL
            </a>{" "}
            (Commission Nationale de l'Informatique et des Libertés).
          </p>
        </Section>

        {/* 8 – Suppression du compte */}
        <Section title="8. 🗑️ Supprimer votre compte et vos données">
          <p>
            Vous pouvez demander la suppression complète de votre compte à tout moment :
          </p>
          <ol>
            <li>
              Envoyez un e-mail à{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-success)" }}>
                {CONTACT_EMAIL}
              </a>{" "}
              avec l'objet <strong>« Suppression de compte »</strong> depuis l'adresse
              associée à votre compte Memoo.
            </li>
            <li>
              Nous traiterons votre demande sous <strong>72 heures ouvrées</strong> et
              vous enverrons une confirmation.
            </li>
          </ol>
          <p style={{ marginTop: "0.75rem" }}>
            La suppression entraîne l'effacement définitif de : votre profil, toutes vos
            listes et cartes, votre historique de révision et tout identifiant vous
            concernant dans nos journaux. Les données anonymes (sans lien avec votre
            identité) peuvent être conservées à des fins statistiques.
          </p>
          <InfoBox>
            Si vous avez utilisé Facebook Login, vous pouvez également demander la
            suppression via le{" "}
            <a
              href="https://www.facebook.com/settings?tab=applications"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-success)" }}
            >
              gestionnaire d'applications Facebook
            </a>
            . Cela révoquera l'accès à votre compte Facebook, mais ne supprimera pas
            vos données Memoo – pour cela, contactez-nous directement.
          </InfoBox>
        </Section>

        {/* 9 – Contact */}
        <Section title="9. 📩 Contact">
          <p>Pour toute question relative à cette politique ou à vos données :</p>
          <div
            style={{
              background: "var(--color-bg-secondary)",
              border: "1px solid var(--color-border)",
              borderRadius: 10,
              padding: "1rem 1.25rem",
              marginTop: "0.75rem",
            }}
          >
            <p style={{ margin: 0 }}>
              <strong>Memoo</strong>
              <br />
              E-mail :{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "var(--color-success)" }}>
                {CONTACT_EMAIL}
              </a>
              <br />
              Site :{" "}
              <a
                href="https://memoo.fr"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--color-success)" }}
              >
                memoo.fr
              </a>
            </p>
          </div>
        </Section>

        {/* 10 – Modifications */}
        <Section title="10. Modifications de cette politique">
          <p>
            Nous pouvons mettre à jour cette politique à tout moment. En cas de
            changement significatif, nous vous informerons par e-mail ou via une
            notification dans l'application. La date de dernière mise à jour est
            indiquée en haut de cette page.
          </p>
        </Section>

        {/* Back link */}
        <div style={{ marginTop: "3rem", textAlign: "center" }}>
          <Link
            href="/"
            style={{
              color: "var(--color-text-muted)",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            ← Retour à Memoo
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Sub-components (co-located, file-scoped)
───────────────────────────────────────── */

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.25rem" }}>
      {title && (
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.875rem",
            paddingBottom: "0.5rem",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {title}
        </h2>
      )}
      <div style={{ lineHeight: 1.7, color: "var(--color-text-secondary)" }}>
        {children}
      </div>
    </section>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 600, color: "var(--color-text)", marginTop: "1rem", marginBottom: "0.25rem" }}>
      {children}
    </p>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--color-success-light)",
        border: "1px solid var(--color-success-border)",
        borderRadius: 8,
        padding: "0.75rem 1rem",
        marginTop: "1rem",
        fontSize: "0.9rem",
        color: "var(--color-text)",
      }}
    >
      {children}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "0.5rem 0.75rem",
        fontWeight: 600,
        fontSize: "0.85rem",
        color: "var(--color-text-muted)",
      }}
    >
      {children}
    </th>
  );
}

function TableRow({ left, right }: { left: string; right: string }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
      <Td>{left}</Td>
      <Td>{right}</Td>
    </tr>
  );
}

function TableRow3({ a, b, c }: { a: string; b: string; c: string }) {
  return (
    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
      <Td><strong>{a}</strong></Td>
      <Td>{b}</Td>
      <Td>{c}</Td>
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "0.5rem 0.75rem",
        verticalAlign: "top",
        color: "var(--color-text-secondary)",
      }}
    >
      {children}
    </td>
  );
}
