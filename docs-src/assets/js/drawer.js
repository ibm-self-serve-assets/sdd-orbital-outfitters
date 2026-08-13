// ==================== CONTACT DRAWER ====================
const drawer = document.getElementById('contactDrawer');
const overlay = document.getElementById('drawerOverlay');

function bindDrawer(options) {
  const trigger = document.getElementById(options.triggerId);
  const panel = document.getElementById(options.drawerId);
  const panelOverlay = document.getElementById(options.overlayId);
  const closeButton = document.getElementById(options.closeId);
  const cancelButton = options.cancelId ? document.getElementById(options.cancelId) : null;

  if (!trigger || !panel || !panelOverlay || !closeButton) return;

  function openDrawer() {
    panel.classList.add('is-open');
    panelOverlay.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('drawer-open');
  }

  function closeDrawer() {
    panel.classList.remove('is-open');
    panelOverlay.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('drawer-open');
  }

  trigger.addEventListener('click', openDrawer);
  closeButton.addEventListener('click', closeDrawer);
  panelOverlay.addEventListener('click', closeDrawer);

  if (cancelButton) {
    cancelButton.addEventListener('click', closeDrawer);
  }
}

bindDrawer({
  triggerId: 'contactBtn',
  drawerId: 'contactDrawer',
  overlayId: 'drawerOverlay',
  closeId: 'drawerClose',
  cancelId: 'drawerCancel'
});

bindDrawer({
  triggerId: 'demoExplainerBtn',
  drawerId: 'demoExplainerDrawer',
  overlayId: 'demoExplainerOverlay',
  closeId: 'demoExplainerClose'
});

// ==================== DEMO SCRIPT SAVE BUTTONS ====================
function triggerDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function flashSaved(btn) {
  btn.classList.add('is-saved');
  setTimeout(() => btn.classList.remove('is-saved'), 2000);
}

// Convert inner HTML to readable plain text preserving structure.
// Handles: div/p/h1-h6, ol (with start attr), ul, li (nested), br, hr,
//          code, b/strong/i/em, a, &nbsp;, whitespace-only text nodes.
function htmlToPlainText(el) {
  const clone = el.cloneNode(true);

  // Remove divs whose only non-whitespace children are all internal anchor links
  // (nav pill rows). Safe: won't remove a div that has any real text content.
  clone.querySelectorAll('div').forEach(div => {
    const meaningful = Array.from(div.childNodes).filter(n =>
      !(n.nodeType === Node.TEXT_NODE && n.textContent.trim() === '')
    );
    if (
      meaningful.length > 0 &&
      meaningful.every(n => n.nodeName === 'A' && (n.getAttribute('href') || '').startsWith('#'))
    ) {
      div.remove();
    }
  });

  // Block tags — emit a single newline before and after their content.
  // We do NOT double-newline here; collapsing happens in post-processing.
  const BLOCKS = new Set(['H1','H2','H3','H4','H5','H6','P','DIV','SECTION',
    'ARTICLE','BLOCKQUOTE','FIGURE','FIGCAPTION','HEADER','FOOTER','MAIN','NAV','ASIDE']);

  // Inline pass-through tags — just recurse, emit no surrounding whitespace.
  const INLINE = new Set(['SPAN','A','B','STRONG','I','EM','U','MARK','SMALL',
    'LABEL','ABBR','CITE','TIME','S','DEL','INS']);

  // Skip these entirely — they produce no readable text output.
  const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','SVG','IMG','BUTTON','INPUT','SELECT','TEXTAREA']);

  // walk(node, parts, olStack, listDepth)
  //   olStack   – array of OL counters, one entry per nested OL level currently open.
  //               UL resets this to [] for its children so nested bullets don't number.
  //   listDepth – total list nesting depth (OL + UL combined), used for indentation.
  function walk(node, parts, olStack, listDepth) {
    // Text node
    if (node.nodeType === Node.TEXT_NODE) {
      // Normalise &nbsp; and collapse horizontal whitespace runs
      parts.push(node.textContent.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' '));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const tag = node.tagName;
    if (SKIP.has(tag)) return;

    if (tag === 'HR') { parts.push('\n────────────────────────────────────────\n'); return; }
    if (tag === 'BR') { parts.push('\n'); return; }

    if (tag === 'CODE') {
      parts.push('`');
      node.childNodes.forEach(c => walk(c, parts, olStack, listDepth));
      parts.push('`');
      return;
    }

    if (tag === 'OL') {
      const start = parseInt(node.getAttribute('start') || '1', 10);
      // Push a new counter for this OL level; copy the outer stack so siblings
      // of this OL are unaffected.
      const childStack = [...olStack, start - 1];
      node.childNodes.forEach(c => walk(c, parts, childStack, listDepth + 1));
      return;
    }

    if (tag === 'UL') {
      // Pass an EMPTY olStack to children: a UL always produces bullets,
      // regardless of whether it is nested inside an OL.
      node.childNodes.forEach(c => walk(c, parts, [], listDepth + 1));
      return;
    }

    if (tag === 'LI') {
      const depth = Math.max(listDepth - 1, 0);
      const indent = '  '.repeat(depth);
      if (olStack.length > 0) {
        olStack[olStack.length - 1]++;
        parts.push('\n' + indent + olStack[olStack.length - 1] + '. ');
      } else {
        parts.push('\n' + indent + '• ');
      }
      // Walk children; any nested OL/UL will add its own newlines per-item
      node.childNodes.forEach(c => walk(c, parts, olStack, listDepth));
      return;
    }

    if (INLINE.has(tag)) {
      node.childNodes.forEach(c => walk(c, parts, olStack, listDepth));
      return;
    }

    if (BLOCKS.has(tag)) {
      parts.push('\n');
      node.childNodes.forEach(c => walk(c, parts, olStack, listDepth));
      parts.push('\n');
      return;
    }

    // Fallback — unknown tags: just recurse
    node.childNodes.forEach(c => walk(c, parts, olStack, listDepth));
  }

  const parts = [];
  walk(clone, parts, [], 0);

  return parts.join('')
    .replace(/[ \t]*\n[ \t]*/g, '\n')  // strip spaces/tabs around every newline
    .replace(/\n{3,}/g, '\n\n')        // collapse 3+ consecutive newlines → one blank line
    .trim();
}

const saveTextBtn = document.getElementById('demoExplainerSaveTextBtn');
if (saveTextBtn) {
  saveTextBtn.addEventListener('click', function () {
    const body = document.getElementById('demoExplainerBody');
    const text = htmlToPlainText(body);
    triggerDownload('demo-script.txt', text, 'text/plain;charset=utf-8');
    flashSaved(saveTextBtn);
  });
}

const saveHtmlBtn = document.getElementById('demoExplainerSaveHtmlBtn');
if (saveHtmlBtn) {
  saveHtmlBtn.addEventListener('click', function () {
    const body = document.getElementById('demoExplainerBody');
    const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
      + '<title>Demo Script</title>\n'
      + '<style>body{font-family:-apple-system,"Segoe UI",sans-serif;max-width:760px;margin:40px auto;padding:0 24px;font-size:14px;line-height:1.6;color:#1f2328}'
      + 'ol,ul{padding-left:20px}li{margin-bottom:4px}hr{border:none;border-top:1px solid #e5e7eb;margin:16px 0}'
      + '</style>\n</head>\n<body>\n'
      + body.innerHTML
      + '\n</body>\n</html>';
    triggerDownload('demo-script.html', html, 'text/html;charset=utf-8');
    flashSaved(saveHtmlBtn);
  });
}

const demoSectionNavLinks = Array.from(document.querySelectorAll('.demo-section-nav-link'));
const demoSections = demoSectionNavLinks
  .map((link) => {
    const targetId = link.getAttribute('href');
    if (!targetId || !targetId.startsWith('#')) {
      return null;
    }

    const section = document.querySelector(targetId);
    if (!section) {
      return null;
    }

    return { link, section };
  })
  .filter(Boolean);

if (demoSections.length > 0) {
  let hoverSuppressed = false;

  const setActiveDemoSection = (activeLink) => {
    demoSections.forEach(({ link }) => {
      const isActive = link === activeLink;
      link.classList.toggle('is-active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      if (hoverSuppressed) return;

      const visibleEntries = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visibleEntries.length === 0) {
        return;
      }

      const activeEntry = visibleEntries[0];
      const activeSection = demoSections.find(({ section }) => section === activeEntry.target);
      if (activeSection) {
        setActiveDemoSection(activeSection.link);
      }
    },
    {
      rootMargin: '-112px 0px -55% 0px',
      threshold: [0.2, 0.4, 0.6]
    }
  );

  demoSections.forEach(({ section }) => observer.observe(section));

  // Hover on a demo-step section activates matching nav item
  demoSections.forEach(({ link, section }) => {
    section.addEventListener('mouseenter', () => {
      hoverSuppressed = true;
      setActiveDemoSection(link);
    });
    section.addEventListener('mouseleave', () => {
      hoverSuppressed = false;
    });
  });
}
