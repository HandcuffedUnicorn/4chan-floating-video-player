document.getElementById("start").addEventListener("click", () => {
    // Send a message to content.js to start video playback
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "startPlayback" });
    });
});
