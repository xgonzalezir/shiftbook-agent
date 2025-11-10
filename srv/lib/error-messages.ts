/**
 * Localized Error Messages for ShiftBook Service
 * 
 * Provides user-friendly error messages with localization support
 * and context-aware message selection.
 */

import { ErrorCategory } from './error-handler';

export interface LocalizedErrorMessages {
  [key: string]: {
    [language: string]: string;
  };
}

export interface ErrorMessageConfig {
  language: string;
  fallbackLanguage: string;
  enableTechnicalDetails: boolean;
  enableHelpLinks: boolean;
  enableProgressiveDisclosure: boolean;
  enableActionableMessages: boolean;
  enableContextualHelp: boolean;
  helpBaseUrl: string;
}

export class ErrorMessageManager {
  private static instance: ErrorMessageManager;
  private config: ErrorMessageConfig;
  private messages: LocalizedErrorMessages;

  private constructor() {
    this.config = {
      language: 'en',
      fallbackLanguage: 'en',
      enableTechnicalDetails: process.env.NODE_ENV !== 'production',
      enableHelpLinks: true,
      enableProgressiveDisclosure: true,
      enableActionableMessages: true,
      enableContextualHelp: true,
      helpBaseUrl: process.env.HELP_BASE_URL || '/help'
    };

    this.messages = this.initializeMessages();
  }

  static getInstance(): ErrorMessageManager {
    if (!ErrorMessageManager.instance) {
      ErrorMessageManager.instance = new ErrorMessageManager();
    }
    return ErrorMessageManager.instance;
  }

  static resetInstance(): void {
    ErrorMessageManager.instance = undefined;
  }

  /**
   * Get localized error message
   */
  getMessage(
    category: ErrorCategory,
    language: string = this.config.language,
    context?: {
      field?: string;
      operation?: string;
      entity?: string;
      technicalDetails?: string;
    }
  ): string {
    const messageKey = this.getMessageKey(category, context);
    const localizedMessage = this.getLocalizedMessage(messageKey, language);
    
    if (this.config.enableProgressiveDisclosure && context?.technicalDetails) {
      return this.addProgressiveDisclosure(localizedMessage, context.technicalDetails);
    }
    
    return localizedMessage;
  }

  /**
   * Get help message for error category
   */
  getHelpMessage(
    category: ErrorCategory,
    language: string = this.config.language
  ): string {
    const helpKey = `help_${category.toLowerCase()}`;
    return this.getLocalizedMessage(helpKey, language);
  }

  /**
   * Get action message (what user should do)
   */
  getActionMessage(
    category: ErrorCategory,
    language: string = this.config.language
  ): string {
    const actionKey = `action_${category.toLowerCase()}`;
    return this.getLocalizedMessage(actionKey, language);
  }

  /**
   * Get comprehensive error information with user-friendly format
   */
  getComprehensiveErrorInfo(
    category: ErrorCategory,
    language: string = this.config.language,
    context?: {
      field?: string;
      operation?: string;
      entity?: string;
      technicalDetails?: string;
      errorCode?: string;
    }
  ): {
    userMessage: string;
    helpMessage: string;
    actionMessage: string;
    helpUrl: string;
    technicalDetails?: string;
    errorCode?: string;
  } {
    const userMessage = this.getMessage(category, language, context);
    const helpMessage = this.getHelpMessage(category, language);
    const actionMessage = this.getActionMessage(category, language);
    const helpUrl = this.getHelpUrl(category, context);
    
    return {
      userMessage,
      helpMessage,
      actionMessage,
      helpUrl,
      technicalDetails: context?.technicalDetails,
      errorCode: context?.errorCode
    };
  }

  /**
   * Get help URL for error category
   */
  getHelpUrl(
    category: ErrorCategory,
    context?: {
      field?: string;
      operation?: string;
      entity?: string;
    }
  ): string {
    if (!this.config.enableHelpLinks) {
      return '';
    }

    const baseUrl = this.config.helpBaseUrl;
    const categoryPath = category.toLowerCase().replace('_', '-');
    
    let helpUrl = `${baseUrl}/${categoryPath}`;
    
    if (context?.field) {
      helpUrl += `?field=${context.field}`;
    }
    
    if (context?.operation) {
      helpUrl += `${context.field ? '&' : '?'}operation=${context.operation}`;
    }
    
    return helpUrl;
  }

  /**
   * Format error message with enhanced user experience
   */
  formatEnhancedErrorMessage(
    category: ErrorCategory,
    language: string = this.config.language,
    context?: {
      field?: string;
      operation?: string;
      entity?: string;
      technicalDetails?: string;
      errorCode?: string;
    }
  ): string {
    const errorInfo = this.getComprehensiveErrorInfo(category, language, context);
    
    let formattedMessage = errorInfo.userMessage;
    
    if (this.config.enableActionableMessages && errorInfo.actionMessage) {
      formattedMessage += `\n\n${errorInfo.actionMessage}`;
    }
    
    if (this.config.enableContextualHelp && errorInfo.helpMessage) {
      formattedMessage += `\n\n${errorInfo.helpMessage}`;
    }
    
    if (this.config.enableHelpLinks && errorInfo.helpUrl) {
      formattedMessage += `\n\nFor more help, visit: ${errorInfo.helpUrl}`;
    }
    
    if (this.config.enableProgressiveDisclosure && errorInfo.technicalDetails) {
      formattedMessage += `\n\nTechnical Details: ${errorInfo.technicalDetails}`;
    }
    
    return formattedMessage;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorMessageConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ErrorMessageConfig {
    return { ...this.config };
  }

  /**
   * Initialize localized messages
   */
  private initializeMessages(): LocalizedErrorMessages {
    return {
      // Validation Errors
      validation_error: {
        en: 'Please check your input and try again.',
        de: 'Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.',
        es: 'Por favor, revise su entrada e inténtelo de nuevo.'
      },
      validation_field_required: {
        en: 'The field "{field}" is required.',
        de: 'Das Feld "{field}" ist erforderlich.',
        es: 'El campo "{field}" es obligatorio.'
      },
      validation_field_invalid: {
        en: 'The field "{field}" contains invalid data.',
        de: 'Das Feld "{field}" enthält ungültige Daten.',
        es: 'El campo "{field}" contiene datos inválidos.'
      },

      // Authentication Errors
      authentication_error: {
        en: 'Please log in again to continue.',
        de: 'Bitte melden Sie sich erneut an, um fortzufahren.',
        es: 'Por favor, inicie sesión nuevamente para continuar.'
      },
      authentication_token_expired: {
        en: 'Your session has expired. Please log in again.',
        de: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
        es: 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.'
      },
      authentication_invalid_credentials: {
        en: 'Invalid username or password.',
        de: 'Ungültiger Benutzername oder Passwort.',
        es: 'Nombre de usuario o contraseña inválidos.'
      },

      // Authorization Errors
      authorization_error: {
        en: 'You don\'t have permission to perform this action.',
        de: 'Sie haben keine Berechtigung, diese Aktion auszuführen.',
        es: 'No tiene permisos para realizar esta acción.'
      },
      authorization_insufficient_privileges: {
        en: 'You need additional privileges to access this resource.',
        de: 'Sie benötigen zusätzliche Berechtigungen, um auf diese Ressource zuzugreifen.',
        es: 'Necesita privilegios adicionales para acceder a este recurso.'
      },

      // Business Logic Errors
      business_logic_error: {
        en: 'This operation cannot be completed at this time.',
        de: 'Diese Operation kann derzeit nicht abgeschlossen werden.',
        es: 'Esta operación no se puede completar en este momento.'
      },
      business_logic_constraint_violation: {
        en: 'This operation violates a business rule.',
        de: 'Diese Operation verstößt gegen eine Geschäftsregel.',
        es: 'Esta operación viola una regla de negocio.'
      },

      // External Service Errors
      external_service_error: {
        en: 'Service temporarily unavailable. Please try again later.',
        de: 'Dienst vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
        es: 'Servicio temporalmente no disponible. Por favor, inténtelo más tarde.'
      },
      external_service_timeout: {
        en: 'The external service is taking too long to respond.',
        de: 'Der externe Dienst braucht zu lange, um zu antworten.',
        es: 'El servicio externo está tardando demasiado en responder.'
      },

      // Database Errors
      database_error: {
        en: 'Data service is temporarily unavailable.',
        de: 'Datendienst ist vorübergehend nicht verfügbar.',
        es: 'El servicio de datos no está disponible temporalmente.'
      },
      database_connection_failed: {
        en: 'Unable to connect to the database.',
        de: 'Verbindung zur Datenbank nicht möglich.',
        es: 'No se puede conectar a la base de datos.'
      },

      // System Errors
      system_error: {
        en: 'An unexpected error occurred. Please try again later.',
        de: 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        es: 'Ocurrió un error inesperado. Por favor, inténtelo más tarde.'
      },
      system_maintenance: {
        en: 'System is under maintenance. Please try again later.',
        de: 'System wird gewartet. Bitte versuchen Sie es später erneut.',
        es: 'El sistema está en mantenimiento. Por favor, inténtelo más tarde.'
      },

      // Network Errors
      network_error: {
        en: 'Network connection issue. Please check your connection.',
        de: 'Netzwerkverbindungsproblem. Bitte überprüfen Sie Ihre Verbindung.',
        es: 'Problema de conexión de red. Por favor, verifique su conexión.'
      },
      network_timeout: {
        en: 'Network request timed out.',
        de: 'Netzwerkanfrage hat das Zeitlimit überschritten.',
        es: 'La solicitud de red ha agotado el tiempo de espera.'
      },

      // Timeout Errors
      timeout_error: {
        en: 'Request timed out. Please try again.',
        de: 'Anfrage hat das Zeitlimit überschritten. Bitte versuchen Sie es erneut.',
        es: 'La solicitud ha agotado el tiempo de espera. Por favor, inténtelo de nuevo.'
      },

      // Rate Limit Errors
      rate_limit_error: {
        en: 'Too many requests. Please wait a moment and try again.',
        de: 'Zu viele Anfragen. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
        es: 'Demasiadas solicitudes. Por favor, espere un momento e inténtelo de nuevo.'
      },

      // Email Service Errors
      email_service_error: {
        en: 'Email service is temporarily unavailable. Your message will be queued for delivery.',
        de: 'E-Mail-Dienst ist vorübergehend nicht verfügbar. Ihre Nachricht wird für die Zustellung in die Warteschlange gestellt.',
        es: 'El servicio de correo electrónico no está disponible temporalmente. Su mensaje será encolado para entrega.'
      },
      email_validation_error: {
        en: 'Please check the email address format and try again.',
        de: 'Bitte überprüfen Sie das E-Mail-Adressformat und versuchen Sie es erneut.',
        es: 'Por favor, verifique el formato de la dirección de correo electrónico e inténtelo de nuevo.'
      },

      // ShiftBook Specific Errors
      shiftbook_category_exists: {
        en: 'A category with this name already exists for this plant.',
        de: 'Eine Kategorie mit diesem Namen existiert bereits für dieses Werk.',
        es: 'Una categoría con este nombre ya existe para esta planta.'
      },
      shiftbook_email_exists: {
        en: 'This email address is already registered for this category.',
        de: 'Diese E-Mail-Adresse ist bereits für diese Kategorie registriert.',
        es: 'Esta dirección de correo electrónico ya está registrada para esta categoría.'
      },
      shiftbook_translation_exists: {
        en: 'A translation already exists for this category and language.',
        de: 'Eine Übersetzung existiert bereits für diese Kategorie und Sprache.',
        es: 'Una traducción ya existe para esta categoría e idioma.'
      },
      shiftbook_no_recipients: {
        en: 'No email recipients found for this category. Please add recipients first.',
        de: 'Keine E-Mail-Empfänger für diese Kategorie gefunden. Bitte fügen Sie zuerst Empfänger hinzu.',
        es: 'No se encontraron destinatarios de correo electrónico para esta categoría. Por favor, agregue destinatarios primero.'
      },

      // Help Messages
      help_validation: {
        en: 'Check that all required fields are filled and data is in the correct format.',
        de: 'Überprüfen Sie, dass alle erforderlichen Felder ausgefüllt sind und die Daten im richtigen Format vorliegen.',
        es: 'Verifique que todos los campos obligatorios estén completados y los datos estén en el formato correcto.'
      },
      help_authentication: {
        en: 'Try logging out and logging back in, or contact support if the problem persists.',
        de: 'Versuchen Sie, sich abzumelden und wieder anzumelden, oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.',
        es: 'Intente cerrar sesión y volver a iniciar sesión, o contacte al soporte si el problema persiste.'
      },
      help_authorization: {
        en: 'Contact your administrator to request the necessary permissions.',
        de: 'Kontaktieren Sie Ihren Administrator, um die erforderlichen Berechtigungen anzufordern.',
        es: 'Contacte a su administrador para solicitar los permisos necesarios.'
      },
      help_external_service: {
        en: 'This is a temporary issue with an external service. Please try again in a few minutes.',
        de: 'Dies ist ein vorübergehendes Problem mit einem externen Dienst. Bitte versuchen Sie es in einigen Minuten erneut.',
        es: 'Este es un problema temporal con un servicio externo. Por favor, inténtelo en unos minutos.'
      },
      help_database: {
        en: 'The database service is experiencing issues. Please try again later.',
        de: 'Der Datenbankdienst hat Probleme. Bitte versuchen Sie es später erneut.',
        es: 'El servicio de base de datos está experimentando problemas. Por favor, inténtelo más tarde.'
      },
      help_system: {
        en: 'A system error has occurred. Please try again later or contact support.',
        de: 'Ein Systemfehler ist aufgetreten. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.',
        es: 'Ha ocurrido un error del sistema. Por favor, inténtelo más tarde o contacte al soporte.'
      },
      help_email_service: {
        en: 'The email service is experiencing temporary issues. Your messages will be delivered when the service recovers.',
        de: 'Der E-Mail-Dienst hat vorübergehende Probleme. Ihre Nachrichten werden zugestellt, wenn der Dienst wiederhergestellt ist.',
        es: 'El servicio de correo electrónico está experimentando problemas temporales. Sus mensajes serán entregados cuando el servicio se recupere.'
      },
      help_shiftbook_category: {
        en: 'Category names must be unique within each plant. Try using a different name or check if the category already exists.',
        de: 'Kategorienamen müssen innerhalb jedes Werks eindeutig sein. Versuchen Sie einen anderen Namen zu verwenden oder prüfen Sie, ob die Kategorie bereits existiert.',
        es: 'Los nombres de categoría deben ser únicos dentro de cada planta. Intente usar un nombre diferente o verifique si la categoría ya existe.'
      },
      help_shiftbook_email: {
        en: 'Email addresses must be unique within each category. Check if this email is already registered.',
        de: 'E-Mail-Adressen müssen innerhalb jeder Kategorie eindeutig sein. Prüfen Sie, ob diese E-Mail bereits registriert ist.',
        es: 'Las direcciones de correo electrónico deben ser únicas dentro de cada categoría. Verifique si este correo electrónico ya está registrado.'
      },

      // Action Messages
      action_validation: {
        en: 'Review the highlighted fields and correct any errors.',
        de: 'Überprüfen Sie die hervorgehobenen Felder und korrigieren Sie alle Fehler.',
        es: 'Revise los campos resaltados y corrija cualquier error.'
      },
      action_authentication: {
        en: 'Click "Log In" to authenticate again.',
        de: 'Klicken Sie auf "Anmelden", um sich erneut zu authentifizieren.',
        es: 'Haga clic en "Iniciar sesión" para autenticarse nuevamente.'
      },
      action_authorization: {
        en: 'Contact your system administrator for access.',
        de: 'Kontaktieren Sie Ihren Systemadministrator für den Zugriff.',
        es: 'Contacte a su administrador del sistema para obtener acceso.'
      },
      action_external_service: {
        en: 'Wait a few minutes and try your request again.',
        de: 'Warten Sie einige Minuten und versuchen Sie Ihre Anfrage erneut.',
        es: 'Espere unos minutos e intente su solicitud nuevamente.'
      },
      action_database: {
        en: 'Try again in a few minutes, or contact support if the problem persists.',
        de: 'Versuchen Sie es in einigen Minuten erneut, oder kontaktieren Sie den Support, wenn das Problem weiterhin besteht.',
        es: 'Inténtelo en unos minutos, o contacte al soporte si el problema persiste.'
      },
      action_system: {
        en: 'Try again later or contact technical support.',
        de: 'Versuchen Sie es später erneut oder kontaktieren Sie den technischen Support.',
        es: 'Inténtelo más tarde o contacte al soporte técnico.'
      },
      action_rate_limit: {
        en: 'Wait a moment before making another request.',
        de: 'Warten Sie einen Moment, bevor Sie eine weitere Anfrage stellen.',
        es: 'Espere un momento antes de hacer otra solicitud.'
      },
      action_email_service: {
        en: 'Your message will be delivered automatically when the service recovers.',
        de: 'Ihre Nachricht wird automatisch zugestellt, wenn der Dienst wiederhergestellt ist.',
        es: 'Su mensaje será entregado automáticamente cuando el servicio se recupere.'
      },
      action_shiftbook_category: {
        en: 'Choose a different category name or check existing categories.',
        de: 'Wählen Sie einen anderen Kategorienamen oder prüfen Sie bestehende Kategorien.',
        es: 'Elija un nombre de categoría diferente o verifique las categorías existentes.'
      },
      action_shiftbook_email: {
        en: 'Use a different email address or check if it\'s already registered.',
        de: 'Verwenden Sie eine andere E-Mail-Adresse oder prüfen Sie, ob sie bereits registriert ist.',
        es: 'Use una dirección de correo electrónico diferente o verifique si ya está registrada.'
      }
    };
  }

  /**
   * Get message key based on category and context
   */
  private getMessageKey(category: ErrorCategory, context?: any): string {
    let baseKey = category.toLowerCase();
    
    // Handle ShiftBook-specific categories - they don't need _error suffix
    if (baseKey.startsWith('shiftbook_')) {
      return baseKey;
    }
    
    if (context?.field) {
      // Try field-specific key first, but have fallback logic
      const fieldSpecificKey = `${baseKey}_field_${context.field}`;
      if (this.messages[fieldSpecificKey]) {
        return fieldSpecificKey;
      }
      // Fallback to generic validation_error for field contexts
      return `${baseKey}_error`;
    } else if (context?.operation) {
      baseKey = `${baseKey}_${context.operation}`;
    } else {
      // For basic category lookups, add _error suffix
      baseKey = `${baseKey}_error`;
    }
    
    return baseKey;
  }

  /**
   * Get localized message with fallback
   */
  private getLocalizedMessage(key: string, language: string): string {
    const messageGroup = this.messages[key];
    
    if (!messageGroup) {
      // Fallback to generic error message
      return this.getLocalizedMessage('system_error', language);
    }
    
    // Try requested language
    if (messageGroup[language]) {
      return messageGroup[language];
    }
    
    // Try fallback language
    if (messageGroup[this.config.fallbackLanguage]) {
      return messageGroup[this.config.fallbackLanguage];
    }
    
    // Try English as ultimate fallback
    if (messageGroup['en']) {
      return messageGroup['en'];
    }
    
    // Last resort
    return 'An error occurred. Please try again.';
  }

  /**
   * Add progressive disclosure for technical details
   */
  private addProgressiveDisclosure(userMessage: string, technicalDetails: string): string {
    if (!this.config.enableTechnicalDetails) {
      return userMessage;
    }
    
    return `${userMessage}\n\nTechnical Details: ${technicalDetails}`;
  }

  /**
   * Format message with placeholders
   */
  formatMessage(message: string, placeholders: Record<string, string>): string {
    let formattedMessage = message;
    
    for (const [key, value] of Object.entries(placeholders)) {
      const placeholder = `{${key}}`;
      formattedMessage = formattedMessage.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return formattedMessage;
  }

  /**
   * Get all available languages
   */
  getAvailableLanguages(): string[] {
    const languages = new Set<string>();
    
    for (const messageGroup of Object.values(this.messages)) {
      for (const language of Object.keys(messageGroup)) {
        languages.add(language);
      }
    }
    
    return Array.from(languages);
  }

  /**
   * Add custom message
   */
  addCustomMessage(key: string, messages: Record<string, string>): void {
    this.messages[key] = { ...this.messages[key], ...messages };
  }

  /**
   * Remove custom message
   */
  removeCustomMessage(key: string): void {
    delete this.messages[key];
  }
}

// Export singleton instance
export const errorMessageManager = ErrorMessageManager.getInstance();

// CommonJS compatibility
module.exports = ErrorMessageManager;
module.exports.ErrorMessageManager = ErrorMessageManager;
module.exports.errorMessageManager = errorMessageManager; 