namespace syntax.gbi.sap.dme.plugins.shiftbook;

using {
  cuid,
  managed
} from '@sap/cds/common';

@singular: 'ShiftBookLog'
entity ShiftBookLog : cuid, managed {
  werks                  : String(4);
  shoporder              : String(30);
  stepid                 : String(4);
  split                  : String(3);
  workcenter             : String(36);
  user_id                : String(512);
  user_name              : String(512);
  log_dt                 : DateTime;
  category               : UUID;
  subject                : String(1024);
  message                : String(4096);
  isRead                 : Timestamp;

  categoryDetails        : Association to ShiftBookCategory
                             on  categoryDetails.ID    = category
                             and categoryDetails.werks = werks;

  destinationWorkcenters : Composition of many ShiftBookLogWC
                             on destinationWorkcenters.log_id = ID;
}

@singular: 'ShiftBookCategory'
entity ShiftBookCategory : cuid, managed {
  key werks                    : String(4);
      sendmail                 : Integer;
      sendworkcenters          : Integer;
      default_subject          : String(1024);
      default_message          : String(4096);
      triggerproductionprocess : Boolean default false;

      mails                    : Composition of many ShiftBookCategoryMail
                                   on  mails.category = ID
                                   and mails.werks    = werks;

      translations             : Composition of many ShiftBookCategoryLng
                                   on  translations.category = ID
                                   and translations.werks    = werks;

      workcenters              : Composition of many ShiftBookCategoryWC
                                   on workcenters.category_id = ID;

      teamsChannel             : Association to ShiftBookTeamsChannel
                                   on teamsChannel.category_id = ID;
}

// Teams channel configuration for notifications
@singular: 'ShiftBookTeamsChannel'
entity ShiftBookTeamsChannel : cuid, managed {
  key category_id : UUID;
      name        : String(100); // Display name for the Teams channel
      webhookURL  : String(2048); // Teams webhook URL for sending messages
      description : String(500); // Description of the channel purpose
      active      : Boolean default true; // Channel is active and can receive notifications
}

@singular: 'ShiftBookCategoryMail'
entity ShiftBookCategoryMail : managed {
  key category       : UUID;
  key werks          : String(4);
  key mail_address   : String(512);

      parentCategory : Association to ShiftBookCategory
                         on  parentCategory.ID    = category
                         and parentCategory.werks = werks;
}

@singular: 'ShiftBookCategoryLng'
entity ShiftBookCategoryLng : managed {
  key category       : UUID;
  key lng            : String(2);
  key werks          : String(4);
      desc           : String(512) @assert.unique: [
        'werks',
        'lng'
      ];

      parentCategory : Association to ShiftBookCategory
                         on  parentCategory.ID    = category
                         and parentCategory.werks = werks;
}

@singular: 'ShiftBookCategoryWC'
entity ShiftBookCategoryWC : managed {
  key category_id    : UUID;
  key workcenter     : String(36);

      parentCategory : Association to ShiftBookCategory
                         on parentCategory.ID = category_id;
}

@singular: 'ShiftBookLogWC'
entity ShiftBookLogWC : managed {
  key log_id     : UUID;
  key workcenter : String(36);
      isRead     : Timestamp;

      parentLog  : Association to ShiftBookLog
                     on parentLog.ID = log_id;
}

@singular: 'AuditLog'
entity AuditLog : cuid, managed {
  key ID            : UUID;
      timestamp     : Timestamp;
      action        : String(100);
      entity        : String(100);
      entityId      : String(512);
      userId        : String(512);
      userFullName  : String(512);
      ipAddress     : String(45);
      userAgent     : String(1024);
      sessionId     : String(512);
      correlationId : String(512);
      operation     : String(50);
      result        : String(20);
      errorMessage  : String(2048);
      details       : LargeString;
      previousState : LargeString;
      newState      : LargeString;
      severity      : String(20) default 'INFO';
      source        : String(100) default 'SHIFTBOOK_SERVICE';
}
