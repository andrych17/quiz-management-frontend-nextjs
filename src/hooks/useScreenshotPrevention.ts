import { useEffect, useRef } from 'react';

interface UseScreenshotPreventionProps {
  participantName?: string;
  nij?: string;
}

export function useScreenshotPrevention({ participantName, nij }: UseScreenshotPreventionProps = {}) {
  const screenshotDetectedRef = useRef(false);
  const blurTimeRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('[Screenshot Prevention] Initialized for:', { participantName, nij });
    // Prevent Print Screen key
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      const code = e.code;

      // Block Print Screen
      if (code === 'PrintScreen') {
        console.warn('[Screenshot Prevention] Print Screen key detected!');
        e.preventDefault();
        screenshotDetectedRef.current = true;
        triggerScreenshotAlert('Print Screen detected');
        return false;
      }

      // Block F12 (Developer Tools)
      if (key === 'F12' || code === 'F12') {
        console.warn('[Screenshot Prevention] F12 DevTools blocked');
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+I (Dev Tools)
      if (e.ctrlKey && e.shiftKey && key === 'I') {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+C (Element Inspector)
      if (e.ctrlKey && e.shiftKey && key === 'C') {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+K (Console)
      if (e.ctrlKey && e.shiftKey && key === 'K') {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+Shift+J (Console - Firefox)
      if (e.ctrlKey && e.shiftKey && key === 'J') {
        e.preventDefault();
        return false;
      }

      // Block Ctrl+S (Save)
      if (e.ctrlKey && key === 's') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent copy
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent paste
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect when window loses focus (screenshot often triggers this on mobile)
    const handleWindowBlur = () => {
      console.warn('[Screenshot Prevention] Window blur detected - possible screenshot attempt');
      screenshotDetectedRef.current = true;
      triggerScreenshotAlert('Window focus lost - screenshot attempt detected');

      // Clear any existing timeout
      if (blurTimeRef.current) {
        clearTimeout(blurTimeRef.current);
      }

      // Re-enable after 2 seconds of regaining focus
      const handleFocus = () => {
        blurTimeRef.current = setTimeout(() => {
          screenshotDetectedRef.current = false;
        }, 2000);
      };

      window.addEventListener('focus', handleFocus, { once: true });
    };

    // Disable drag and drop
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Detect tap/long press (mobile context menu)
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Block multi-touch
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('copy', handleCopy, true);
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('touchstart', handleTouchStart, true);
    document.addEventListener('touchmove', handleTouchMove, true);
    window.addEventListener('blur', handleWindowBlur);

    // Add CSS protections
    addCSSProtection();

    // Add watermark if participant info provided
    if (participantName || nij) {
      console.log('[Screenshot Prevention] Adding watermark for:', { participantName, nij });
      addWatermark(participantName, nij);
    }

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('touchstart', handleTouchStart, true);
      document.removeEventListener('touchmove', handleTouchMove, true);
      window.removeEventListener('blur', handleWindowBlur);
      if (blurTimeRef.current) {
        clearTimeout(blurTimeRef.current);
      }
    };
  }, [participantName, nij]);
}

function triggerScreenshotAlert(message: string) {
  console.warn('[Screenshot Alert]', message);
  console.log('[Screenshot Alert] Timestamp:', new Date().toISOString());

  // Show visual alert on the page
  const alertDiv = document.createElement('div');
  alertDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: rgba(220, 38, 38, 0.95);
    color: white;
    padding: 20px 40px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    z-index: 99999;
    text-align: center;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  `;
  alertDiv.textContent = '⚠️ Screenshot terdeteksi! Tindakan ini dicatat.';
  document.body.appendChild(alertDiv);

  // Remove alert after 3 seconds
  setTimeout(() => {
    alertDiv.remove();
  }, 3000);
}

function addCSSProtection() {
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-user-select: none !important;
      -webkit-touch-callout: none !important;
      user-select: none !important;
    }

    input, textarea {
      -webkit-user-select: text !important;
      user-select: text !important;
    }

    body {
      -webkit-user-select: none !important;
      user-select: none !important;
      overflow: hidden !important;
      position: fixed !important;
      width: 100% !important;
      height: 100% !important;
    }

    /* Prevent selection highlighting */
    ::selection {
      background: transparent !important;
      color: inherit !important;
    }

    ::-moz-selection {
      background: transparent !important;
      color: inherit !important;
    }
  `;
  document.head.appendChild(style);
}

function addWatermark(participantName?: string, nij?: string) {
  // Create LARGE watermark container with high visibility
  const watermarkContainer = document.createElement('div');
  watermarkContainer.id = 'quiz-watermark-main';
  watermarkContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9998;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;
    padding: 20px;
    box-sizing: border-box;
  `;

  // Create SVG watermark with diagonal text
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('viewBox', '0 0 1000 1000');
  svg.style.cssText = 'position: fixed; top: 0; left: 0; opacity: 0.08; pointer-events: none; z-index: 9998;';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
  pattern.setAttribute('id', 'watermark-pattern');
  pattern.setAttribute('x', '0');
  pattern.setAttribute('y', '0');
  pattern.setAttribute('width', '300');
  pattern.setAttribute('height', '300');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('patternTransform', 'rotate(-45)');

  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '10');
  text.setAttribute('y', '50');
  text.setAttribute('font-size', '40');
  text.setAttribute('font-weight', 'bold');
  text.setAttribute('fill', 'rgba(0, 0, 0, 0.5)');
  text.setAttribute('font-family', 'Arial, sans-serif');
  text.textContent = `${participantName || 'PARTICIPANT'} - ${nij || 'NIJ'} - DO NOT SCREENSHOT`;

  pattern.appendChild(text);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('width', '100%');
  rect.setAttribute('height', '100%');
  rect.setAttribute('fill', 'url(#watermark-pattern)');
  svg.appendChild(rect);

  document.body.appendChild(svg);

  // Add corner watermarks with red text (more visible)
  const corners = [
    { top: '10px', left: '10px' },
    { top: '10px', right: '10px' },
    { bottom: '10px', left: '10px' },
    { bottom: '10px', right: '10px' },
  ];

  corners.forEach(position => {
    const corner = document.createElement('div');
    corner.style.cssText = `
      position: fixed;
      ${position.top ? `top: ${position.top}` : `bottom: ${position.bottom}`};
      ${position.left ? `left: ${position.left}` : `right: ${position.right}`};
      background: rgba(220, 38, 38, 0.15);
      border: 2px solid rgba(220, 38, 38, 0.3);
      border-radius: 4px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: bold;
      color: rgba(220, 38, 38, 0.6);
      z-index: 9998;
      pointer-events: none;
      white-space: nowrap;
    `;
    corner.textContent = `${participantName} - ${nij}`;
    document.body.appendChild(corner);
  });
}
