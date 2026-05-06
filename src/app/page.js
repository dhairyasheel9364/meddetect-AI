'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://djangopaid-man-meddetect-api.hf.space';

const SCAN_ENGINES = [
  { id: 'brain',  label: 'Brain MRI Engine',  accent: true  },
  { id: 'kidney', label: 'Kidney CT Engine',   accent: false },
];

const ENGINE_CLASSES = {
  brain:  ['Glioma', 'Meningioma', 'Normal', 'Pituitary'],
  kidney: ['Cyst', 'Normal', 'Stone', 'Tumor'],
};

const CLASS_DESCRIPTIONS = {
  Glioma:      'A type of tumor that starts in the glial cells of the brain.',
  Meningioma:  'A tumor arising from the meninges surrounding the brain and spinal cord.',
  Pituitary:   'A tumor forming in the pituitary gland at the base of the brain.',
  Normal:      'No significant abnormalities detected in the scan.',
  Cyst:        'A fluid-filled sac within the kidney.',
  Stone:       'Calcified mineral deposits within the kidney (nephrolithiasis).',
  Tumor:       'An abnormal growth of cells detected in the kidney tissue.',
};

export default function Home() {
  const [activeEngine, setActiveEngine] = useState('brain');
  const [selectedFile, setSelectedFile]   = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [isAnalyzing, setIsAnalyzing]     = useState(false);
  const [result, setResult]               = useState(null);
  const [error, setError]                 = useState(null);
  const [showGradCam, setShowGradCam]     = useState(false);
  const [dragActive, setDragActive]       = useState(false);

  const fileInputRef = useRef(null);

  // ── File handling ────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (JPG, PNG, BMP).');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setShowGradCam(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver  = (e) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = ()  => setDragActive(false);

  // ── Engine switch ────────────────────────────────────────────────
  const switchEngine = (engineId) => {
    setActiveEngine(engineId);
    setResult(null);
    setError(null);
    setShowGradCam(false);
  };

  // ── Analyze ──────────────────────────────────────────────────────
  const analyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('scan_type', activeEngine);
    formData.append('gradcam', 'true');

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Server error ${res.status}`);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const confidenceValue = result
    ? parseFloat(result.confidence_raw || result.confidence)
    : 0;

  const allProbs = result?.all_probabilities || {};

  return (
    <div className={styles.app}>
      {/* ── Header ──────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <h1 className={styles.brandName}>MedDetect AI</h1>
            <p className={styles.brandSub}>MEDICAL IMAGE DIAGNOSTIC ANALYSIS</p>
          </div>
        </div>

        <nav className={styles.engineNav}>
          {SCAN_ENGINES.map((eng) => (
            <button
              key={eng.id}
              className={`${styles.engineBtn} ${activeEngine === eng.id ? styles.engineBtnActive : ''}`}
              onClick={() => switchEngine(eng.id)}
            >
              {eng.label}
            </button>
          ))}
        </nav>
      </header>

      <div className={styles.divider} />

      {/* ── Main ────────────────────────────────────────── */}
      <main className={styles.main}>
        {/* Input Panel */}
        <section className={styles.inputPanel}>
          <p className={styles.panelLabel}>INPUT TERMINAL</p>

          <div
            className={`${styles.dropzone} ${dragActive ? styles.dropzoneActive : ''} ${previewUrl ? styles.dropzoneHasImage : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Scan preview" className={styles.previewImg} />
            ) : (
              <div className={styles.dropzonePlaceholder}>
                <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Select medical scan</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className={styles.hiddenInput}
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          <button
            className={`${styles.analyzeBtn} ${!selectedFile || isAnalyzing ? styles.analyzeBtnDisabled : ''}`}
            onClick={analyze}
            disabled={!selectedFile || isAnalyzing}
          >
            {isAnalyzing ? (
              <span className={styles.analyzeLoading}>
                <span className={styles.spinner} />
                Analyzing...
              </span>
            ) : 'Start Diagnostic'}
          </button>
        </section>

        {/* Output Panel */}
        <section className={styles.outputPanel}>
          {!result && !error && !isAnalyzing && (
            <div className={styles.awaitingState}>
              <svg className={styles.awaitingIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <p className={styles.awaitingText}>AWAITING DIAGNOSTIC DATA</p>
            </div>
          )}

          {isAnalyzing && (
            <div className={styles.awaitingState}>
              <div className={styles.analyzingPulse}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p className={styles.awaitingText}>PROCESSING SCAN...</p>
            </div>
          )}

          {error && !isAnalyzing && (
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠</div>
              <p className={styles.errorTitle}>Analysis Failed</p>
              <p className={styles.errorMsg}>{error}</p>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className={styles.reportContainer}>
              {/* Report Header */}
              <div className={styles.reportHeader}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span>DIAGNOSTIC REPORT</span>
              </div>

              {/* Primary Finding */}
              <div className={styles.primaryFinding}>
                <p className={styles.findingLabel}>PRIMARY FINDING</p>
                <h2 className={styles.findingValue}>{result.diagnosis}</h2>
              </div>

              {/* Confidence */}
              <div className={styles.confidenceSection}>
                <div className={styles.confidenceHeader}>
                  <span className={styles.confidenceLabel}>CONFIDENCE SCORE</span>
                  <span className={styles.confidenceValue}>{result.confidence}</span>
                </div>
                <div className={styles.confidenceBar}>
                  <div
                    className={styles.confidenceFill}
                    style={{ width: `${Math.min(confidenceValue, 100)}%` }}
                  />
                </div>
              </div>

              {/* All Probabilities */}
              <div className={styles.probGrid}>
                {Object.entries(allProbs).map(([label, pct]) => (
                  <div key={label} className={`${styles.probItem} ${label === result.diagnosis ? styles.probItemActive : ''}`}>
                    <div className={styles.probItemHeader}>
                      <span className={styles.probLabel}>{label}</span>
                      <span className={styles.probPct}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className={styles.probBar}>
                      <div className={styles.probFill} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Clinical Summary */}
              <div className={styles.clinicalSummary}>
                <div className={styles.summaryHeader}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                  <span>CLINICAL SUMMARY</span>
                </div>
                <p>
                  The internal vision engine has analyzed the provided{' '}
                  {activeEngine === 'brain' ? 'brain scan' : 'kidney CT'}.
                  Visual markers identified are highly indicative of{' '}
                  <strong>{result.diagnosis}</strong> with a statistical probability of{' '}
                  {result.confidence}. {CLASS_DESCRIPTIONS[result.diagnosis]}{' '}
                  This assessment should be confirmed via clinical study.
                </p>
              </div>

              {/* Grad-CAM Section */}
              {result.gradcam_image && (
                <div className={styles.gradcamSection}>
                  <button
                    className={styles.gradcamToggle}
                    onClick={() => setShowGradCam(!showGradCam)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" /><circle cx="11" cy="11" r="3" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    {showGradCam ? 'Hide Grad-CAM' : 'Show Grad-CAM Heatmap'}
                    <svg
                      className={`${styles.chevron} ${showGradCam ? styles.chevronUp : ''}`}
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {showGradCam && (
                    <div className={styles.gradcamContainer}>
                      <p className={styles.gradcamNote}>
                        Gradient-weighted Class Activation Map — regions highlighted in red/yellow
                        contributed most to the <strong>{result.diagnosis}</strong> prediction.
                      </p>
                      <div className={styles.gradcamImages}>
                        <div className={styles.gradcamItem}>
                          <p className={styles.gradcamCaption}>Original Scan</p>
                          <img src={previewUrl} alt="Original" className={styles.gradcamImg} />
                        </div>
                        <div className={styles.gradcamItem}>
                          <p className={styles.gradcamCaption}>Grad-CAM Overlay</p>
                          <img src={result.gradcam_image} alt="Grad-CAM" className={styles.gradcamImg} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
