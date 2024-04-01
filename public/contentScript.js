let hideSidebarTimeout;
let stickyContainer;
let hoverIntentArea;
let pinnedChats = new Set();

/**
 * Initializes the sticky container and hover intent area
 * for pinned chats. Sets up mouseenter and mouseleave
 * event listeners to show and hide the sticky container.
 */
function createStickyContainerAndHoverIntent() {
    if (!stickyContainer) {
        stickyContainer = document.createElement('div');
        document.body.appendChild(stickyContainer);
        stickyContainer.className = 'sticky-container';

        hoverIntentArea = document.createElement('div');
        document.body.appendChild(hoverIntentArea);
        hoverIntentArea.className = 'hover-intent-area';

        // Shows the sticky container when hovered.
        hoverIntentArea.addEventListener('mouseenter', () => {
            stickyContainer.classList.add('visible');
            clearTimeout(hideSidebarTimeout);
        });

        // Hides the sticky container shortly after mouse leaves.
        hoverIntentArea.addEventListener('mouseleave', () => {
            hideSidebarTimeout = setTimeout(() => {
                stickyContainer.classList.remove('visible');
            }, 500);
        });

        stickyContainer.addEventListener('mouseenter', () => {
            clearTimeout(hideSidebarTimeout);
        });

        stickyContainer.addEventListener('mouseleave', () => {
            hideSidebarTimeout = setTimeout(() => {
                stickyContainer.classList.remove('visible');
            }, 500);
        });
    }
}

/**
 * Shows the sticky container temporarily, mainly after a new chat is pinned.
 * Ensures it's visible for a brief period before automatically hiding.
 */
function showStickyContainerTemporarily() {
    if (!stickyContainer.classList.contains('visible')) {
        stickyContainer.classList.add('visible');
    }
    clearTimeout(hideSidebarTimeout);
    hideSidebarTimeout = setTimeout(() => {
        stickyContainer.classList.remove('visible');
    }, 3000);
}

/**
 * Handles pinning a chat. Creates a cloned div in the sticky container
 * and sets up the behavior for when it's clicked, including scrolling
 * to the original chat and applying a temporary highlight effect.
 * @param {HTMLElement} div - The chat div to be pinned.
 */
function pinDiv(div) {
    if (!stickyContainer || !hoverIntentArea) {
        createStickyContainerAndHoverIntent();
    }

    let originalDivId = div.getAttribute('data-original-id');
    if (!originalDivId) {
        originalDivId = `chat-${Date.now()}`;
        div.setAttribute('data-original-id', originalDivId);
    }

    if (pinnedChats.has(originalDivId)) {
        return; // Avoids pinning the same chat more than once.
    }

    pinnedChats.add(originalDivId);
    const clonedDiv = div.cloneNode(true);
    const newDiv = document.createElement('div');
    newDiv.className = "chat-holder";
    newDiv.style.position = "relative";

    const messageContent = clonedDiv.querySelector('div.markdown.prose');
    if (messageContent) {
        const textContent = messageContent.textContent.trim().split(' ').slice(0, 5).join(' ') + (messageContent.textContent.trim().split(' ').length > 5 ? '...' : '');
        const p = document.createElement('p');
        p.textContent = textContent;
        newDiv.appendChild(p);
    }

    const removeButton = document.createElement('button');
    removeButton.textContent = '×';
    removeButton.className = 'remove-button';
    removeButton.addEventListener('click', () => {
        stickyContainer.removeChild(newDiv);
        pinnedChats.delete(originalDivId);

        // Resets the original pin button's state if present.
        const pinButtonSelector = `.agent-turn[data-original-id='${originalDivId}'] .pin-button`;
        const originalPinButton = document.querySelector(pinButtonSelector);
        if (originalPinButton) {
            originalPinButton.classList.remove('pinned');
            originalPinButton.style.backgroundImage = `url('${chrome.runtime.getURL("pin.png")}')`;
            originalPinButton.innerText = 'Pin';
        }

        if (!stickyContainer.children.length) {
            stickyContainer.remove();
            hoverIntentArea.remove();
            stickyContainer = null;
            hoverIntentArea = null;
        }
    });
    newDiv.appendChild(removeButton);

    // Prevents highlight effect on remove button click and ensures smooth scroll to chat.
    newDiv.addEventListener('click', (e) => {
        if (e.target === removeButton || removeButton.contains(e.target)) {
            return;
        }

        const targetSelector = `.agent-turn[data-original-id='${originalDivId}']`;
        const element = document.querySelector(targetSelector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            element.classList.add('highlight');
            setTimeout(() => {
                element.classList.add('fade-out');
                setTimeout(() => {
                    element.classList.remove('highlight', 'fade-out');
                    element.style.backgroundColor = '';
                }, 2000);
            }, 2000);
        }
    });

    stickyContainer.appendChild(newDiv);
    showStickyContainerTemporarily();
}

/**
 * Adds a 'Pin' button to each chat div that isn't already pinned.
 * The button triggers the pinning functionality.
 */
function addPinButtonToDivs() {
    document.querySelectorAll('.agent-turn').forEach(div => {
        if (!div.querySelector('.pin-button')) {
            const button = document.createElement('button');
            button.className = 'pin-button';
            button.style.backgroundImage = `url('${chrome.runtime.getURL("pin.png")}')`;
            button.innerText = 'Pin';
            button.onclick = (e) => {
                e.stopPropagation();
                button.classList.add('pinned');
                pinDiv(div);
                button.style.backgroundImage = `url('${chrome.runtime.getURL("pin_white.png")}')`;
                button.innerText = 'Pinned';
            };
            div.appendChild(button);
        }
    });
}

// Observes the document for new chat divs to add 'Pin' buttons dynamically.
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            addPinButtonToDivs();
        }
    });
});

observer.observe(document.body, { childList: true, subtree: true });

// Toggles the visibility of the sticky container on 'p' keydown.
document.addEventListener('keydown', (e) => {
    if (e.key === 'p') {
        toggleContainer();
    }
});

// Initial call to add 'Pin' buttons to all agent-turn divs.
addPinButtonToDivs();