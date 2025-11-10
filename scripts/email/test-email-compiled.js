
const path = require('path');

// Set up environment
process.env.NODE_ENV = 'production';
process.env.CDS_ENV = 'production';

async function testEmail() {
  try {
    console.log('🔧 Loading compiled EmailService...');
    
    // Try to load the compiled EmailService
    const emailServicePath = path.join(__dirname, 'gen', 'srv', 'lib', 'email-service.js');
    console.log('📁 Looking for:', emailServicePath);
    
    if (!require('fs').existsSync(emailServicePath)) {
      throw new Error('Compiled EmailService not found at: ' + emailServicePath);
    }
    
    const { EmailService } = require(emailServicePath);
    console.log('✅ EmailService loaded from compiled JS');
    
    const emailService = EmailService.getInstance();
    await emailService.initialize();
    console.log('✅ EmailService initialized');
    
    // Get health status
    const health = emailService.getHealthStatus();
    console.log('📊 Email Service Health:', JSON.stringify(health, null, 2));
    
    // Send test email
    console.log('📧 Sending test email...');
    const result = await emailService.sendMail({
      to: 'xavier.gonzalez@syntax.com',
      subject: 'ShiftBook Email Test - Compiled Version - ' + new Date().toISOString(),
      html: `
        <h2>🎉 ShiftBook Email Test - SUCCESS!</h2>
        <p>This email was sent using the compiled TypeScript version.</p>
        <h3>Test Details:</h3>
        <ul>
          <li><strong>Method:</strong> Compiled TypeScript + EmailService</li>
          <li><strong>Timestamp:</strong> ${new Date().toISOString()}</li>
          <li><strong>Environment:</strong> ${process.env.NODE_ENV}</li>
          <li><strong>Simulation Mode:</strong> ${process.env.EMAIL_SIMULATION_MODE || 'false'}</li>
          <li><strong>Destination:</strong> shiftbook-email</li>
        </ul>
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 10px; border-radius: 5px; margin: 20px 0;">
          <strong>✅ SUCCESS:</strong> Compiled email testing is working correctly!
        </div>
        <p>Best regards,<br><strong>ShiftBook Email System</strong></p>
      `,
      text: `
ShiftBook Email Test - SUCCESS!

This email was sent using the compiled TypeScript version.

Test Details:
- Method: Compiled TypeScript + EmailService  
- Timestamp: ${new Date().toISOString()}
- Environment: ${process.env.NODE_ENV}
- Simulation Mode: ${process.env.EMAIL_SIMULATION_MODE || 'false'}
- Destination: shiftbook-email

SUCCESS: Compiled email testing is working correctly!

Best regards,
ShiftBook Email System
      `
    });
    
    console.log('✅ Email sent successfully:', result);
    console.log('📧 Please check xavier.gonzalez@syntax.com for the test email.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testEmail().then(() => {
  console.log('🎉 Email test completed successfully');
}).catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
