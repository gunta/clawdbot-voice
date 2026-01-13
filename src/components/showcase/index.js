/**
 * CLAWD OS1 - Component Laboratory
 * Revolutionary Web Components for a Futuristic OS
 * Migrated to Preact + HTM + Signals
 * 
 * This file imports all showcase components from their individual folders
 */

// Import all showcase components
import './breath-button/index.js';
import './pulse-badge/index.js';
import './fluid-glass/index.js';
import './phase-toggle/index.js';
import './spectrum-slider/index.js';
import './nerve-input/index.js';
import './void-select/index.js';
import './ripple-list/index.js';
import './orbital-menu/index.js';
import './gravity-card/index.js';
import './hologram-avatar/index.js';
import './aurora-progress/index.js';
import './prism-tabs/index.js';
import './echo-tooltip/index.js';
import './membrane-modal/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE INTERACTIONS
// ═══════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  const navNodes = document.querySelectorAll('.nav-node');
  const sections = document.querySelectorAll('.lab-section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sectionId = entry.target.id;
        navNodes.forEach(node => {
          if (node.dataset.section === sectionId) {
            node.classList.add('active');
          } else {
            node.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));

  navNodes.forEach(node => {
    node.addEventListener('click', () => {
      const targetId = node.dataset.section;
      const targetSection = document.getElementById(targetId);
      targetSection?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const modalTrigger = document.getElementById('membraneModalTrigger');
  const modal = document.getElementById('membraneModal');

  modalTrigger?.addEventListener('breath-click', () => {
    modal?.open();
  });

  modal?.querySelector('breath-button')?.addEventListener('breath-click', () => {
    modal?.close();
  });

  const auroraProgress = document.getElementById('auroraProgress1');
  let progressValue = 67;
  
  auroraProgress?.addEventListener('click', () => {
    progressValue = (progressValue + 10) % 110;
    if (progressValue > 100) progressValue = 0;
    auroraProgress.setValue(progressValue);
  });

  console.log('[Laboratory] Component showcase initialized with HTM');
});
