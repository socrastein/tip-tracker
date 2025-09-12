import { setupMockLocalStorage } from "./MockLocalStorage";

// Only mock if localStorage isn't already defined
if (typeof globalThis.localStorage === "undefined") {
  setupMockLocalStorage();
  console.log("✅ mockStorage installed for Node tests");
} else {
  console.log("✅ Using jsdom localStorage");
}
