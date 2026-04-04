/**
 * Configuration module for Social Ops Studio
 * All configuration values are loaded from environment or defaults
 * Following coding rule: Never hard-code API keys, tokens, or file paths; use config objects.
 */

// App environment configuration
export interface AppConfig {
  environment: 'dev' | 'staging' | 'production';
  apiBaseUrl: string;
  storageType: 'local' | 'indexeddb';
}

// Platform-specific OAuth configuration
export interface PlatformConfig {
  twitter: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  facebook: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  instagram: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  tiktok: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  youtube: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  linkedin: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
  pinterest: {
    clientId: string | undefined;
    clientSecret: string | undefined;
  };
}

// Theme configuration matching the style guide
export interface ThemeConfig {
  theme: 'dark' | 'light';
  accentColors: {
    cyan: string;
    pink: string;
    purple: string;
  };
  background: string;
  surface: string;
  borderRadius: number;
  glassmorphism: boolean;
  sidebarWidth: number;
}

export function loadAppConfig(): AppConfig {
  return {
    environment: (process.env.NEXT_PUBLIC_APP_ENV as AppConfig['environment']) || 'dev',
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
    storageType: 'local',
  };
}

export function loadPlatformConfig(): PlatformConfig {
  return {
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    },
    facebook: {
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    },
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET,
    },
    tiktok: {
      clientId: process.env.TIKTOK_CLIENT_ID,
      clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    },
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID,
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    },
    pinterest: {
      clientId: process.env.PINTEREST_CLIENT_ID,
      clientSecret: process.env.PINTEREST_CLIENT_SECRET,
    },
  };
}

export function loadThemeConfig(): ThemeConfig {
  return {
    theme: 'dark',
    accentColors: {
      cyan: '#00F5D4',
      pink: '#FF6F91',
      purple: '#5B5FFF',
    },
    background: '#050712',
    surface: '#0B1020',
    borderRadius: 16,
    glassmorphism: true,
    sidebarWidth: 260,
  };
}

// Export singleton instances
export const appConfig = loadAppConfig();
export const platformConfig = loadPlatformConfig();
export const themeConfig = loadThemeConfig();
