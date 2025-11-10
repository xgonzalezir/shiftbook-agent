/**
 * Email Templates for ShiftBook Application
 * Provides reusable email templates for different notification types with Handlebars integration
 */

import * as Handlebars from 'handlebars';

export interface TemplateData {
  [key: string]: any;
}

// Register Handlebars helpers for common operations
Handlebars.registerHelper('formatDate', function(date: Date, format?: string) {
  if (!date) return '';
  
  const dateObj = new Date(date);
  if (format === 'short') {
    return dateObj.toLocaleDateString();
  } else if (format === 'time') {
    return dateObj.toLocaleTimeString();
  } else {
    return dateObj.toLocaleString();
  }
});

Handlebars.registerHelper('uppercase', function(str: string) {
  return str ? str.toUpperCase() : '';
});

Handlebars.registerHelper('lowercase', function(str: string) {
  return str ? str.toLowerCase() : '';
});

Handlebars.registerHelper('nl2br', function(text: string) {
  return text ? text.replace(/\n/g, '<br>') : '';
});

Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
});

Handlebars.registerHelper('repeat', function(str: string, char: string) {
  return char.repeat(str.length);
});

export interface ShiftLogTemplateData {
  categoryName: string;
  subject: string;
  message: string;
  plant: string;
  workCenter: string;
  shopOrder: string;
  user: string;
  userFullName: string;
  timestamp: Date;
}

export class EmailTemplates {
  private static templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private static currentLanguage = 'en';

  /**
   * Set the current language for template rendering
   */
  static setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * Get the current language
   */
  static getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Clear the template cache (useful when changing language or updating templates)
   */
  static clearCache(): void {
    this.templates.clear();
    console.log('Email templates cache cleared');
  }

  /**
   * Compile and cache a Handlebars template
   */
  private static compileTemplate(templateString: string): HandlebarsTemplateDelegate {
    const cacheKey = `${templateString}_${this.currentLanguage}`;
    
    if (!this.templates.has(cacheKey)) {
      const template = Handlebars.compile(templateString);
      this.templates.set(cacheKey, template);
    }
    
    return this.templates.get(cacheKey)!;
  }

  /**
   * Get localized text for common elements
   */
  private static getLocalizedText(key: string): string {
    const translations: { [key: string]: { [key: string]: string } } = {
      en: {
        'shift_log_notification': 'Shift Log Notification',
        'new_entry_created': 'A new shift log entry has been created',
        'category': 'Category',
        'plant': 'Plant',
        'work_center': 'Work Center',
        'shop_order': 'Shop Order',
        'created_by': 'Created By',
        'timestamp': 'Timestamp',
        'view_details': 'Please log into the ShiftBook application to view more details or take action.',
        'automated_message': 'This is an automated message from the ShiftBook system. Please do not reply to this email.',
        'contact_admin': 'If you have questions, please contact your system administrator.'
      },
      de: {
        'shift_log_notification': 'Schichtbuch-Benachrichtigung',
        'new_entry_created': 'Ein neuer Schichtbuch-Eintrag wurde erstellt',
        'category': 'Kategorie',
        'plant': 'Werk',
        'work_center': 'Arbeitsplatz',
        'shop_order': 'Auftrag',
        'created_by': 'Erstellt von',
        'timestamp': 'Zeitstempel',
        'view_details': 'Bitte melden Sie sich in der ShiftBook-Anwendung an, um weitere Details zu sehen oder Maßnahmen zu ergreifen.',
        'automated_message': 'Dies ist eine automatische Nachricht vom ShiftBook-System. Bitte antworten Sie nicht auf diese E-Mail.',
        'contact_admin': 'Bei Fragen wenden Sie sich bitte an Ihren Systemadministrator.'
      }
    };

    return translations[this.currentLanguage]?.[key] || translations.en[key] || key;
  }

  /**
   * Template for shift log creation notifications
   */
  static getShiftLogCreatedTemplate(data: ShiftLogTemplateData): { html: string; text: string } {
    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>{{getLocalizedText "shift_log_notification"}}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #0070f2; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .details { margin: 25px 0; }
          .details table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
          .details th { text-align: left; padding: 12px; background-color: #f2f2f2; font-weight: bold; border-bottom: 1px solid #ddd; }
          .details td { padding: 12px; border-bottom: 1px solid #ddd; }
          .message { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #0070f2; margin: 20px 0; }
          .category-badge { display: inline-block; background-color: #0070f2; color: white; padding: 5px 10px; border-radius: 3px; font-size: 14px; }
          .subject { font-size: 18px; font-weight: bold; margin: 20px 0; color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>{{getLocalizedText "shift_log_notification"}}</h2>
            <p>{{getLocalizedText "new_entry_created"}}</p>
          </div>
          <div class="content">
            <p>{{getLocalizedText "new_entry_created"}} in the <span class="category-badge">{{categoryName}}</span> {{getLocalizedText "category"}}.</p>
            
            <div class="subject">{{subject}}</div>
            
            <div class="message">
              {{{nl2br message}}}
            </div>
            
            <div class="details">
              <table>
                <tr>
                  <th>{{getLocalizedText "plant"}}</th>
                  <td>{{plant}}</td>
                </tr>
                <tr>
                  <th>{{getLocalizedText "work_center"}}</th>
                  <td>{{workCenter}}</td>
                </tr>
                <tr>
                  <th>{{getLocalizedText "shop_order"}}</th>
                  <td>{{shopOrder}}</td>
                </tr>
                <tr>
                  <th>{{getLocalizedText "created_by"}}</th>
                  <td>{{userFullName}} ({{user}})</td>
                </tr>
                <tr>
                  <th>{{getLocalizedText "timestamp"}}</th>
                  <td>{{formatDate timestamp}}</td>
                </tr>
              </table>
            </div>
            
            <p>{{getLocalizedText "view_details"}}</p>
          </div>
          <div class="footer">
            <p>{{getLocalizedText "automated_message"}}</p>
            <p>{{getLocalizedText "contact_admin"}}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textTemplate = `
{{uppercase (getLocalizedText "shift_log_notification")}}
{{#repeat (uppercase (getLocalizedText "shift_log_notification")) "="}}

{{getLocalizedText "new_entry_created"}} in the {{categoryName}} {{getLocalizedText "category"}}.

SUBJECT: {{subject}}

MESSAGE:
{{message}}

DETAILS:
- {{getLocalizedText "plant"}}: {{plant}}
- {{getLocalizedText "work_center"}}: {{workCenter}}
- {{getLocalizedText "shop_order"}}: {{shopOrder}}
- {{getLocalizedText "created_by"}}: {{userFullName}} ({{user}})
- {{getLocalizedText "timestamp"}}: {{formatDate timestamp}}

{{getLocalizedText "view_details"}}

---
{{getLocalizedText "automated_message"}}
{{getLocalizedText "contact_admin"}}
    `;

    // Add helper functions to the data context
    const templateData = {
      ...data,
      getLocalizedText: (key: string) => this.getLocalizedText(key),
      formatDate: (date: Date) => {
        try {
          const dateObj = date instanceof Date ? date : new Date(date);
          if (isNaN(dateObj.getTime())) {
            return 'Invalid Date';
          }
          return new Intl.DateTimeFormat(this.currentLanguage === 'de' ? 'de-DE' : 'en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(dateObj);
        } catch (error) {
          return 'Invalid Date';
        }
      }
    };

    const htmlCompiled = this.compileTemplate(htmlTemplate);
    const textCompiled = this.compileTemplate(textTemplate);

    return {
      html: htmlCompiled(templateData),
      text: textCompiled(templateData)
    };
  }

  /**
   * Template for shift log update notifications
   */
  static getShiftLogUpdatedTemplate(data: ShiftLogTemplateData & { previousStatus?: string; newStatus?: string }): { html: string; text: string } {
    let formattedDate: string;
    try {
      const dateObj = data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp);
      if (isNaN(dateObj.getTime())) {
        formattedDate = 'Invalid Date';
      } else {
        formattedDate = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(dateObj);
      }
    } catch (error) {
      formattedDate = 'Invalid Date';
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Shift Log Update Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .details { margin: 25px 0; }
          .details table { width: 100%; border-collapse: collapse; border: 1px solid #ddd; }
          .details th { text-align: left; padding: 12px; background-color: #f2f2f2; font-weight: bold; border-bottom: 1px solid #ddd; }
          .details td { padding: 12px; border-bottom: 1px solid #ddd; }
          .message { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0; }
          .category-badge { display: inline-block; background-color: #28a745; color: white; padding: 5px 10px; border-radius: 3px; font-size: 14px; }
          .subject { font-size: 18px; font-weight: bold; margin: 20px 0; color: #333; }
          .status-change { background-color: #fff3cd; padding: 15px; border: 1px solid #ffeaa7; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Shift Log Update Notification</h2>
            <p>A shift log entry has been updated</p>
          </div>
          <div class="content">
            <p>A shift log entry in the <span class="category-badge">${data.categoryName}</span> category has been updated.</p>
            
            ${data.previousStatus && data.newStatus ? `
            <div class="status-change">
              <strong>Status Change:</strong> ${data.previousStatus} → ${data.newStatus}
            </div>
            ` : ''}
            
            <div class="subject">${data.subject}</div>
            
            <div class="message">
              ${data.message.replace(/\n/g, '<br>')}
            </div>
            
            <div class="details">
              <table>
                <tr>
                  <th>Plant</th>
                  <td>${data.plant}</td>
                </tr>
                <tr>
                  <th>Work Center</th>
                  <td>${data.workCenter}</td>
                </tr>
                <tr>
                  <th>Shop Order</th>
                  <td>${data.shopOrder}</td>
                </tr>
                <tr>
                  <th>Updated By</th>
                  <td>${data.userFullName} (${data.user})</td>
                </tr>
                <tr>
                  <th>Timestamp</th>
                  <td>${formattedDate}</td>
                </tr>
              </table>
            </div>
            
            <p>Please log into the ShiftBook application to view the updated details.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the ShiftBook system. Please do not reply to this email.</p>
            <p>If you have questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
SHIFT LOG UPDATE NOTIFICATION
============================

A shift log entry in the ${data.categoryName} category has been updated.

${data.previousStatus && data.newStatus ? `STATUS CHANGE: ${data.previousStatus} → ${data.newStatus}\n` : ''}
SUBJECT: ${data.subject}

MESSAGE:
${data.message}

DETAILS:
- Plant: ${data.plant}
- Work Center: ${data.workCenter}
- Shop Order: ${data.shopOrder}
- Updated By: ${data.userFullName} (${data.user})
- Timestamp: ${formattedDate}

Please log into the ShiftBook application to view the updated details.

---
This is an automated message from the ShiftBook system. Please do not reply to this email.
If you have questions, please contact your system administrator.
    `;

    return { html, text };
  }

  /**
   * Template for test emails
   */
  static getTestEmailTemplate(data: { recipient: string; testType?: string }): { html: string; text: string } {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ShiftBook Email Test</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: #6c757d; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .test-info { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>ShiftBook Email Test</h2>
            <p>Email notification service test</p>
          </div>
          <div class="content">
            <h3>Email Service Test Successful</h3>
            <p>This is a test email from the ShiftBook application.</p>
            <p>If you received this email, the email notification service is working correctly.</p>
            
            <div class="test-info">
              <strong>Test Information:</strong><br>
              Recipient: ${data.recipient}<br>
              Test Type: ${data.testType || 'General'}<br>
              Time: ${new Date().toISOString()}<br>
              Environment: ${process.env.NODE_ENV || 'development'}
            </div>
            
            <p>The email service is properly configured and ready to send notifications for shift log events.</p>
          </div>
          <div class="footer">
            <p>This is a test message from the ShiftBook system.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
SHIFTBOOK EMAIL TEST
===================

Email Service Test Successful

This is a test email from the ShiftBook application.

If you received this email, the email notification service is working correctly.

TEST INFORMATION:
- Recipient: ${data.recipient}
- Test Type: ${data.testType || 'General'}
- Time: ${new Date().toISOString()}
- Environment: ${process.env.NODE_ENV || 'development'}

The email service is properly configured and ready to send notifications for shift log events.

---
This is a test message from the ShiftBook system.
    `;

    return { html, text };
  }

  /**
   * Template for system alerts
   */
  static getSystemAlertTemplate(data: { 
    alertType: string; 
    message: string; 
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    details?: string;
  }): { html: string; text: string } {
    let formattedDate: string;
    try {
      const dateObj = data.timestamp instanceof Date ? data.timestamp : new Date(data.timestamp);
      if (isNaN(dateObj.getTime())) {
        formattedDate = 'Invalid Date';
      } else {
        formattedDate = new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(dateObj);
      }
    } catch (error) {
      formattedDate = 'Invalid Date';
    }

    const severityColors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>System Alert - ${data.alertType}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
          .header { background-color: ${severityColors[data.severity]}; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
          .alert-message { background-color: #f8f9fa; padding: 20px; border-left: 4px solid ${severityColors[data.severity]}; margin: 20px 0; }
          .severity-badge { display: inline-block; background-color: ${severityColors[data.severity]}; color: white; padding: 5px 10px; border-radius: 3px; font-size: 14px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>System Alert</h2>
            <p>${data.alertType}</p>
          </div>
          <div class="content">
            <p>A system alert has been triggered with <span class="severity-badge">${data.severity}</span> severity.</p>
            
            <div class="alert-message">
              <strong>Alert Message:</strong><br>
              ${data.message.replace(/\n/g, '<br>')}
            </div>
            
            ${data.details ? `
            <div class="alert-message">
              <strong>Additional Details:</strong><br>
              ${data.details.replace(/\n/g, '<br>')}
            </div>
            ` : ''}
            
            <p><strong>Timestamp:</strong> ${formattedDate}</p>
            
            <p>Please review the system logs and take appropriate action if necessary.</p>
          </div>
          <div class="footer">
            <p>This is an automated system alert from the ShiftBook application.</p>
            <p>If you have questions, please contact your system administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
SYSTEM ALERT
===========

Alert Type: ${data.alertType}
Severity: ${data.severity.toUpperCase()}

A system alert has been triggered with ${data.severity} severity.

ALERT MESSAGE:
${data.message}

${data.details ? `ADDITIONAL DETAILS:\n${data.details}\n` : ''}
Timestamp: ${formattedDate}

Please review the system logs and take appropriate action if necessary.

---
This is an automated system alert from the ShiftBook application.
If you have questions, please contact your system administrator.
    `;

    return { html, text };
  }
} 