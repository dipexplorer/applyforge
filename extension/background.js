// AutoApplier Copilot — Background Service Worker
// Minimal: just needed for Manifest V3 compliance

chrome.runtime.onInstalled.addListener(() => {
    console.log('AutoApplier Copilot installed. Make sure localhost:3000 is running!');
});
