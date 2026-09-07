require("dotenv").config();

const { db } = require("./src/config/firebase");
const {
  encrypt,
  decrypt,
} = require("./src/services/encryptionService");

async function testMessaging() {
  const originalMessage =
    "I am feeling lonely and need someone to talk to.";

  const encrypted = encrypt(originalMessage);

  console.log("\n========== MESSAGE ENCRYPTION TEST ==========\n");

  console.log("Original:");
  console.log(originalMessage);

  console.log("\nEncrypted data:");
  console.log(encrypted.encryptedData);

  console.log("\nIV:");
  console.log(encrypted.iv);

  console.log("\nAuth Tag:");
  console.log(encrypted.authTag);

  const decrypted = decrypt(
    encrypted.encryptedData,
    encrypted.iv,
    encrypted.authTag
  );

  console.log("\nDecrypted:");
  console.log(decrypted);

  if (decrypted === originalMessage) {
    console.log("\n✅ MESSAGE ENCRYPTION PASSED");
  } else {
    console.log("\n❌ MESSAGE ENCRYPTION FAILED");
  }
}

testMessaging();