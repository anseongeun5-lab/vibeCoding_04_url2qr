/**
 * URL2QR - Application Logic
 * QR Code Generator, JPG Downloader & Mouse-Responsive Dynamic Gradients
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const appLayout = document.getElementById('appLayout');
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnClearInput = document.getElementById('btnClearInput');
  const btnPasteInput = document.getElementById('btnPasteInput');
  const inputGlowWrapper = document.querySelector('.input-glow-wrapper');
  const inputErrorMsg = document.getElementById('inputErrorMsg');
  
  const qrDownloadCard = document.getElementById('qrDownloadCard');
  const qrcodeContainer = document.getElementById('qrcode');
  const displayTargetUrl = document.getElementById('displayTargetUrl');
  
  const btnDownloadJpg = document.getElementById('btnDownloadJpg');
  const btnCopyImage = document.getElementById('btnCopyImage');
  const btnReset = document.getElementById('btnReset');
  const btnLogoHome = document.getElementById('btnLogoHome');
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  const toastContainer = document.getElementById('toastContainer');
  const mouseAura = document.getElementById('mouseAura');

  let qrInstance = null;
  let currentUrl = '';
  const QR_RESOLUTION = 1000; // High-res export size for clean JPG download

  // -------------------------------------------------------------
  // Mouse-Responsive Dynamic Gradient & Aura Engine
  // -------------------------------------------------------------
  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;

  // Track mouse movements smoothly
  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  }, { passive: true });

  // Touch support for mobile devices
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetX = e.touches[0].clientX;
      targetY = e.touches[0].clientY;
    }
  }, { passive: true });

  // Render loop with lerp (Linear Interpolation) for silky smooth color transition
  function updateDynamicLighting() {
    const lerpFactor = 0.08;
    currentX += (targetX - currentX) * lerpFactor;
    currentY += (targetY - currentY) * lerpFactor;

    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const ratioX = Math.min(Math.max(currentX / width, 0), 1);
    const ratioY = Math.min(Math.max(currentY / height, 0), 1);

    // Calculate dynamic warm hues (Golden Amber, Warm Sunshine, Soft Sunset Coral)
    const hue1 = 36 + (ratioX * 22); // 36deg (Amber) -> 58deg (Bright Golden Yellow)
    const hue2 = 16 + (ratioY * 22); // 16deg (Soft Sunset Coral) -> 38deg (Warm Tangerine)
    const hue3 = 48 + ((ratioX + ratioY) * 10); // 48deg -> 68deg (Cream Lemon)
    const angle = 115 + (ratioX * 50); // 115deg -> 165deg

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-ratio-x', ratioX.toFixed(3));
    rootStyle.setProperty('--mouse-ratio-y', ratioY.toFixed(3));
    rootStyle.setProperty('--dynamic-hue-1', `${hue1.toFixed(1)}deg`);
    rootStyle.setProperty('--dynamic-hue-2', `${hue2.toFixed(1)}deg`);
    rootStyle.setProperty('--dynamic-hue-3', `${hue3.toFixed(1)}deg`);
    rootStyle.setProperty('--dynamic-angle', `${angle.toFixed(1)}deg`);

    requestAnimationFrame(updateDynamicLighting);
  }
  requestAnimationFrame(updateDynamicLighting);

  // -------------------------------------------------------------
  // Theme Management (Default: Light Warm Theme to match Logo)
  // -------------------------------------------------------------
  const savedTheme = localStorage.getItem('url2qr_theme') || 'light-theme';
  document.body.className = savedTheme;

  btnThemeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-theme');
    const newTheme = isDark ? 'light-theme' : 'dark-theme';
    document.body.className = newTheme;
    localStorage.setItem('url2qr_theme', newTheme);
  });

  // -------------------------------------------------------------
  // Input Field Enhancements (Clear / Paste / Validation)
  // -------------------------------------------------------------
  urlInput.addEventListener('input', () => {
    if (urlInput.value.trim().length > 0) {
      inputGlowWrapper.classList.add('has-value');
      clearError();
    } else {
      inputGlowWrapper.classList.remove('has-value');
    }
  });

  btnClearInput.addEventListener('click', () => {
    urlInput.value = '';
    inputGlowWrapper.classList.remove('has-value');
    urlInput.focus();
    clearError();
  });

  btnPasteInput.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        urlInput.value = text.trim();
        inputGlowWrapper.classList.add('has-value');
        urlInput.focus();
        showToast('클립보드 내용을 붙여넣었습니다.');
      }
    } catch (err) {
      showToast('클립보드 접근 권한이 필요합니다.', 'error');
    }
  });

  function showError(msg) {
    inputErrorMsg.textContent = msg;
    inputErrorMsg.classList.add('show');
  }

  function clearError() {
    inputErrorMsg.textContent = '';
    inputErrorMsg.classList.remove('show');
  }

  // -------------------------------------------------------------
  // Normalize & Format URL
  // -------------------------------------------------------------
  function normalizeUrl(input) {
    let url = input.trim();
    if (!url) return '';
    
    // Check if input has protocol or is a valid text/url
    if (!/^https?:\/\//i.test(url) && !/^[a-zA-Z0-9]+:\/\//i.test(url)) {
      if (url.includes('.') && !url.includes(' ')) {
        url = 'https://' + url;
      }
    }
    return url;
  }

  // -------------------------------------------------------------
  // QR Code Generation
  // -------------------------------------------------------------
  function generateQRCode(rawUrl) {
    const targetUrl = normalizeUrl(rawUrl);
    if (!targetUrl) {
      showError('유효한 URL 또는 텍스트를 입력해주세요.');
      urlInput.focus();
      return;
    }

    clearError();
    currentUrl = targetUrl;
    displayTargetUrl.textContent = targetUrl;
    displayTargetUrl.title = targetUrl;

    // Clear previous QR code
    qrcodeContainer.innerHTML = '';

    // Initialize High-Resolution QRCode
    qrInstance = new QRCode(qrcodeContainer, {
      text: targetUrl,
      width: QR_RESOLUTION,
      height: QR_RESOLUTION,
      colorDark: '#000000',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.H
    });

    // Switch App Layout to Generated State (Input floats down, QR appears in center)
    appLayout.classList.add('has-qr');

    // Smooth scroll to QR if on mobile
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        qrDownloadCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }

  // Form Submit Handler
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode(urlInput.value);
  });

  // -------------------------------------------------------------
  // JPG Download Logic (Canvas rendering with pure white background)
  // -------------------------------------------------------------
  function downloadQRCodeAsJpg() {
    if (!currentUrl) return;

    // Find the canvas generated by qrcode.js or create from image
    const sourceCanvas = qrcodeContainer.querySelector('canvas');
    const sourceImg = qrcodeContainer.querySelector('img');

    if (!sourceCanvas && !sourceImg) {
      showToast('QR 코드를 생성하는 중입니다. 잠시 후 다시 시도해주세요.', 'error');
      return;
    }

    // Create a high quality export canvas with padding and pure white background
    const padding = 60;
    const exportSize = QR_RESOLUTION + (padding * 2);
    const canvas = document.createElement('canvas');
    canvas.width = exportSize;
    canvas.height = exportSize;
    const ctx = canvas.getContext('2d');

    // Fill pure white background (crucial for valid JPG without transparent black issue)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderAndDownload = (drawableSource) => {
      ctx.drawImage(drawableSource, padding, padding, QR_RESOLUTION, QR_RESOLUTION);

      // Convert to JPG format data URL
      const jpgDataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // Generate filename based on date and domain
      let safeDomain = 'qrcode';
      try {
        const parsed = new URL(currentUrl);
        safeDomain = parsed.hostname.replace(/[^a-zA-Z0-9]/g, '_');
      } catch (e) {
        safeDomain = 'qrcode';
      }
      
      const now = new Date();
      const timeStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
      const filename = `URL2QR_${safeDomain}_${timeStr}.jpg`;

      // Trigger automatic download
      const link = document.createElement('a');
      link.download = filename;
      link.href = jpgDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Visual feedback
      triggerCardPulse();
      showToast(`📸 ${filename} 다운로드 완료!`, 'success');
    };

    if (sourceCanvas) {
      renderAndDownload(sourceCanvas);
    } else if (sourceImg && sourceImg.src) {
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = () => renderAndDownload(tempImg);
      tempImg.src = sourceImg.src;
    }
  }

  // Card Click -> Direct JPG Download (Requirement 4)
  qrDownloadCard.addEventListener('click', (e) => {
    downloadQRCodeAsJpg();
  });

  // Support Keyboard Enter/Space on QR Card for Accessibility
  qrDownloadCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQRCodeAsJpg();
    }
  });

  // Action Buttons
  btnDownloadJpg.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQRCodeAsJpg();
  });

  btnCopyImage.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      const sourceCanvas = qrcodeContainer.querySelector('canvas');
      if (!sourceCanvas) {
        showToast('복사할 QR 코드가 없습니다.', 'error');
        return;
      }

      // Convert canvas to blob and copy to clipboard
      sourceCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          showToast('📋 QR 코드가 클립보드에 복사되었습니다!', 'success');
        } catch (err) {
          showToast('이 브라우저에서는 이미지 복사를 지원하지 않습니다.', 'error');
        }
      });
    } catch (err) {
      showToast('이미지 복사 중 오류가 발생했습니다.', 'error');
    }
  });

  function resetToInitial() {
    appLayout.classList.remove('has-qr');
    urlInput.value = '';
    currentUrl = '';
    inputGlowWrapper.classList.remove('has-value');
    clearError();
    urlInput.focus();
  }

  btnReset.addEventListener('click', (e) => {
    e.stopPropagation();
    resetToInitial();
  });

  btnLogoHome.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitial();
  });

  // Visual card animation on click
  function triggerCardPulse() {
    qrDownloadCard.style.transform = 'scale(0.97)';
    setTimeout(() => {
      qrDownloadCard.style.transform = '';
    }, 150);
  }

  // -------------------------------------------------------------
  // Toast Notification
  // -------------------------------------------------------------
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
    if (type === 'error') {
      iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    }
    
    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 2800);
  }

  // Initial Focus
  urlInput.focus();
});
