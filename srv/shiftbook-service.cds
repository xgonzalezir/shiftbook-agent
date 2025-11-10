type ShiftBookCategoryResult {
  ID                       : UUID;
  werks                    : String(4);
  sendmail                 : Integer;
  sendworkcenters          : Integer;
  default_subject          : String(1024);
  default_message          : String(4096);
  triggerproductionprocess : Boolean;
  createdAt                : DateTime;
  createdBy                : String(512);
  modifiedAt               : DateTime;
  modifiedBy               : String(512);
  translations    : many {
    lng  : String(2);
    desc : String(1024);
  };
  mails           : many {
    email : String(255);
  };
  workcenters     : many {
    workcenter : String(36);
  };
  teamsChannel    : {
    name        : String(255);
    webhookURL  : String(2048);
    description : String(1024);
    active      : Boolean;
  };
}

type ShiftBookLogResult {
  ID         : UUID;
  werks      : String(4);
  shoporder  : String(30);
  stepid     : String(4);
  split      : String(3);
  workcenter : String(36);
  user_id    : String(512);
  log_dt     : DateTime;
  category   : UUID;
  subject    : String(1024);
  message    : String(4096);
  isRead     : Timestamp;
}

type ShiftBookLogInput {
  werks      : String(4);
  shoporder  : String(30);
  stepid     : String(4);
  split      : String(3);
  workcenter : String(36);
  user_id    : String(512);
  category   : UUID;
  subject    : String(1024);
  message    : String(4096);
}

type ShiftBookLogBatchResult {
  success : Boolean;
  count   : Integer;
  errors  : many String;
  logs    : many ShiftBookLogResult;
}

type ShiftBookLogPaginationResult {
  logs                : many ShiftBookLogResult;
  total               : Integer;
  page                : Integer;
  pageSize            : Integer;
  totalPages          : Integer;
  lastChangeTimestamp : Timestamp;
  readCount           : Integer;
  unreadCount         : Integer;
}

type ShiftBookLogSearchResult {
  logs  : many ShiftBookLogResult;
  count : Integer;
}

type LogWorkCenterInput {
  log_id     : UUID;
  workcenter : String(36);
}

type BatchMarkResult {
  success      : Boolean;
  totalCount   : Integer;
  successCount : Integer;
  failedCount  : Integer;
  errors       : many String;
}

using syntax.gbi.sap.dme.plugins.shiftbook as db from '../db/schema';


type CategoryMailInput {
  mail_address : String(512);
}

type CategoryLngInput {
  lng  : String(2);
  desc : String(512);
}

type CategoryWCInput {
  workcenter : String(36);
}

type TeamsChannelInput {
  name        : String(100);
  webhookURL  : String(2048);
  description : String(500);
  active      : Boolean;
}

type EmailResult {
  category   : UUID;
  recipients : String;
  status     : String;
}

type MailRecipientsResult {
  category   : UUID;
  werks      : String(4);
  recipients : String;
  count      : Integer;
}

type TestResult {
  status            : String;
  destination       : String;
  destinationStatus : String;
  found             : Boolean;
  url               : String;
  type              : String;
  logId             : String;
  category          : UUID;
  werks             : String(4);
  message           : String;
  error             : String;
  timestamp         : DateTime;
  debug             : {
    env_EMAIL_DESTINATION_NAME : String;
    vcap_services_available    : Boolean;
    timestamp                  : String;
  };
}

service ShiftBookService @(path: '/shiftbook/ShiftBookService')@(requires: 'authenticated-user') {
  @restrict: [{
    grant: ['*'],
    to   : 'admin'
  }, ]
  @cds.search.enabled
  entity ShiftBookCategory     as
    projection on db.ShiftBookCategory {
      *,
      mails,
      translations,
      workcenters,
      teamsChannel
    };

  @restrict: [
    {
      grant: 'READ',
      to   : 'operator'
    },
    {
      grant: ['*'],
      to   : 'admin'
    }
  ]
  @cds.search.enabled
  entity ShiftBookCategoryMail as projection on db.ShiftBookCategoryMail;

  @restrict: [
    {
      grant: 'READ',
      to   : 'operator'
    },
    {
      grant: ['*'],
      to   : 'admin'
    }
  ]
  @cds.search.enabled
  entity ShiftBookCategoryLng  as projection on db.ShiftBookCategoryLng;

  @restrict: [
    {
      grant: 'READ',
      to   : 'operator'
    },
    {
      grant: ['*'],
      to   : 'admin'
    }
  ]
  @cds.search.enabled
  entity ShiftBookCategoryWC   as projection on db.ShiftBookCategoryWC;

  @restrict: [
    {
      grant: 'READ',
      to   : 'operator'
    },
    {
      grant: ['*'],
      to   : 'admin'
    }
  ]
  @cds.search.enabled
  entity ShiftBookLogWC        as projection on db.ShiftBookLogWC;

  @restrict: [
    {
      grant: 'CREATE,READ',
      to   : 'operator'
    },
    {
      grant: ['*'],
      to   : 'admin'
    }
  ]
  @cds.search.enabled
  entity ShiftBookLog          as
    projection on db.ShiftBookLog {
      *,
      categoryDetails,
      destinationWorkcenters
    };

  @requires: 'admin'
  action updateCategoryWithDetails(category: UUID,
                                   werks: String(4),
                                   sendmail: Integer,
                                   sendworkcenters: Integer,
                                   default_subject: String(1024),
                                   default_message: String(4096),
                                   triggerproductionprocess: Boolean,
                                   translations: many CategoryLngInput,
                                   mails: many CategoryMailInput,
                                   workcenters: many CategoryWCInput,
                                   teamsChannel: TeamsChannelInput)                                         returns UUID;

  @requires: 'admin'
  action deleteCategoryCascade(category: UUID, werks: String(4))                                            returns UUID;

  @requires: [
    'operator',
    'admin'
  ]
  action advancedCategorySearch(query: String, language: String(2))                                         returns many ShiftBookCategoryResult;

  @requires: [
    'operator',
    'admin'
  ]
  action advancedLogSearch(query: String)                                                                   returns many ShiftBookLogResult;

  @requires: 'admin'
  action batchInsertMails(category: UUID, werks: String(4), mails: many CategoryMailInput)                  returns UUID;

  @requires: 'admin'
  action batchInsertTranslations(category: UUID, werks: String(4), translations: many CategoryLngInput)     returns UUID;

  @requires: 'admin'
  action batchInsertWorkcenters(category: UUID, workcenters: many CategoryWCInput)                          returns UUID;

  @requires: 'admin'
  action sendMailByCategory(category: UUID, werks: String(4), subject: String(1024), message: String(4096)) returns EmailResult;

  @requires: [
    'operator',
    'admin'
  ]
  action getMailRecipients(category: UUID, werks: String(4))                                                returns MailRecipientsResult;


  // Additional utility actions
  @requires: [
    'operator',
    'admin'
  ]
  action addShiftBookEntry(werks: String(4),
                           shoporder: String(30),
                           stepid: String(4),
                           split: String(3),
                           workcenter: String(36),
                           user_id: String(512),
                           category: UUID,
                           subject: String(1024),
                           message: String(4096))                                                           returns ShiftBookLogResult;


  // TEST ACTION - Check destination and create test log for email testing
  action testAction()                                                                                       returns TestResult;

  // Create category with details including Teams channel support
  @requires: ['admin']
  action createCategoryWithDetails(werks: String(4),
                                   sendmail: Integer,
                                   sendworkcenters: Integer,
                                   default_subject: String(1024),
                                   default_message: String(4096),
                                   triggerproductionprocess: Boolean,
                                   translations: many CategoryLngInput,
                                   mails: many CategoryMailInput,
                                   workcenters: many CategoryWCInput,
                                   teamsChannel: TeamsChannelInput)                                         returns ShiftBookCategoryResult;

  @requires: [
    'operator',
    'admin'
  ]
  action batchAddShiftBookEntries(logs: many ShiftBookLogInput)                                             returns ShiftBookLogBatchResult;

  @requires: [
    'operator',
    'admin'
  ]
  action getShiftBookLogsPaginated(werks: String(4),
                                   workcenter: String(36),
                                   category: UUID,
                                   page: Integer,
                                   pageSize: Integer,
                                   language: String(2),
                                   include_dest_work_center: Boolean,
                                   include_orig_work_center: Boolean,
                                   lasttimestamp: Timestamp)                                                returns ShiftBookLogPaginationResult;

  @requires: [
    'operator',
    'admin'
  ]
  action searchShiftBookLogsByString(werks: String(4),
                                     searchString: String(1024),
                                     workcenter: String(36),
                                     category: UUID,
                                     language: String(2),
                                     include_dest_work_center: Boolean,
                                     include_orig_work_center: Boolean)                                     returns ShiftBookLogSearchResult;

  @requires: [
    'operator',
    'admin'
  ]
  action getLatestShiftbookLog(werks: String(4), workcenter: String(36))                                    returns ShiftBookLogResult;

  @requires: [
    'operator',
    'admin'
  ]
  action getShiftbookCategories(werks: String(4), language: String(2))                                      returns many ShiftBookCategoryResult;

  @requires: [
    'operator',
    'admin'
  ]
  action markLogAsRead(log_id: UUID, workcenter: String(36))                                                returns Timestamp;

  @requires: [
    'operator',
    'admin'
  ]
  action markLogAsUnread(log_id: UUID, workcenter: String(36))                                              returns Boolean;

  @requires: [
    'operator',
    'admin'
  ]
  action batchMarkLogsAsRead(logs: many LogWorkCenterInput)                                                 returns BatchMarkResult;

  @requires: [
    'operator',
    'admin'
  ]
  action batchMarkLogsAsUnread(logs: many LogWorkCenterInput)                                               returns BatchMarkResult;

  @requires: [
    'operator',
    'admin'
  ]
  action getLastChangeTimestamp(werks: String(4),
                                workcenter: String(36),
                                category: UUID,
                                include_dest_work_center: Boolean,
                                include_orig_work_center: Boolean)                                          returns Timestamp;
}
