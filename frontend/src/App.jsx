import { useState, useRef, useCallback, useMemo, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  // ══════════════════════════════════════════════════════════
  // CORE STATE (unchanged)
  // ══════════════════════════════════════════════════════════
  const [file, setFile] = useState(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | uploading | success | error
  const [message, setMessage] = useState('');
  const [report, setReport] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ══════════════════════════════════════════════════════════
  // ACCESSIBILITY STATE
  // ══════════════════════════════════════════════════════════
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState('medium'); // small | medium | large
  const [reducedMotion, setReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [announceMessage, setAnnounceMessage] = useState('');

  // Detect OS-level reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Screen reader announcements
  const announce = useCallback((msg) => {
    setAnnounceMessage(msg);
    setTimeout(() => setAnnounceMessage(''), 100);
  }, []);

  // ══════════════════════════════════════════════════════════
  // DRAG & DROP (unchanged logic, enhanced accessibility)
  // ══════════════════════════════════════════════════════════
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  }, []);

  // ══════════════════════════════════════════════════════════
  // FILE VALIDATION (enhanced with better error messages)
  // ══════════════════════════════════════════════════════════
  const validateAndSetFile = useCallback((f) => {
    const ext = f.name.split('.').pop().toLowerCase();
    const validExtensions = ['csv', 'xlsx', 'xls'];
    
    if (!validExtensions.includes(ext)) {
      setStatus('error');
      const errorMsg = `Invalid file type. Please upload a ${validExtensions.map(e => `.${e}`).join(', ')} file.`;
      setMessage(errorMsg);
      announce(errorMsg);
      return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (f.size > maxSize) {
      setStatus('error');
      const errorMsg = 'File too large. Maximum size is 10 MB.';
      setMessage(errorMsg);
      announce(errorMsg);
      return;
    }
    
    setFile(f);
    setStatus('idle');
    setMessage('');
    setReport('');
    setShowReport(false);
    announce(`File ${f.name} selected, ready to upload`);
  }, [announce]);

  const removeFile = useCallback(() => {
    setFile(null);
    setStatus('idle');
    setMessage('');
    setReport('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    announce('File removed');
  }, [announce]);

  // ══════════════════════════════════════════════════════════
  // FORM SUBMISSION (unchanged core logic, enhanced feedback)
  // ══════════════════════════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus('error');
      const errorMsg = 'Please enter a valid email address.';
      setMessage(errorMsg);
      announce(errorMsg);
      return;
    }

    setStatus('uploading');
    setMessage('');
    setReport('');
    setShowReport(false);
    announce('Processing your data, please wait');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('email', email);

      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again.');
      }

      setStatus('success');
      const successMsg = data.message || `Report sent to ${email}`;
      setMessage(successMsg);
      setReport(data.report || '');
      announce(`Success! ${successMsg}`);
    } catch (err) {
      setStatus('error');
      const errorMsg = err.message || 'Network error. Please check your connection.';
      setMessage(errorMsg);
      announce(`Error: ${errorMsg}`);
    }
  };

  // ══════════════════════════════════════════════════════════
  // MEMOIZED DERIVED STATE (performance optimization)
  // ══════════════════════════════════════════════════════════
  const isDisabled = useMemo(
    () => !file || !email || status === 'uploading',
    [file, email, status]
  );

  const currentStep = useMemo(
    () => !file ? 1 : status === 'success' ? 3 : 2,
    [file, status]
  );

  const formatFileSize = useCallback((bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // ══════════════════════════════════════════════════════════
  // ACCESSIBILITY CONTROLS
  // ══════════════════════════════════════════════════════════
  const toggleHighContrast = useCallback(() => {
    setHighContrast(prev => {
      const newValue = !prev;
      announce(`High contrast mode ${newValue ? 'enabled' : 'disabled'}`);
      return newValue;
    });
  }, [announce]);

  const cycleFontSize = useCallback(() => {
    setFontSize(prev => {
      const sizes = ['small', 'medium', 'large'];
      const currentIndex = sizes.indexOf(prev);
      const nextIndex = (currentIndex + 1) % sizes.length;
      const newSize = sizes[nextIndex];
      announce(`Font size changed to ${newSize}`);
      return newSize;
    });
  }, [announce]);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion(prev => {
      const newValue = !prev;
      announce(`Animations ${newValue ? 'disabled' : 'enabled'}`);
      return newValue;
    });
  }, [announce]);

  // ══════════════════════════════════════════════════════════
  // KEYBOARD NAVIGATION
  // ══════════════════════════════════════════════════════════
  const handleKeyPress = useCallback((e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }, []);

  return (
    <div 
      className={`app ${highContrast ? 'high-contrast' : ''} font-${fontSize} ${reducedMotion ? 'reduce-motion' : ''}`}
      data-theme="balanced"
    >
      {/* ══════════════════════════════════════════════════════ */}
      {/* ACCESSIBILITY: SKIP LINK */}
      {/* ══════════════════════════════════════════════════════ */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* ══════════════════════════════════════════════════════ */}
      {/* ACCESSIBILITY: SCREEN READER ANNOUNCEMENTS */}
      {/* ══════════════════════════════════════════════════════ */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      {/* ══════════════════════════════════════════════════════ */}
      {/* HEADER with A11Y Controls */}
      {/* ══════════════════════════════════════════════════════ */}
      <header className="header" role="banner">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon" aria-hidden="true">🐇</div>
            <span className="logo-text">RabbitAI</span>
          </div>
          <span className="header-badge" aria-label="Version 1.0, Sales Report Engine">
            v1.0 — Sales Report Engine
          </span>
        </div>

        {/* Accessibility Controls */}
        <nav className="a11y-controls" aria-label="Accessibility settings">
          <button
            onClick={toggleHighContrast}
            className="a11y-btn"
            aria-pressed={highContrast}
            title="Toggle high contrast mode"
            aria-label={`High contrast mode ${highContrast ? 'on' : 'off'}`}
          >
            {highContrast ? '◐' : '◑'}
          </button>
          <button
            onClick={cycleFontSize}
            className="a11y-btn"
            title="Change font size"
            aria-label={`Current font size: ${fontSize}`}
          >
            A{fontSize === 'small' ? '⁻' : fontSize === 'large' ? '⁺' : ''}
          </button>
          <button
            onClick={toggleReducedMotion}
            className="a11y-btn"
            aria-pressed={reducedMotion}
            title="Toggle animations"
            aria-label={`Animations ${reducedMotion ? 'off' : 'on'}`}
          >
            {reducedMotion ? '⏸' : '▶'}
          </button>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ══════════════════════════════════════════════════════ */}
      <main className="main" id="main-content" role="main">
        <div className="hero">
          <h1>
            Turn Data Into <span className="gradient-text">Insights</span>
          </h1>
          <p className="hero-description">
            Upload your sales data and let AI craft a professional narrative report — delivered straight to your inbox.
          </p>
        </div>

        {/* Progress Steps */}
        <nav className="steps" aria-label="Progress steps" role="navigation">
          <div 
            className={`step ${currentStep >= 1 ? (currentStep > 1 ? 'done' : 'active') : ''}`}
            aria-current={currentStep === 1 ? 'step' : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {currentStep > 1 ? '✓' : '1'}
            </span>
            <span className="step-label">Upload File</span>
          </div>
          <div 
            className={`step ${currentStep >= 2 ? (currentStep > 2 ? 'done' : 'active') : ''}`}
            aria-current={currentStep === 2 ? 'step' : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {currentStep > 2 ? '✓' : '2'}
            </span>
            <span className="step-label">Enter Email</span>
          </div>
          <div 
            className={`step ${currentStep >= 3 ? 'done' : ''}`}
            aria-current={currentStep === 3 ? 'step' : undefined}
          >
            <span className="step-number" aria-hidden="true">
              {currentStep >= 3 ? '✓' : '3'}
            </span>
            <span className="step-label">Get Report</span>
          </div>
        </nav>

        {/* Card */}
        <form className="card" onSubmit={handleSubmit} aria-labelledby="form-title">
          <h2 id="form-title" className="sr-only">Upload and analyze sales data</h2>

          {/* Upload Zone */}
          <div
            className={`upload-zone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyPress={(e) => handleKeyPress(e, () => fileInputRef.current?.click())}
            id="upload-zone"
            role="button"
            tabIndex={0}
            aria-label={file ? `File selected: ${file.name}. Press Enter to change file.` : 'Upload file. Press Enter to browse.'}
            aria-describedby="upload-instructions"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files[0]) validateAndSetFile(e.target.files[0]);
              }}
              id="file-input"
              aria-label="File upload input"
            />
            <div className="upload-icon" aria-hidden="true">
              {file ? '✓' : '↑'}
            </div>
            {file ? (
              <>
                <h3 className="file-name">{file.name}</h3>
                <p className="file-size">{formatFileSize(file.size)}</p>
                <div className="file-info" onClick={(e) => e.stopPropagation()}>
                  <span aria-hidden="true">✓</span> Ready to analyze
                  <button 
                    type="button" 
                    onClick={removeFile} 
                    className="remove-file-btn"
                    title="Remove file" 
                    id="remove-file-btn"
                    aria-label={`Remove file ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Drop your file here or click to browse</h3>
                <p id="upload-instructions">.CSV or .XLSX — up to 10 MB</p>
              </>
            )}
          </div>

          {/* Email Input */}
          <div className="form-group">
            <label htmlFor="email-input" className="form-label">
              Recipient Email
            </label>
            <div className="input-wrapper">
              <span className="input-icon" aria-hidden="true">✉</span>
              <input
                type="email"
                id="email-input"
                className="form-input"
                placeholder="analyst@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'uploading'}
                required
                aria-required="true"
                aria-invalid={status === 'error' && !email ? 'true' : 'false'}
                aria-describedby={status === 'error' ? 'email-error' : undefined}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="submit-btn" 
            disabled={isDisabled} 
            id="submit-btn"
            aria-busy={status === 'uploading'}
            aria-describedby={isDisabled ? 'submit-disabled-reason' : undefined}
          >
            {status === 'uploading' ? (
              <>
                <div className="spinner" role="status" aria-label="Loading" />
                <span>Analyzing & Sending…</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">🚀</span>
                <span>Generate & Send Report</span>
              </>
            )}
          </button>
          {isDisabled && !file && (
            <span id="submit-disabled-reason" className="sr-only">
              Please upload a file to continue
            </span>
          )}
          {isDisabled && file && !email && (
            <span id="submit-disabled-reason" className="sr-only">
              Please enter an email address to continue
            </span>
          )}

          {/* Status Cards */}
          {status === 'uploading' && (
            <div 
              className="status-card loading" 
              role="status" 
              aria-live="polite"
              aria-label="Processing your data"
            >
              <span className="status-icon" aria-hidden="true">⏳</span>
              <div className="status-body">
                <h4>Processing Your Data</h4>
                <p>AI is analyzing your sales data. This usually takes 10–30 seconds…</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div 
              className="status-card success" 
              role="status" 
              aria-live="polite"
              aria-label="Report delivered successfully"
            >
              <span className="status-icon" aria-hidden="true">✅</span>
              <div className="status-body">
                <h4>Report Delivered!</h4>
                <p>{message}</p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div 
              className="status-card error" 
              role="alert" 
              aria-live="assertive"
              id="email-error"
            >
              <span className="status-icon" aria-hidden="true">⚠️</span>
              <div className="status-body">
                <h4>Something Went Wrong</h4>
                <p>{message}</p>
              </div>
            </div>
          )}

          {/* Report Preview */}
          {report && status === 'success' && (
            <div className="report-preview" role="region" aria-labelledby="report-preview-heading">
              <button
                type="button"
                className="report-toggle"
                onClick={() => {
                  setShowReport(!showReport);
                  announce(showReport ? 'Report preview collapsed' : 'Report preview expanded');
                }}
                id="toggle-report-btn"
                aria-expanded={showReport}
                aria-controls="report-content"
              >
                <span aria-hidden="true">{showReport ? '▾' : '▸'}</span>
                <span id="report-preview-heading">
                  {showReport ? 'Hide' : 'Preview'} Report
                </span>
              </button>
              {showReport && (
                <div
                  id="report-content"
                  className="report-content"
                  dangerouslySetInnerHTML={{ __html: report }}
                  role="article"
                  aria-label="Generated report content"
                />
              )}
            </div>
          )}
        </form>
      </main>

      {/* ══════════════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ══════════════════════════════════════════════════════ */}
      <footer className="footer" role="contentinfo">
        <p>Built by Trishna</p>
      </footer>
    </div>
  );
}

export default App;