let videos = [];
const videoExtensions = [".mp4", ".webm"];
let playerContainer = null; // Track the player container to remove it when needed
let currentIndex = 0; // Reset to 0 when the player starts
let isDragging = false; // Track dragging state
let offsetX, offsetY; // Track drag offsets

// Event listener for receiving messages
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "startPlayback") {
    startVideoPlayback();
  }
  if (message.action === "saveCurrent") {
    saveCurrentVideo();
  }
  if (message.action === "saveAll") {
    saveAllVideos();
  }
});

// Collect video links only once
if (videos.length === 0) {
  document.querySelectorAll("a").forEach((link) => {
    const href = link.href;
    if (videoExtensions.some((ext) => href.endsWith(ext)) && !videos.includes(href)) {
      videos.push(href);
    }
  });
  console.log("Videos found:", videos);
}

// Event listener for hotkey Ctrl+Space to toggle playback
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === " ") {
    e.preventDefault(); // Prevent default behavior
    if (playerContainer) {
      closePlayer(); // Close the player if it's open
    } else {
      startVideoPlayback(); // Start playback
    }
  }
});

function startVideoPlayback() {
  if (videos.length > 0 && !playerContainer) {
    const { videoElement, updateVideoList } = createFloatingPlayer();

    // Play the current video
    const playCurrentVideo = () => {
      if (currentIndex < videos.length) {
        videoElement.src = videos[currentIndex];
        videoElement.play();
        updateVideoList(videos, currentIndex);
      } else {
        console.log("All videos played.");
      }
    };

    // Play the next video
    const playNextVideo = () => {
      if (currentIndex < videos.length - 1) {
        currentIndex++;
        playCurrentVideo();
      } else {
        console.log("No more videos to play.");
      }
    };

    // Handle video errors
    videoElement.onerror = () => {
      console.error("Failed to load video:", videos[currentIndex]);
      playNextVideo(); // Automatically proceed to the next video
    };

    // Set up event for when the current video ends
    videoElement.onended = playNextVideo;

    // Start playback with the current video
    playCurrentVideo();
  }
}

// Function to create a floating video player with a playlist
let resizeHandle = null; // Declare the resizing handle globally

// Inside your createFloatingPlayer function
const createFloatingPlayer = () => {
  // Create player container
  playerContainer = document.createElement("div");
  playerContainer.id = "floating-player-container";

  // Dynamically adjust size based on viewport
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  const playerWidth = Math.min(screenWidth * 0.8, 1200);  // Max 80% of screen width, but no more than 1200px
  const playerHeight = Math.min(screenHeight * 0.6, 600); // Max 60% of screen height, but no more than 600px

  playerContainer.style = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  width: ${playerWidth}px;
  height: ${playerHeight}px;
  background: black;
  border: 2px solid white;
  z-index: 9999;
  max-width: 1200px; /* Prevent exceeding 1200px */
  max-height: 600px; /* Prevent exceeding 600px */
  `;

  // Video element setup
  const videoElement = document.createElement("video");
  videoElement.controls = true;
  videoElement.style.width = "100%";
  videoElement.style.height = "100%";
  videoElement.volume = 0.5; // Start at 50% volume

  // Playlist container setup
  const videoListContainer = document.createElement("div");
  videoListContainer.id = "video-list-container";
  videoListContainer.style = `
  width: 250px;
  background-color: #333;
  overflow-y: auto;
  color: white;
  padding: 10px;
  font-size: 14px;
  margin-left: 10px;
  border-left: 2px solid white;
  max-height: ${playerHeight - 40}px; /* Adjust for close button */
  `;

  // Close button setup
  const closeButton = document.createElement("button");
  closeButton.textContent = "X";
  closeButton.style = `
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: red;
  color: white;
  border: none;
  font-size: 18px;
  padding: 5px;
  cursor: pointer;
  `;
  closeButton.addEventListener("click", closePlayer);

  // Append video elements to player container
  playerContainer.appendChild(videoElement);
  playerContainer.appendChild(videoListContainer);
  playerContainer.appendChild(closeButton);
  document.body.appendChild(playerContainer);

  // Create and append the resizing handle just outside the top-left of the player container
  resizeHandle = createResizingHandle();
  document.body.appendChild(resizeHandle);

  // Initialize variables for resizing
  let isResizing = false;
  let initialWidth = playerWidth;
  let initialHeight = playerHeight;
  let initialMouseX = 0;
  let initialMouseY = 0;

  // Event listeners for resizing
  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;
    initialWidth = playerContainer.offsetWidth;
    initialHeight = playerContainer.offsetHeight;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (isResizing) {
      const dx = initialMouseX - e.clientX; // Movement of mouse on X-axis
      const dy = initialMouseY - e.clientY; // Movement of mouse on Y-axis
      const newWidth = Math.max(initialWidth + dx, 300);  // Prevent player from becoming too small
      const newHeight = Math.max(initialHeight + dy, 200); // Prevent player from becoming too small
      playerContainer.style.width = `${newWidth}px`;
      playerContainer.style.height = `${newHeight}px`;
      videoListContainer.style.maxHeight = `${newHeight - 40}px`; // Adjust playlist height

      // Update resize handle position to stay just outside the player container
      resizeHandle.style.top = `${playerContainer.offsetTop - 10}px`;
      resizeHandle.style.left = `${playerContainer.offsetLeft - 10}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
    }
  });

  // Position the handle just outside the top-left of the player container
  resizeHandle.style.top = `${playerContainer.offsetTop - 10}px`; // Adjust to place outside
  resizeHandle.style.left = `${playerContainer.offsetLeft - 10}px`; // Adjust to place outside

  // Update playlist and highlight the playing video
  const updateVideoList = (videos, currentIndex) => {
    videoListContainer.innerHTML = ""; // Clear the list

    videos.forEach((video, index) => {
      const videoName = getVideoFileName(video);
      const videoItem = document.createElement("div");
      videoItem.textContent = videoName;
      videoItem.style.padding = "5px";
      videoItem.style.cursor = "pointer";

      // Highlight the currently playing video
      if (index === currentIndex) {
        videoItem.style.backgroundColor = "green";
      } else {
        videoItem.style.backgroundColor = "#444";
      }

      // Make video names clickable
      videoItem.addEventListener("click", () => {
        currentIndex = index; // Update currentIndex to the clicked video's index
        videoElement.src = videos[currentIndex]; // Change video source
        videoElement.play(); // Start playing the clicked video
        updateVideoList(videos, currentIndex); // Update the list highlighting
        videoElement.onended = () => { // Ensure the next video plays in sequence
          if (currentIndex < videos.length - 1) {
            currentIndex++;
            videoElement.src = videos[currentIndex];
            videoElement.play();
            updateVideoList(videos, currentIndex);
          } else {
            console.log("No more videos to play.");
          }
        };
      });

      videoListContainer.appendChild(videoItem);
    });
  };

  return { videoElement, updateVideoList };
};

// Function to create the resizing handle
const createResizingHandle = () => {
  const handle = document.createElement("div");
  handle.id = "resize-handle";
  handle.style = `
  width: 20px;
  height: 20px;
  background-color: white;
  position: absolute;
  top: -10px; /* Position just outside the top-left corner of the player */
  left: -10px;
  cursor: nw-resize; /* Cursor for resizing from top-left corner */
  z-index: 10000;
  `;
  return handle;
};

// Helper to extract video file name from URL
function getVideoFileName(url) {
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  return path.substring(path.lastIndexOf("/") + 1);
}

// Close the player and reset the state
function closePlayer() {
  if (playerContainer) {
    playerContainer.remove(); // Remove the player container
    playerContainer = null; // Reset player container reference
    currentIndex = 0; // Reset the video index when the player is closed
    console.log("Player closed.");

    // Remove the resizing handle when the player is closed
    if (resizeHandle) {
      resizeHandle.remove(); // Remove the resizing handle
      resizeHandle = null; // Reset the resizing handle reference
    }
  }
}
