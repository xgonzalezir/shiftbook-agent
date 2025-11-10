/**
 * Test script to verify email sending functionality
 * This will help debug why emails are not being sent despite Teams working
 */

const EmailService = require("./gen/srv/lib/email-service").EmailService;

async function testEmailSending() {
  console.log("🧪 Starting email sending test...");

  try {
    // Get email service instance
    const emailService = EmailService.getInstance();

    // Initialize the service
    console.log("🔧 Initializing email service...");
    await emailService.initialize();

    // Test email options
    const testOptions = {
      to: ["test@example.com"], // Replace with actual test email if needed
      subject: "Test Email from ShiftBook",
      html: "<h1>Test Email</h1><p>This is a test email to verify email functionality.</p>",
    };

    console.log("📧 Sending test email...");
    console.log("   To:", testOptions.to);
    console.log("   Subject:", testOptions.subject);

    // Try to send the email
    const result = await emailService.sendMail(testOptions);

    if (result) {
      console.log("✅ Test email sent successfully!");
    } else {
      console.log("❌ Test email failed to send");
    }
  } catch (error) {
    console.error("❌ Email test failed with error:", error.message);
    console.error("Stack trace:", error.stack);
  }
}

// Run the test
testEmailSending().catch(console.error);
