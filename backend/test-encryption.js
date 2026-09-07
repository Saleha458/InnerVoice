require("dotenv").config();

const {
  encrypt,
  decrypt
} = require("./src/services/encryptionService");

const originalMessage = "I am feeling lonely";

const encrypted = encrypt(originalMessage);

console.log("\n========== ENCRYPTION TEST ==========\n");

console.log("Original:");
console.log(originalMessage);

console.log("\nEncrypted:");
console.log(encrypted);

console.log("\nDecrypted:");
console.log(decrypt(
  encrypted.encryptedData,
  encrypted.iv,
  encrypted.authTag
));

console.log("\nResult:");

if (
  decrypt(
    encrypted.encryptedData,
    encrypted.iv,
    encrypted.authTag
  ) === originalMessage
) {
  console.log("✅ ENCRYPTION TEST PASSED");
} else {
  console.log("❌ ENCRYPTION TEST FAILED");
}