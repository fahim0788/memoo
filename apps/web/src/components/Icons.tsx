/**
 * Icônes SVG sobres noir/blanc
 * Utilisées pour remplacer les émojis
 */

type IconProps = { size?: number; className?: string; style?: React.CSSProperties };

export function IconPlus({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconSync({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36" />
    </svg>
  );
}

export function IconCheck({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconAlert({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function IconWifi({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.94 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

export function IconEdit({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export function IconTrash({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function IconEye({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconArrowBack({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

export function IconSettings({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6m-17.78 7.78l4.24-4.24m3.08-3.08l4.24-4.24" />
    </svg>
  );
}

export function IconFolderPublic({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 122.88 122.88"
      fill="var(--color-globe)"
      fillRule="evenodd"
      clipRule="evenodd"
      className={className}
      style={style}
    >
      {/* Globe with continents - color adapts to theme via CSS variable */}
      <path d="M61.439,0c33.928,0,61.44,27.513,61.44,61.439c0,33.929-27.513,61.44-61.44,61.44 C27.512,122.88,0,95.368,0,61.439C0,27.513,27.512,0,61.439,0L61.439,0z M78.314,6.495c20.618,6.853,36.088,24.997,39.068,47.101 l-1.953-0.209c-0.347,1.495-0.666,1.533-0.666,3.333c0,1.588,2,2.651,2,6.003c0,0.898-2.109,2.694-2.202,3.007l-3.132-3.674v4.669 l-0.476-0.018l-0.844-8.615l-1.749,0.551l-2.081-6.409l-6.855,7.155l-0.082,5.239l-2.238,1.501l-2.377-13.438l-1.422,1.039 l-3.22-4.345l-4.813,0.143l-1.844-2.107l-1.887,0.519l-3.712-4.254l-0.717,0.488l2.3,5.878h2.669v-1.334h1.333 c0.962,2.658,2.001,1.084,2.001,2.669c0,5.547-6.851,9.625-11.339,10.669c0.24,1.003,0.147,2.003,1.333,2.003 c2.513,0,1.264-0.44,4.003-0.667c-0.127,5.667-6.5,12.435-9.221,16.654l1.218,8.69c0.321,1.887-3.919,3.884-5.361,6.009 l0.692,3.329l-1.953,0.789c-0.342,3.42-3.662,7.214-7.386,7.214h-4c0-4.683-3.336-11.366-3.336-14.675 c0-2.81,1.333-3.188,1.333-6.669c0-3.216-3.333-7.828-3.333-8.67v-5.336h-2.669c-0.396-1.487-0.154-2-2-2h-0.667 c-2.914,0-2.422,1.333-5.336,1.333h-2.669c-2.406,0-6.669-7.721-6.669-8.671v-8.003c0-3.454,3.161-7.214,5.336-8.672v-3.333 l3.002-3.052l1.667-0.284c3.579,0,3.154-2,5.336-2H49.4v4.669L56,43.532l0.622-2.848c2.991,0.701,3.769,2.032,7.454,2.032h1.333 c2.531,0,2.667-3.358,2.667-6.002l-5.343,0.528l-2.324-5.064l-2.311,0.615c0.415,1.812,0.642,1.059,0.642,2.587 c0,0.9-0.741,1-1.335,1.334l-2.311-5.865l-4.969-3.549l-0.66,0.648l4.231,4.452c-0.562,1.597-0.628,6.209-2.961,2.979l2.182-1.05 l-5.438-5.699l-3.258,1.274l-3.216,3.08c-0.336,2.481-1.012,3.729-3.608,3.729c-1.728,0-0.685-0.447-3.336-0.667v-6.669h6.002 l-1.945-4.442l-0.721,0.44V24.04l9.747-4.494c-0.184-1.399-0.408-0.649-0.408-2.175c0-0.091,0.655-1.322,0.667-1.336l2.521,1.565 l-0.603-2.871l-3.889,0.8l-0.722-3.49c3.084-1.624,9.87-7.34,12.028-7.34h2.002c2.107,0,7.751,2.079,8.669,3.333L62.057,7.49 l3.971,3.271l0.381-1.395l2.964-0.812l0.036-1.855h1.336v2L78.314,6.495L78.314,6.495z M116.963,71.835 c-0.154,0.842-0.324,1.676-0.512,2.504l-0.307-2.152L116.963,71.835L116.963,71.835z M115.042,79.398 c-0.147,0.446-0.297,0.894-0.455,1.336h-0.49v-1.336H115.042L115.042,79.398z M11.758,93.18 c-3.624-5.493-6.331-11.641-7.916-18.226l10.821,5.218l0.055,3.229c0,1.186-2.025,3.71-2.667,4.669L11.758,93.18L11.758,93.18z" />
    </svg>
  );
}

export function IconUser({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function IconArrowUp({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}

export function IconArrowDown({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </svg>
  );
}

/**
 * Profil - User avatar
 */
export function IconProfile({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zm0 8a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm0 2c-3.313 0-10 1.657-10 5v3h20v-3c0-3.343-6.687-5-10-5z" />
    </svg>
  );
}

/**
 * Thème - Sun, Moon, Gear
 */
export function IconSun({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

export function IconMoon({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

export function IconGear({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconHelp({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
    </svg>
  );
}

export function IconSpeaker({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

export function IconSpeakerPlaying({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" />
    </svg>
  );
}

export function IconHome({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconCompass({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export function IconClose({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      style={style}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/**
 * Drapeaux pour le switch de langue
 */
export function IconFlagFR({ size = 18, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      style={style}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor" opacity="0.1" />
      <rect x="2" y="4" width="6.67" height="16" fill="#0055A4" />
      <rect x="8.67" y="4" width="6.67" height="16" fill="#FFFFFF" />
      <rect x="15.34" y="4" width="6.67" height="16" rx="0 2 2 0" fill="#EF4135" />
    </svg>
  );
}

/* ============================================================================
   Deck Icons - Colored SVG icons for user lists
============================================================================ */

type DeckIconDef = { name: string; label: string; path: string };

export const DECK_ICONS: DeckIconDef[] = [
  { name: "book", label: "Livre", path: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" },
  { name: "globe", label: "Globe", path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.5 0 4.5 4.5 4.5 10S14.5 22 12 22s-4.5-4.5-4.5-10S9.5 2 12 2zM2 12h20" },
  { name: "star", label: "Etoile", path: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { name: "music", label: "Musique", path: "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
  { name: "flask", label: "Science", path: "M9 3h6M10 3v5.172a2 2 0 0 1-.586 1.414L4 15v2a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-2l-5.414-5.414A2 2 0 0 1 14 8.172V3" },
  { name: "heart", label: "Coeur", path: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" },
  { name: "flag", label: "Drapeau", path: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" },
  { name: "lightning", label: "Eclair", path: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { name: "brain", label: "Cerveau", path: "M12 2a4 4 0 0 0-4 4v1a3 3 0 0 0-3 3v1a3 3 0 0 0 1 5.83V18a4 4 0 0 0 8 0v-.17A3 3 0 0 0 15 14a3 3 0 0 0 0-6 4 4 0 0 0-3-6z" },
  { name: "palette", label: "Art", path: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.38-.15-.74-.42-1.01-.26-.27-.42-.63-.42-1.01 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9-10-9zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" },
  { name: "camera", label: "Cinema", path: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { name: "trophy", label: "Sport", path: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 22V14.4a2 2 0 0 1 .6-1.4L12 12l1.4 1a2 2 0 0 1 .6 1.4V22M6 2h12v7a6 6 0 0 1-12 0V2z" },
];

export const DECK_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#10b981",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
  "#6b7280", "#78716c",
];

export function DeckIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const [name, color] = icon.split(":");
  const def = DECK_ICONS.find(d => d.name === name);
  if (!def) {
    // Fallback: star grise
    const fallback = DECK_ICONS.find(d => d.name === "star")!;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" style={{ flexShrink: 0 }}>
        <path d={fallback.path} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "#6b7280"} strokeWidth="2" style={{ flexShrink: 0 }}>
      <path d={def.path} />
    </svg>
  );
}

export function IconFlagUS({ size = 20, className = "", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 20"
      className={className}
      style={style}
    >
      {/* White background */}
      <rect width="30" height="20" fill="#FFF"/>

      {/* Red stripes */}
      <rect width="30" height="1.43" fill="#BB133E"/>
      <rect y="2.86" width="30" height="1.43" fill="#BB133E"/>
      <rect y="5.72" width="30" height="1.43" fill="#BB133E"/>
      <rect y="8.58" width="30" height="1.43" fill="#BB133E"/>
      <rect y="11.44" width="30" height="1.43" fill="#BB133E"/>
      <rect y="14.3" width="30" height="1.43" fill="#BB133E"/>
      <rect y="17.16" width="30" height="1.43" fill="#BB133E"/>

      {/* Blue canton */}
      <rect width="12" height="10" fill="#002664"/>

      {/* Stars grid pattern - 6 cols x 4 rows */}
      <circle cx="1.5" cy="1.25" r="0.35" fill="#FFF"/>
      <circle cx="3.5" cy="1.25" r="0.35" fill="#FFF"/>
      <circle cx="5.5" cy="1.25" r="0.35" fill="#FFF"/>
      <circle cx="7.5" cy="1.25" r="0.35" fill="#FFF"/>
      <circle cx="9.5" cy="1.25" r="0.35" fill="#FFF"/>
      <circle cx="11" cy="1.25" r="0.35" fill="#FFF"/>

      <circle cx="1.5" cy="3.33" r="0.35" fill="#FFF"/>
      <circle cx="3.5" cy="3.33" r="0.35" fill="#FFF"/>
      <circle cx="5.5" cy="3.33" r="0.35" fill="#FFF"/>
      <circle cx="7.5" cy="3.33" r="0.35" fill="#FFF"/>
      <circle cx="9.5" cy="3.33" r="0.35" fill="#FFF"/>
      <circle cx="11" cy="3.33" r="0.35" fill="#FFF"/>

      <circle cx="1.5" cy="5.42" r="0.35" fill="#FFF"/>
      <circle cx="3.5" cy="5.42" r="0.35" fill="#FFF"/>
      <circle cx="5.5" cy="5.42" r="0.35" fill="#FFF"/>
      <circle cx="7.5" cy="5.42" r="0.35" fill="#FFF"/>
      <circle cx="9.5" cy="5.42" r="0.35" fill="#FFF"/>
      <circle cx="11" cy="5.42" r="0.35" fill="#FFF"/>

      <circle cx="1.5" cy="7.5" r="0.35" fill="#FFF"/>
      <circle cx="3.5" cy="7.5" r="0.35" fill="#FFF"/>
      <circle cx="5.5" cy="7.5" r="0.35" fill="#FFF"/>
      <circle cx="7.5" cy="7.5" r="0.35" fill="#FFF"/>
      <circle cx="9.5" cy="7.5" r="0.35" fill="#FFF"/>
      <circle cx="11" cy="7.5" r="0.35" fill="#FFF"/>
    </svg>
  );
}
