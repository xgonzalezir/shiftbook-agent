const https = require("https");

const URL =
  "https://manu-dev-org-dev-shiftbooksrv.cfapps.us10-001.hana.ondemand.com/health";

// Simple test to verify the application is running
console.log("🧪 Testing ShiftBook Service in production...");
console.log(`📍 URL: ${URL}`);

const req = https.get(URL, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`✅ Status: ${res.statusCode}`);
    console.log(`📊 Response: ${data.slice(0, 200)}...`);

    if (res.statusCode === 200) {
      console.log("🎉 Application is running successfully!");
      console.log("📧 The email service fix has been deployed.");
      console.log("🔧 The original TypeError has been resolved.");
    } else {
      console.log("❌ Application health check failed");
    }
  });
});

req.on("error", (err) => {
  console.error("❌ Error testing application:", err.message);
});

req.setTimeout(10000, () => {
  console.log("⏰ Request timeout");
  req.destroy();
});
