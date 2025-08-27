document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('optimizer-form');
  const resultsSection = document.getElementById('results');
  const paywallSection = document.getElementById('paywall');
  const resumeOutput = document.getElementById('resumeOutput');
  const coverLetterOutput = document.getElementById('coverLetterOutput');
  const resumeDiff = document.getElementById('resumeDiff');
  const copyResumeBtn = document.getElementById('copyResume');
  const copyCoverBtn = document.getElementById('copyCover');
  const generateBtn = document.getElementById('generateBtn');
  // Store the original resume text for diffing
  let originalResume = '';

  // Check if the user already used their free optimization
  const freeUsed = localStorage.getItem('freeUsed');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    // If free optimization used, show paywall
    if (localStorage.getItem('freeUsed')) {
      resultsSection.style.display = 'none';
      paywallSection.style.display = 'block';
      return;
    }

    const resumeText = document.getElementById('resume').value.trim();
    const jobDescText = document.getElementById('jobdesc').value.trim();
    const tone = document.getElementById('tone').value;
    const style = document.getElementById('style').value;
    if (!resumeText) {
      alert('Please paste your résumé before generating.');
      return;
    }
    // Show loading state on button
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: resumeText, jobDesc: jobDescText, tone, style }),
      });
      if (!response.ok) {
        throw new Error('Server error');
      }
      const data = await response.json();
      resumeOutput.textContent = data.resume || '';
      coverLetterOutput.textContent = data.coverLetter || '';
      // Compute and display diff
      if (originalResume) {
        const diffHtml = computeDiff(originalResume, resumeOutput.textContent);
        resumeDiff.innerHTML = diffHtml;
      } else {
        resumeDiff.innerHTML = '';
      }
      resultsSection.style.display = 'block';
      paywallSection.style.display = 'none';
      // Mark that user has used their free optimization
      localStorage.setItem('freeUsed', 'true');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      alert('An error occurred while generating your content. Please try again later.');
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  });

  copyResumeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(resumeOutput.textContent)
      .then(() => {
        alert('Résumé copied to clipboard!');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        alert('Failed to copy résumé.');
      });
  });

  copyCoverBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(coverLetterOutput.textContent)
      .then(() => {
        alert('Cover letter copied to clipboard!');
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        alert('Failed to copy cover letter.');
      });
  });

  /**
   * Compute a simple diff between two strings and wrap additions in <mark> tags.
   * This is a naive word-level diff: words present in the new text but not in the
   * same order in the original text are highlighted. It does not perform
   * deletions or sophisticated diffing but provides visual indication of
   * changes.
   * @param {string} oldStr
   * @param {string} newStr
   * @returns {string}
   */
  function computeDiff(oldStr, newStr) {
    const oldWords = oldStr.split(/\s+/);
    const newWords = newStr.split(/\s+/);
    let j = 0;
    const diff = [];
    for (let i = 0; i < newWords.length; i++) {
      const newWord = newWords[i];
      if (j < oldWords.length && newWord === oldWords[j]) {
        diff.push(escapeHtml(newWord));
        j++;
      } else {
        diff.push('<mark>' + escapeHtml(newWord) + '</mark>');
      }
    }
    return diff.join(' ');
  }

  /**
   * Escape HTML special characters in a string.
   * @param {string} str
   * @returns {string}
   */
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Save the original resume whenever user types in the resume textarea
  document.getElementById('resume').addEventListener('input', (e) => {
    originalResume = e.target.value;
  });
});
