/**
 * Language Middleware for CAP Applications
 * Integrates with CAP's i18n system and provides language context
 */

import { languageDetector, LanguageContext } from './language-detector';

export interface LanguageRequest extends Request {
  languageContext?: LanguageContext;
  userLanguage?: string;
}

/**
 * Language middleware that detects and sets language context
 */
export const languageMiddleware = (req: any, res: any, next: any) => {
  try {
    // Detect language from request
    const languageContext = languageDetector.detectLanguage(req);
    
    // Attach language context to request
    req.languageContext = languageContext;
    req.userLanguage = languageContext.detectedLanguage;
    
    // Set language for CAP's i18n system
    if (req.userLanguage) {
      // Set the language for the current request context
      req.locale = req.userLanguage;
      
      // Log language detection for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log(`🌍 Language detected: ${languageContext.detectedLanguage} (${languageContext.source}, confidence: ${languageContext.confidence})`);
        console.log(`🔄 Fallback chain: ${languageContext.fallbackChain.join(' → ')}`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in language middleware:', error);
    // Continue with default language on error
    req.languageContext = {
      detectedLanguage: 'en',
      fallbackChain: ['en'],
      source: 'default',
      confidence: 0.0
    };
    req.userLanguage = 'en';
    req.locale = 'en';
    next();
  }
};

/**
 * Get current language context from request
 */
export const getLanguageContext = (req: any): LanguageContext => {
  return req.languageContext || {
    detectedLanguage: 'en',
    fallbackChain: ['en'],
    source: 'default',
    confidence: 0.0
  };
};

/**
 * Get user's preferred language
 */
export const getUserLanguage = (req: any): string => {
  return req.userLanguage || 'en';
};

/**
 * Check if a specific language is supported
 */
export const isLanguageSupported = (language: string): boolean => {
  return languageDetector.isLanguageSupported(language);
};

/**
 * Get list of supported languages
 */
export const getSupportedLanguages = (): string[] => {
  return languageDetector.getSupportedLanguages();
};

/**
 * Get localized message with fallback
 */
export const getLocalizedMessage = (req: any, key: string, ...args: any[]): string => {
  const context = getLanguageContext(req);
  
  // Try to get message in detected language
  for (const language of context.fallbackChain) {
    try {
      // Use CAP's i18n system to get localized message
      const message = req._.msg(key, ...args);
      if (message && message !== key) {
        return message;
      }
    } catch (error) {
      // Continue to next language in fallback chain
      continue;
    }
  }
  
  // Return key if no translation found
  return key;
};

/**
 * Validate language parameter
 */
export const validateLanguageParameter = (language: string): boolean => {
  return languageDetector.isLanguageSupported(language);
};

/**
 * Get language information for API responses
 */
export const getLanguageInfo = (req: any) => {
  const context = getLanguageContext(req);
  return {
    current: context.detectedLanguage,
    source: context.source,
    confidence: context.confidence,
    fallbackChain: context.fallbackChain,
    supported: getSupportedLanguages()
  };
}; 