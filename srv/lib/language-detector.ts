/**
 * Language Detection Utility for CAP Applications
 * Handles language detection from various sources with fallback mechanisms
 */

export interface LanguageContext {
  detectedLanguage: string;
  fallbackChain: string[];
  source: 'header' | 'jwt' | 'default' | 'parameter';
  confidence: number;
}

export interface LanguageConfig {
  defaultLanguage: string;
  supportedLanguages: string[];
  fallbackLanguage: string;
}

export class LanguageDetector {
  private config: LanguageConfig;

  constructor(config: LanguageConfig) {
    this.config = {
      defaultLanguage: config.defaultLanguage || 'en',
      supportedLanguages: config.supportedLanguages || ['en'],
      fallbackLanguage: config.fallbackLanguage || 'en'
    };
  }

  /**
   * Detect language from Accept-Language header
   */
  private detectFromHeader(acceptLanguage: string): string | null {
    if (!acceptLanguage) return null;

    // Parse Accept-Language header (e.g., "en-US,en;q=0.9,de;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [language, quality = '1.0'] = lang.trim().split(';q=');
        return {
          language: language.split('-')[0].toLowerCase(), // Extract base language
          quality: parseFloat(quality)
        };
      })
      .sort((a, b) => b.quality - a.quality); // Sort by quality

    // Find the first supported language
    for (const { language } of languages) {
      if (this.config.supportedLanguages.includes(language)) {
        return language;
      }
    }

    return null;
  }

  /**
   * Extract language from JWT token
   */
  private extractFromJWT(token: any): string | null {
    if (!token || !token.locale) return null;

    const locale = token.locale.toLowerCase();
    const language = locale.split('_')[0]; // Extract language from locale (e.g., "en_US" -> "en")

    return this.config.supportedLanguages.includes(language) ? language : null;
  }

  /**
   * Create fallback chain for language detection
   */
  private createFallbackChain(preferredLanguage: string): string[] {
    const chain = [preferredLanguage];

    // Add fallback language if different from preferred
    if (preferredLanguage !== this.config.fallbackLanguage) {
      chain.push(this.config.fallbackLanguage);
    }

    // Add default language if not already in chain
    if (preferredLanguage !== this.config.defaultLanguage && 
        this.config.fallbackLanguage !== this.config.defaultLanguage) {
      chain.push(this.config.defaultLanguage);
    }

    return chain;
  }

  /**
   * Detect language from request context
   */
  detectLanguage(req: any): LanguageContext {
    let detectedLanguage = this.config.defaultLanguage;
    let source: LanguageContext['source'] = 'default';
    let confidence = 0.5;

    // Check for explicit language parameter (highest priority)
    // First check req.query, then parse URL if needed for CAP custom actions
    let paramLanguage = req.query?.$lang || req.query?.lang;
    
    // For CAP custom actions, query parameters might not be in req.query
    // Parse them from the URL directly
    if (!paramLanguage && req.url) {
      const url = new URL(req.url, 'http://localhost');
      paramLanguage = url.searchParams.get('$lang') || url.searchParams.get('lang');
    }
    
    if (paramLanguage && this.config.supportedLanguages.includes(paramLanguage.toLowerCase())) {
      detectedLanguage = paramLanguage.toLowerCase();
      source = 'parameter';
      confidence = 1.0;
    } else {
      // Try to extract from JWT token (second priority)
      if (req.user?.token?.locale) {
        const jwtLanguage = this.extractFromJWT(req.user.token);
        if (jwtLanguage) {
          detectedLanguage = jwtLanguage;
          source = 'jwt';
          confidence = 0.9;
        }
      }

      // Try to detect from Accept-Language header (third priority)
      if (req.headers?.['accept-language']) {
        const headerLanguage = this.detectFromHeader(req.headers['accept-language']);
        if (headerLanguage) {
          detectedLanguage = headerLanguage;
          source = 'header';
          confidence = 0.8;
        }
      }
    }

    const fallbackChain = this.createFallbackChain(detectedLanguage);

    return {
      detectedLanguage,
      fallbackChain,
      source,
      confidence
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [...this.config.supportedLanguages];
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return this.config.supportedLanguages.includes(language.toLowerCase());
  }

  /**
   * Get fallback language for a given language
   */
  getFallbackLanguage(language: string): string {
    if (language === this.config.fallbackLanguage) {
      return this.config.defaultLanguage;
    }
    return this.config.fallbackLanguage;
  }
}

// Default configuration based on package.json
export const defaultLanguageConfig: LanguageConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'de', 'es', 'fr', 'it', 'pt'],
  fallbackLanguage: 'en'
};

// Export singleton instance
export const languageDetector = new LanguageDetector(defaultLanguageConfig); 