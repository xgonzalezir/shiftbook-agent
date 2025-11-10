const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

// Ignore SSL certificate errors for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// XSUAA credentials from the environment
const XSUAA_CREDENTIALS = {
  clientid: "sb-shiftbook-srv-manu-dev-org-dev-v3!t459223",
  clientsecret:
    "b92f25eb-8d57-49e0-9776-63da97edbbb1$Vm4bwArc-VK2RPvi2eIYW6egQxC153r8oFayADyS8bU=",
  url: "https://gbi-manu-dev.authentication.us10.hana.ondemand.com",
};

const BASE_URL =
  "https://manu-dev-org-dev-shiftbook-srv.cfapps.us10-001.hana.ondemand.com";
const SERVICE_PATH = "/shiftbook/ShiftBookService";

// Test data for different operations
const TEST_DATA = {
  werks: "1000",
  language: "en",
  shoporder: "TEST123456",
  stepid: "0010",
  split: "001",
  workcenter: "WC_TEST_001",
  user_id: "test-user@example.com",
};

async function getAccessToken() {
  try {
    console.log("🔐 Getting access token from XSUAA...");

    const tokenUrl = `${XSUAA_CREDENTIALS.url}/oauth/token`;
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: XSUAA_CREDENTIALS.clientid,
      client_secret: XSUAA_CREDENTIALS.clientsecret,
    });

    const response = await axios.post(tokenUrl, params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const token = response.data.access_token;
    console.log("✅ Access token obtained successfully!");
    return token;
  } catch (error) {
    console.error(
      "❌ Error getting access token:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function makeRequest(method, url, data, token, description) {
  try {
    console.log(`\n📡 ${description}`);
    console.log(`   Method: ${method.toUpperCase()} | URL: ${url}`);

    const config = {
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "post" || method === "patch" || method === "put")) {
      config.data = data;
      console.log(`   Data: ${JSON.stringify(data, null, 2)}`);
    }

    const response = await axios(config);
    console.log(`✅ Success (${response.status})`);

    if (response.data) {
      console.log(`📄 Response:`, JSON.stringify(response.data, null, 2));
    }

    return response.data;
  } catch (error) {
    console.error(
      `❌ Failed: ${error.response?.status} ${error.response?.statusText}`
    );
    if (error.response?.data) {
      console.error(
        `📄 Error details:`,
        JSON.stringify(error.response.data, null, 2)
      );
    }
    return null;
  }
}

async function testEntityCRUD(token) {
  console.log("\n🔶 TESTING ENTITY CRUD OPERATIONS");
  console.log("=".repeat(50));

  // 1. READ - Get all categories
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory`,
    null,
    token,
    "GET ShiftBookCategory (Read All)"
  );

  // 2. READ - Get specific category by ID
  const categories = await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$top=1`,
    null,
    token,
    "GET First ShiftBookCategory (Read One)"
  );

  let categoryId = null;
  if (categories && categories.value && categories.value.length > 0) {
    categoryId = categories.value[0].ID;

    await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory(${categoryId})`,
      null,
      token,
      "GET ShiftBookCategory by ID"
    );
  }

  // 3. READ - Get all logs
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookLog`,
    null,
    token,
    "GET ShiftBookLog (Read All)"
  );

  // 4. CREATE - Add a new log entry (operator/admin can create)
  const newLogData = {
    werks: TEST_DATA.werks,
    shoporder: TEST_DATA.shoporder,
    stepid: TEST_DATA.stepid,
    split: TEST_DATA.split,
    workcenter: TEST_DATA.workcenter,
    user_id: TEST_DATA.user_id,
    category: categoryId,
    subject: "Test Log Entry",
    message: "This is a test log entry created by the CRUD testing script",
  };

  const createdLog = await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookLog`,
    newLogData,
    token,
    "CREATE ShiftBookLog Entry"
  );

  // 5. UPDATE - Update the created log entry (admin only)
  if (createdLog && createdLog.guid) {
    const updateData = {
      subject: "Updated Test Log Entry",
      message: "This log entry was updated by the CRUD testing script",
    };

    await makeRequest(
      "patch",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookLog(${createdLog.guid})`,
      updateData,
      token,
      "UPDATE ShiftBookLog Entry"
    );
  }

  // 6. READ - Category Mail and Translations
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategoryMail`,
    null,
    token,
    "GET ShiftBookCategoryMail"
  );

  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategoryLng`,
    null,
    token,
    "GET ShiftBookCategoryLng"
  );

  return { categoryId, createdLogId: createdLog?.guid };
}

async function testServiceActions(token, testIds) {
  console.log("\n🔷 TESTING SERVICE ACTIONS");
  console.log("=".repeat(50));

  const { categoryId } = testIds;

  // 1. getShiftbookCategories - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/getShiftbookCategories`,
    {
      werks: TEST_DATA.werks,
      language: TEST_DATA.language,
    },
    token,
    "ACTION getShiftbookCategories"
  );

  // 2. advancedCategorySearch - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/advancedCategorySearch`,
    {
      query: "Production",
      language: TEST_DATA.language,
    },
    token,
    "ACTION advancedCategorySearch"
  );

  // 3. advancedLogSearch - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/advancedLogSearch`,
    {
      query: "test",
    },
    token,
    "ACTION advancedLogSearch"
  );

  // 4. addShiftBookEntry - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/addShiftBookEntry`,
    {
      werks: TEST_DATA.werks,
      shoporder: "ACTION001",
      stepid: TEST_DATA.stepid,
      split: TEST_DATA.split,
      workcenter: TEST_DATA.workcenter,
      user_id: TEST_DATA.user_id,
      category: categoryId,
      subject: "Action Test Entry",
      message: "Created via addShiftBookEntry action",
    },
    token,
    "ACTION addShiftBookEntry"
  );

  // 5. batchAddShiftBookEntries - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/batchAddShiftBookEntries`,
    {
      logs: [
        {
          werks: TEST_DATA.werks,
          shoporder: "BATCH001",
          stepid: TEST_DATA.stepid,
          split: TEST_DATA.split,
          workcenter: TEST_DATA.workcenter,
          user_id: TEST_DATA.user_id,
          category: categoryId,
          subject: "Batch Entry 1",
          message: "First batch entry",
        },
        {
          werks: TEST_DATA.werks,
          shoporder: "BATCH002",
          stepid: TEST_DATA.stepid,
          split: TEST_DATA.split,
          workcenter: TEST_DATA.workcenter,
          user_id: TEST_DATA.user_id,
          category: categoryId,
          subject: "Batch Entry 2",
          message: "Second batch entry",
        },
      ],
    },
    token,
    "ACTION batchAddShiftBookEntries"
  );

  // 6. getShiftBookLogsPaginated - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/getShiftBookLogsPaginated`,
    {
      werks: TEST_DATA.werks,
      workcenter: TEST_DATA.workcenter,
      category: categoryId,
      page: 1,
      pageSize: 10,
      language: TEST_DATA.language,
    },
    token,
    "ACTION getShiftBookLogsPaginated"
  );

  // 7. getLatestShiftbookLog - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/getLatestShiftbookLog`,
    {
      werks: TEST_DATA.werks,
      workcenter: TEST_DATA.workcenter,
    },
    token,
    "ACTION getLatestShiftbookLog"
  );

  // 8. getMailRecipients - Operator/Admin
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/getMailRecipients`,
    {
      category: categoryId,
      werks: TEST_DATA.werks,
    },
    token,
    "ACTION getMailRecipients"
  );
}

async function testEmailFunctionality(token, testIds) {
  console.log("\n📧 TESTING EMAIL FUNCTIONALITY");
  console.log("=".repeat(50));

  const { categoryId } = testIds;

  // Test data for email functionality
  const emailTestData = {
    testCategory: {
      werks: TEST_DATA.werks,
      default_desc: "Email Test Category",
      sendmail: 1, // Enable email for this category
      translations: [
        {
          lng: "en",
          desc: "Email Test Category (English)",
        },
        {
          lng: "de",
          desc: "E-Mail-Testkategorie (Deutsch)",
        },
        {
          lng: "es",
          desc: "Categoría de Prueba de Email (Español)",
        },
      ],
      mails: [
        {
          mail_address: "xavier.gonzalez@syntax.com",
        },
        {
          mail_address: "test1@example.com",
        },
        {
          mail_address: "test2@example.com",
        },
      ],
    },
    testLogEntry: {
      werks: TEST_DATA.werks,
      shoporder: "TEST123456", // Use shorter, valid shoporder
      stepid: TEST_DATA.stepid,
      split: TEST_DATA.split,
      workcenter: TEST_DATA.workcenter,
      user_id: "email-test@example.com",
      subject: "Email Test Log Entry",
      message:
        "This log entry is created to test email functionality. It should trigger email notifications to configured recipients.",
    },
  };

  // 1. Create a test category with email configuration
  console.log("\n📝 Creating test category with email configuration...");
  const emailCategoryId = uuidv4();
  const createdCategory = await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/createCategoryWithDetails`,
    {
      ...emailTestData.testCategory,
      categoryId: emailCategoryId,
    },
    token,
    "CREATE Category with Email Configuration"
  );

  let testCategoryId = emailCategoryId;
  if (createdCategory && createdCategory.category) {
    testCategoryId = createdCategory.category;
  }

  // 2. Get mail recipients for the category
  console.log("\n📋 Getting mail recipients for test category...");
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/getMailRecipients`,
    {
      category: testCategoryId,
      werks: TEST_DATA.werks,
    },
    token,
    "GET Mail Recipients for Test Category"
  );

  // 3. Test CategoryMail entity directly
  console.log("\n📬 Testing CategoryMail entity operations...");
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategoryMail?$filter=category eq '${testCategoryId}'`,
    null,
    token,
    "GET CategoryMail entries for test category"
  );

  // 4. Add additional email addresses to the category
  console.log("\n➕ Adding additional email addresses to category...");
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/batchInsertMails`,
    {
      category: testCategoryId,
      werks: TEST_DATA.werks,
      mails: [
        { mail_address: "additional1@example.com" },
        { mail_address: "additional2@example.com" },
        { mail_address: "notification@example.com" },
      ],
    },
    token,
    "BATCH INSERT Additional Email Addresses"
  );

  // 5. Create a log entry that should trigger email
  console.log("\n📝 Creating log entry that should trigger email...");
  const emailLogEntry = await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/addShiftBookEntry`,
    {
      ...emailTestData.testLogEntry,
      category: testCategoryId,
    },
    token,
    "CREATE Log Entry with Email Trigger"
  );

  // 6. Test direct email sending via sendMailByCategory
  console.log("\n📤 Testing direct email sending...");
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/sendMailByCategory`,
    {
      category: testCategoryId,
      werks: TEST_DATA.werks,
      subject: "Test Email from CRUD Email Testing",
      message: `
This is a comprehensive email test sent from the CRUD testing script.

Test Details:
- Category ID: ${testCategoryId}
- Werks: ${TEST_DATA.werks}
- Timestamp: ${new Date().toISOString()}
- Test Type: Direct Email Sending

This email validates that:
✅ BTP destination is configured correctly
✅ Email service is working
✅ Category mail configuration is functional
✅ SMTP integration is operational

If you receive this email, the email functionality is working correctly!
      `,
    },
    token,
    "SEND Direct Test Email via sendMailByCategory"
  );

  // 7. Test batch log creation with email notifications
  console.log("\n📦 Testing batch log creation with email notifications...");
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/batchAddShiftBookEntries`,
    {
      logs: [
        {
          werks: TEST_DATA.werks,
          shoporder: "BATCH001", // Use shorter, valid shoporder
          stepid: TEST_DATA.stepid,
          split: TEST_DATA.split,
          workcenter: TEST_DATA.workcenter,
          user_id: "batch-email-test@example.com",
          category: testCategoryId,
          subject: "Batch Email Test 1",
          message: "First batch entry to test email notifications",
        },
        {
          werks: TEST_DATA.werks,
          shoporder: "BATCH002", // Use shorter, valid shoporder
          stepid: TEST_DATA.stepid,
          split: TEST_DATA.split,
          workcenter: TEST_DATA.workcenter,
          user_id: "batch-email-test@example.com",
          category: testCategoryId,
          subject: "Batch Email Test 2",
          message: "Second batch entry to test email notifications",
        },
      ],
    },
    token,
    "BATCH CREATE Log Entries with Email Notifications"
  );

  // 8. Verify email configuration
  console.log("\n🔍 Verifying email configuration...");
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory(${testCategoryId})`,
    null,
    token,
    "VERIFY Test Category Email Configuration"
  );

  console.log("\n✅ Email functionality testing completed!");
  console.log("📊 Email Test Summary:");
  console.log(`   - Test Category ID: ${testCategoryId}`);
  console.log(
    `   - Email Recipients: xavier.gonzalez@syntax.com, test1@example.com, test2@example.com`
  );
  console.log(
    `   - Additional Recipients: additional1@example.com, additional2@example.com, notification@example.com`
  );
  console.log(`   - Direct Emails Sent: 1 (main test email)`);
  console.log(`   - Log Entries Attempted: 3 (1 single + 2 batch)`);
  console.log(`   - Email Categories Created: 1`);

  return { emailCategoryId: testCategoryId, emailLogEntry: null };
}

async function testAdminOnlyActions(token, testIds) {
  console.log("\n🔴 TESTING ADMIN-ONLY ACTIONS");
  console.log("=".repeat(50));

  const { categoryId } = testIds;

  // 1. createCategoryWithDetails - Admin only
  const newCategoryId = uuidv4();
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/createCategoryWithDetails`,
    {
      werks: TEST_DATA.werks,
      default_desc: "Test Category Created via Script",
      sendmail: 0,
      translations: [
        {
          lng: "en",
          desc: "Test Category (English)",
        },
        {
          lng: "de",
          desc: "Testkategorie (Deutsch)",
        },
      ],
      mails: [
        {
          mail_address: "test@example.com",
        },
      ],
    },
    token,
    "ACTION createCategoryWithDetails (Admin Only)"
  );

  // 2. updateCategoryWithDetails - Admin only
  if (categoryId) {
    await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/updateCategoryWithDetails`,
      {
        category: categoryId,
        werks: TEST_DATA.werks,
        default_desc: "Updated Category Description",
        sendmail: 1,
        translations: [
          {
            lng: "en",
            desc: "Updated Category (English)",
          },
        ],
        mails: [
          {
            mail_address: "updated@example.com",
          },
        ],
      },
      token,
      "ACTION updateCategoryWithDetails (Admin Only)"
    );
  }

  // 3. batchInsertMails - Admin only
  if (categoryId) {
    await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/batchInsertMails`,
      {
        category: categoryId,
        werks: TEST_DATA.werks,
        mails: [
          { mail_address: "batch1@example.com" },
          { mail_address: "batch2@example.com" },
        ],
      },
      token,
      "ACTION batchInsertMails (Admin Only)"
    );
  }

  // 4. batchInsertTranslations - Admin only
  if (categoryId) {
    await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/batchInsertTranslations`,
      {
        category: categoryId,
        werks: TEST_DATA.werks,
        translations: [
          { lng: "es", desc: "Categoría de Prueba (Español)" },
          { lng: "fr", desc: "Catégorie de Test (Français)" },
        ],
      },
      token,
      "ACTION batchInsertTranslations (Admin Only)"
    );
  }

  // 5. sendMailByCategory - Admin only
  if (categoryId) {
    await makeRequest(
      "post",
      `${BASE_URL}${SERVICE_PATH}/sendMailByCategory`,
      {
        category: categoryId,
        werks: TEST_DATA.werks,
        subject: "Test Email from CRUD Script",
        message:
          "This is a test email sent via the sendMailByCategory action during CRUD testing.",
      },
      token,
      "ACTION sendMailByCategory (Admin Only)"
    );
  }

  // Note: We skip deleteCategoryCascade as it's destructive
  console.log(
    "\n⚠️  Skipping deleteCategoryCascade action (destructive operation)"
  );
}

async function testODataQueries(token) {
  console.log("\n🔵 TESTING ODATA QUERY OPTIONS");
  console.log("=".repeat(50));

  // $filter
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$filter=werks eq '${TEST_DATA.werks}'`,
    null,
    token,
    "OData $filter query"
  );

  // $select
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$select=ID,default_desc,werks`,
    null,
    token,
    "OData $select query"
  );

  // $top and $skip
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$top=3&$skip=1`,
    null,
    token,
    "OData $top and $skip query"
  );

  // $orderby
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$orderby=default_desc asc`,
    null,
    token,
    "OData $orderby query"
  );

  // $count
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$count=true&$top=1`,
    null,
    token,
    "OData $count query"
  );

  // Complex query
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookLog?$filter=werks eq '${TEST_DATA.werks}' and contains(subject,'test')&$orderby=createdAt desc&$top=5`,
    null,
    token,
    "Complex OData query with multiple options"
  );
}

async function testErrorScenarios(token) {
  console.log("\n🟡 TESTING ERROR SCENARIOS");
  console.log("=".repeat(50));

  // Test invalid UUID
  await makeRequest(
    "get",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory(invalid-uuid)`,
    null,
    token,
    "Invalid UUID Error Test"
  );

  // Test creating log with invalid category
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/ShiftBookLog`,
    {
      werks: TEST_DATA.werks,
      shoporder: TEST_DATA.shoporder,
      stepid: TEST_DATA.stepid,
      split: TEST_DATA.split,
      workcenter: TEST_DATA.workcenter,
      user_id: TEST_DATA.user_id,
      category: "00000000-0000-0000-0000-000000000000",
      subject: "Error Test",
      message: "This should fail",
    },
    token,
    "Invalid Category Reference Error Test"
  );

  // Test missing required fields
  await makeRequest(
    "post",
    `${BASE_URL}${SERVICE_PATH}/addShiftBookEntry`,
    {
      werks: TEST_DATA.werks,
      // Missing required fields
    },
    token,
    "Missing Required Fields Error Test"
  );
}

async function generateSummaryReport(token) {
  console.log("\n📊 GENERATING SUMMARY REPORT");
  console.log("=".repeat(50));

  try {
    // Get current data counts
    const categories = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$count=true&$top=0`,
      null,
      token,
      "Count Categories"
    );

    const logs = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookLog?$count=true&$top=0`,
      null,
      token,
      "Count Logs"
    );

    const mails = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategoryMail?$count=true&$top=0`,
      null,
      token,
      "Count Category Mails"
    );

    const translations = await makeRequest(
      "get",
      `${BASE_URL}${SERVICE_PATH}/ShiftBookCategoryLng?$count=true&$top=0`,
      null,
      token,
      "Count Translations"
    );

    console.log("\n📈 FINAL DATA SUMMARY:");
    console.log(
      `   📁 Total Categories: ${categories?.["@odata.count"] || "Unknown"}`
    );
    console.log(`   📝 Total Logs: ${logs?.["@odata.count"] || "Unknown"}`);
    console.log(
      `   📧 Total Mail Addresses: ${mails?.["@odata.count"] || "Unknown"}`
    );
    console.log(
      `   🌐 Total Translations: ${translations?.["@odata.count"] || "Unknown"}`
    );
  } catch (error) {
    console.error("❌ Failed to generate summary:", error.message);
  }
}

async function main() {
  console.log("🚀 STARTING COMPREHENSIVE CRUD OPERATIONS TEST");
  console.log("=".repeat(60));
  console.log(
    "This script will test all available CRUD operations and actions"
  );
  console.log("in the ShiftBookService with proper authentication.");
  console.log("=".repeat(60));

  try {
    // Get authentication token
    const token = await getAccessToken();

    // Run comprehensive tests
    const testIds = await testEntityCRUD(token);
    await testServiceActions(token, testIds);
    await testEmailFunctionality(token, testIds);
    await testAdminOnlyActions(token, testIds);
    await testODataQueries(token);
    await testErrorScenarios(token);
    await generateSummaryReport(token);

    console.log("\n🎉 COMPREHENSIVE CRUD TESTING COMPLETED!");
    console.log(
      "Check the output above for detailed results of each operation."
    );
  } catch (error) {
    console.error("💥 Script failed:", error.message);
    process.exit(1);
  }
}

// Allow running specific test suites
if (require.main === module) {
  const testSuite = process.argv[2];

  if (testSuite) {
    console.log(`🎯 Running specific test suite: ${testSuite}`);

    getAccessToken().then(async (token) => {
      const testIds = { categoryId: null };

      // Get a sample category ID for tests that need it
      const categories = await makeRequest(
        "get",
        `${BASE_URL}${SERVICE_PATH}/ShiftBookCategory?$top=1`,
        null,
        token,
        "Getting sample category ID"
      );

      if (categories?.value?.[0]) {
        testIds.categoryId = categories.value[0].ID;
      }

      switch (testSuite) {
        case "crud":
          await testEntityCRUD(token);
          break;
        case "actions":
          await testServiceActions(token, testIds);
          break;
        case "email":
          await testEmailFunctionality(token, testIds);
          break;
        case "admin":
          await testAdminOnlyActions(token, testIds);
          break;
        case "odata":
          await testODataQueries(token);
          break;
        case "errors":
          await testErrorScenarios(token);
          break;
        default:
          console.log(
            "❌ Unknown test suite. Available options: crud, actions, email, admin, odata, errors"
          );
      }
    });
  } else {
    main();
  }
}

module.exports = {
  getAccessToken,
  testEntityCRUD,
  testServiceActions,
  testEmailFunctionality,
  testAdminOnlyActions,
  testODataQueries,
  testErrorScenarios,
};
