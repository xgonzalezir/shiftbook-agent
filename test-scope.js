// Test different scope patterns for blue-green deployment
const testScopes = [
  "shiftbook-srv!t459223.admin",
  "shiftbook-srv-blue!t459223.admin",
  "shiftbook-srv-green!t459223.operator",
  "my-app!tenant123.admin",
  "complex-app-name!t999.operator",
];

console.log("Testing scope extraction patterns:\n");

testScopes.forEach((scope) => {
  const match = scope.match(/(.+)![^.]+\.([^.]+)/);
  const extractedScope = match ? match[2] : "null";
  const isValid = ["operator", "admin"].includes(extractedScope);

  console.log(`Scope: ${scope}`);
  console.log(`  Extracted: ${extractedScope}`);
  console.log(`  Valid: ${isValid}`);
  console.log(`  Match: ${match ? "YES" : "NO"}`);
  console.log("");
});
