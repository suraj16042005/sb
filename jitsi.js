document.addEventListener('DOMContentLoaded', () => {
    const jitsiContainer = document.getElementById('jitsi-container');
    const loadingMessage = jitsiContainer?.querySelector('.jitsi-loading-message');
    const errorMessage = jitsiContainer?.querySelector('.jitsi-error-message');
    const customCloseBtn = document.getElementById('jitsi-close-btn');

    if (!jitsiContainer) {
        console.error('Jitsi container not found. Cannot initialize Jitsi.');
        const appRoot = document.getElementById('app-root');
        if (appRoot) {
            appRoot.innerHTML = `
                <div class="jitsi-error-message" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; width: 100vw;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Critical Error: Jitsi Container Missing</h3>
                    <p>The video call container element (#jitsi-container) could not be found. Please check the HTML structure.</p>
                    <button class="btn btn-primary" onclick="window.location.href='index.html'">Go Back to Home</button>
                </div>
            `;
        }
        return;
    }

    // Show loading message initially
    if (loadingMessage) loadingMessage.style.display = 'flex';
    if (errorMessage) errorMessage.style.display = 'none';

    const domain = 'meet.jit.si';
    const roomName = 'StudyBuddy-room1'; // Define roomName separately for clarity
    const options = {
        roomName: roomName,
        width: '100%', // Use 100% to fill the parent container
        height: '100%', // Use 100% to fill the parent container
        parentNode: jitsiContainer,
        userInfo: {
            displayName: 'StudyBuddy User'
        },
        configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableWelcomePage: false,
            // Removed extensive toolbarButtons and other UI configs for debugging connection
        },
        interfaceConfigOverwrite: {
            DEFAULT_BACKGROUND: '#171717',
            APP_NAME: 'StudyBuddy',
            NATIVE_APP_NAME: 'StudyBuddy',
            PROVIDER_NAME: 'StudyBuddy',
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            DISABLE_VIDEO_BACKGROUND: true,
            TOOLBAR_ALWAYS_VISIBLE: true,
            CLOSE_BUTTON_ENABLED: true,
            // Removed other specific UI settings
        }
    };

    if (typeof JitsiMeetExternalAPI === 'undefined') {
        console.error('JitsiMeetExternalAPI script not loaded. Cannot initialize Jitsi.');
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'flex';
        return;
    }

    let api;
    const JITSI_LOAD_TIMEOUT = 15000; // 15 seconds timeout

    // Set a timeout for the Jitsi call to load
    const loadingTimeout = setTimeout(() => {
        if (loadingMessage && loadingMessage.style.display !== 'none') {
            console.warn('Jitsi video call took too long to load. Displaying error message.');
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (errorMessage) {
                errorMessage.style.display = 'flex';
                const errorDetails = errorMessage.querySelector('p');
                if (errorDetails) {
                    errorDetails.textContent = `The video call took too long to load. This might be due to a slow connection or Jitsi server issues. Please try again.`;
                }
            }
            if (api) {
                api.dispose(); // Attempt to clean up if API was initialized
            }
        }
    }, JITSI_LOAD_TIMEOUT);

    try {
        console.log(`Attempting to initialize JitsiMeetExternalAPI for room: ${roomName} on domain: ${domain}`);
        api = new JitsiMeetExternalAPI(domain, options);
        console.log('JitsiMeetExternalAPI initialized successfully.');

        api.addEventListener('videoConferenceJoined', () => {
            clearTimeout(loadingTimeout); // Clear timeout if joined successfully
            console.log('Jitsi video conference joined!');
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (errorMessage) errorMessage.style.display = 'none';
        });

        // Add an error listener for Jitsi API internal errors
        api.addEventListener('error', (error) => {
            clearTimeout(loadingTimeout);
            console.error('Jitsi API Error:', error);
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (errorMessage) {
                errorMessage.style.display = 'flex';
                const errorDetails = errorMessage.querySelector('p');
                if (errorDetails) {
                    errorDetails.textContent = `A Jitsi error occurred: ${error.message || JSON.stringify(error)}. Please try again.`;
                }
            }
            if (api) api.dispose();
        });

        api.addEventListener('readyToClose', () => {
            console.log('Jitsi ready to close. Disposing API.');
            api.dispose();
            window.location.href = 'index.html';
        });

        api.addEventListener('videoConferenceLeft', () => {
            console.log('Jitsi video conference left. Disposing API.');
            api.dispose();
            window.location.href = 'index.html';
        });

        customCloseBtn?.addEventListener('click', () => {
            console.log('Custom close button clicked. Disposing Jitsi API.');
            if (api) { // Ensure api exists before disposing
                api.dispose();
            }
            window.location.href = 'index.html';
        });

    } catch (error) {
        clearTimeout(loadingTimeout);
        console.error('Failed to initialize JitsiMeetExternalAPI:', error);
        if (loadingMessage) loadingMessage.style.display = 'none';
        if (errorMessage) errorMessage.style.display = 'flex';
        const errorDetails = errorMessage?.querySelector('p');
        if (errorDetails) {
            errorDetails.textContent = `Failed to start video call: ${error.message}. Please ensure your internet connection is stable and try again.`;
        }
    }
});

