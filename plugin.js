/**
 * Smart Related Notes - Thymer Plugin
 *
 * Shows related notes in a custom panel based on TF-IDF cosine similarity,
 * shared references, shared tags, and title similarity.
 * Updates as the user navigates between notes via polling.
 */

const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being", "below",
  "between", "both", "but", "by", "can", "could", "did", "do", "does", "doing",
  "down", "during", "each", "few", "for", "from", "further", "get", "got", "had",
  "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
  "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
  "just", "ll", "me", "might", "more", "most", "must", "my", "myself", "no",
  "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other", "our",
  "ours", "ourselves", "out", "over", "own", "re", "s", "same", "she", "should",
  "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "ve", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "would", "you", "your", "yours", "yourself", "yourselves", "also", "like",
  "well", "back", "even", "still", "way", "take", "since", "another", "however",
  "two", "three", "new", "one", "us", "much", "need", "may", "make", "made",
  "many", "say", "said", "go", "going", "know", "see", "look", "thing", "things",
  "think", "use", "used", "using", "work", "want", "day", "time", "good", "come",
  "first", "last", "long", "great", "little", "right", "old", "big", "high",
  "different", "small", "large", "next", "early", "young", "important", "few",
  "public", "bad", "same", "able", "http", "https", "www", "com"
]);

const RELATED_NOTES_CSS = `
  .srn-view {
    padding: 24px;
    font-family: var(--font-family);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-default);
    overflow: hidden;
  }

  .srn-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    flex-shrink: 0;
  }

  .srn-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-default);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .srn-title-icon {
    color: var(--accent-color);
  }

  .srn-refresh-btn {
    padding: 6px 10px;
    background: var(--bg-hover);
    border: 1px solid var(--border-default);
    border-radius: 6px;
    color: var(--text-default);
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s ease;
  }

  .srn-refresh-btn:hover {
    background: var(--bg-active);
    border-color: var(--border-strong);
  }

  .srn-results {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .srn-card {
    background: var(--bg-hover);
    border: 1px solid var(--border-default);
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.15s ease;
    padding: 12px 14px;
  }

  .srn-card:hover {
    border-color: var(--accent-color);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .srn-card-score-bar {
    height: 3px;
    border-radius: 2px;
    background: var(--bg-active);
    margin-bottom: 10px;
    overflow: hidden;
  }

  .srn-card-score-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent-color);
    transition: width 0.3s ease;
  }

  .srn-card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  .srn-card-icon {
    color: var(--accent-color);
    flex-shrink: 0;
    display: flex;
    align-items: center;
  }

  .srn-card-title {
    font-weight: 500;
    color: var(--text-default);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .srn-card-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--accent-color);
    background: var(--bg-active);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
    cursor: default;
    position: relative;
  }

  .srn-card-badge .srn-tooltip {
    display: none;
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 6px;
    background: var(--bg-hover);
    border: 1px solid var(--border-default);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 400;
    color: var(--text-default);
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    line-height: 1.6;
  }

  .srn-card-badge:hover .srn-tooltip {
    display: block;
  }

  .srn-card-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-muted);
    flex-wrap: wrap;
  }

  .srn-card-collection {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .srn-card-tag {
    color: var(--accent-color);
    font-size: 11px;
  }

  .srn-card-refs {
    font-size: 11px;
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .srn-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    gap: 12px;
    text-align: center;
  }

  .srn-empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .srn-empty-text {
    font-size: 14px;
    line-height: 1.5;
  }

  .srn-active-note {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 12px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .srn-active-note strong {
    color: var(--text-default);
    font-weight: 500;
  }
`;

// Signal weights for combined scoring
const WEIGHT_CONTENT = 0.25;
const WEIGHT_TITLE_MENTION = 0.30;
const WEIGHT_REFS = 0.20;
const WEIGHT_TAGS = 0.15;
const WEIGHT_TITLE = 0.10;
const SCORE_THRESHOLD = 0.05;

class Plugin extends AppPlugin {

  onLoad() {
    this.ui.injectCSS(RELATED_NOTES_CSS);

    // Index state
    this._index = new Map();
    this._idf = new Map();
    this._indexVersion = 0;
    this._isIndexing = false;

    // Panel/polling state
    this._panelElement = null;
    this._panel = null;
    this._pollTimer = null;
    this._lastActiveGuid = null;
    this._lastResults = null;

    const config = this.getConfiguration();
    this._maxResults = config.custom?.maxResults || 10;
    this._pollIntervalMs = config.custom?.pollIntervalMs || 2000;

    // Register custom panel type
    this.ui.registerCustomPanelType("smart-related-notes", (panel) => {
      this._panel = panel;
      this._panelElement = panel.getElement();
      if (this._panelElement) {
        panel.setTitle("Related Notes");
        this._renderPanel();
        this._startPolling();
      }
    });

    // Sidebar item
    this.ui.addSidebarItem({
      icon: "bulb",
      label: "Related Notes",
      tooltip: "Show related notes",
      onClick: () => this._openPanel(),
    });

    // Command palette commands
    this.ui.addCommandPaletteCommand({
      label: "Show Related Notes",
      icon: "bulb",
      onSelected: () => this._openPanel(),
    });

    this.ui.addCommandPaletteCommand({
      label: "Rebuild Related Notes Index",
      icon: "refresh",
      onSelected: () => this._rebuildIndex(true),
    });

    // Deferred index build
    setTimeout(() => this._rebuildIndex(false), 1500);
  }

  onUnload() {
    this._stopPolling();
    if (this._index) this._index.clear();
    if (this._idf) this._idf.clear();
    this._panelElement = null;
    this._panel = null;
    this._lastActiveGuid = null;
    this._lastResults = null;
  }

  // ─── Panel Management ──────────────────────────────────────────

  async _openPanel() {
    const panel = await this.ui.createPanel();
    if (panel) {
      panel.navigateToCustomType("smart-related-notes");
    }
  }

  _startPolling() {
    this._stopPolling();
    this._checkActiveRecord();
    this._pollTimer = setInterval(() => this._checkActiveRecord(), this._pollIntervalMs);
  }

  _stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  _checkActiveRecord() {
    if (!this._panelElement) return;

    // Try to find the active record from other panels (not our own custom panel)
    let activeRecord = null;

    // First, check the globally active panel
    const activePanel = this.ui.getActivePanel();
    if (activePanel && activePanel !== this._panel) {
      activeRecord = activePanel.getActiveRecord();
    }

    // If the active panel is our panel (or has no record), scan all panels
    if (!activeRecord) {
      const panels = this.ui.getPanels();
      for (const p of panels) {
        if (p === this._panel) continue;
        const rec = p.getActiveRecord();
        if (rec) {
          activeRecord = rec;
          break;
        }
      }
    }

    if (!activeRecord) {
      if (this._lastActiveGuid !== null) {
        this._lastActiveGuid = null;
        this._lastResults = null;
        this._renderPanel();
      }
      return;
    }

    const guid = activeRecord.guid;
    if (guid === this._lastActiveGuid) return;

    this._lastActiveGuid = guid;
    this._lastResults = this._computeRelated(activeRecord);
    this._renderPanel();
  }

  // ─── Indexing Engine ───────────────────────────────────────────

  async _rebuildIndex(showToaster) {
    if (this._isIndexing) return;
    this._isIndexing = true;
    this._indexVersion++;
    const buildVersion = this._indexVersion;

    if (showToaster) {
      this.ui.addToaster({
        title: "Related Notes",
        message: "Rebuilding index...",
        dismissible: true,
        autoDestroyTime: 2000,
      });
    }

    this._renderPanel();

    const newIndex = new Map();
    const docFreq = new Map();
    let totalDocs = 0;

    try {
      const collections = await this.data.getAllCollections();

      for (const collection of collections) {
        if (buildVersion !== this._indexVersion) return;

        const records = await collection.getAllRecords();
        const collectionName = collection.getName();
        const collectionIcon = collection.getConfiguration().icon;

        for (const record of records) {
          if (buildVersion !== this._indexVersion) return;

          const extracted = await this._extractContent(record);
          const tokens = this._tokenize(extracted.text);
          const tokenSet = new Set(tokens);

          // Track document frequency per unique term
          for (const term of tokenSet) {
            docFreq.set(term, (docFreq.get(term) || 0) + 1);
          }

          const title = record.getName() || "Untitled";
          const titleTokens = this._tokenize(title);

          newIndex.set(record.guid, {
            title,
            titleTokens,
            titleTokenSet: new Set(titleTokens),
            tokens,         // kept temporarily for TF-IDF, dropped after
            tokenSet,
            tfIdfVec: null,
            norm: 0,
            tags: extracted.tags,
            refGuids: extracted.refGuids,
            collectionName,
            collectionIcon,
          });

          totalDocs++;
        }
      }

      if (buildVersion !== this._indexVersion) return;

      // Compute IDF: log(totalDocs / docFreq)
      const idf = new Map();
      for (const [term, df] of docFreq) {
        idf.set(term, Math.log(totalDocs / df));
      }

      // Compute TF-IDF vectors + pre-compute norms, then drop raw tokens
      for (const [, doc] of newIndex) {
        doc.tfIdfVec = this._computeTfIdfVector(doc.tokens, idf);
        doc.norm = this._computeNorm(doc.tfIdfVec);
        doc.tokens = null; // free memory — tokenSet + tfIdfVec are sufficient
      }

      // Propagate references symmetrically: if A's refGuids contains B
      // (e.g. via back-references), ensure B's refGuids also contains A.
      // This captures property-level links (like Author = Cal Newport)
      // that getLineItems() doesn't see but getBackReferenceRecords() does.
      for (const [guidA, docA] of newIndex) {
        for (const refGuid of docA.refGuids) {
          const docB = newIndex.get(refGuid);
          if (docB) {
            docB.refGuids.add(guidA);
          }
        }
      }

      this._index = newIndex;
      this._idf = idf;

    } finally {
      if (buildVersion === this._indexVersion) {
        this._isIndexing = false;
      }
    }

    if (showToaster) {
      this.ui.addToaster({
        title: "Related Notes",
        message: `Index built: ${totalDocs} notes indexed.`,
        dismissible: true,
        autoDestroyTime: 3000,
      });
    }

    // Re-compute results for current active record
    if (this._lastActiveGuid) {
      const record = this.data.getRecord(this._lastActiveGuid);
      if (record) {
        this._lastResults = this._computeRelated(record);
      }
    }

    this._renderPanel();
  }

  async _extractContent(record) {
    const text = [];
    const tags = new Set();
    const refGuids = new Set();

    try {
      // Parallelize the two async calls per record
      const [lineItems, backRefs] = await Promise.all([
        record.getLineItems(),
        record.getBackReferenceRecords(),
      ]);

      for (const item of lineItems) {
        if (!item.segments) continue;

        for (const seg of item.segments) {
          switch (seg.type) {
            case "text":
            case "bold":
            case "italic":
            case "code":
              if (typeof seg.text === "string") {
                text.push(seg.text);
              }
              break;
            case "hashtag":
              if (typeof seg.text === "string") {
                tags.add(seg.text.toLowerCase());
                text.push(seg.text);
              }
              break;
            case "ref":
              if (seg.text?.guid) {
                refGuids.add(seg.text.guid);
              }
              break;
          }
        }
      }

      // Add back-references as incoming ref links
      for (const backRef of backRefs) {
        refGuids.add(backRef.guid);
      }
    } catch (e) {
      // Silently skip records that fail content extraction
    }

    // Extract text from property values (captures Author, Status, etc.)
    try {
      const props = record.getAllProperties();
      for (const prop of props) {
        const val = prop.text();
        if (val) text.push(val);
        const label = prop.choiceLabel();
        if (label) text.push(label);
      }
    } catch (e) {
      // Properties extraction is best-effort
    }

    // Include title in text corpus
    const title = record.getName() || "";
    if (title) {
      text.push(title);
    }

    return {
      text: text.join(" "),
      tags,
      refGuids,
    };
  }

  // ─── TF-IDF + Similarity ──────────────────────────────────────

  _tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, " ")
      .split(/\s+/)
      .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  }

  _computeTfIdfVector(tokens, idf) {
    const vec = new Map();
    if (tokens.length === 0) return vec;

    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }

    const totalTokens = tokens.length;
    for (const [term, count] of tf) {
      const idfVal = idf.get(term);
      if (idfVal !== undefined) {
        vec.set(term, (count / totalTokens) * idfVal);
      }
    }

    return vec;
  }

  _computeNorm(vec) {
    let sum = 0;
    for (const val of vec.values()) {
      sum += val * val;
    }
    return Math.sqrt(sum);
  }

  _cosineSimilarity(vecA, vecB, normA, normB) {
    if (normA === 0 || normB === 0) return 0;

    // Iterate over the smaller vector for dot product
    let smaller = vecA;
    let larger = vecB;
    if (vecA.size > vecB.size) {
      smaller = vecB;
      larger = vecA;
    }

    let dot = 0;
    for (const [term, valA] of smaller) {
      const valB = larger.get(term);
      if (valB !== undefined) {
        dot += valA * valB;
      }
    }

    return dot === 0 ? 0 : dot / (normA * normB);
  }

  _titleMentionScore(sourceTitleTokens, sourceTokenSet, candidateTitleTokens, candidateTokenSet) {
    // Bidirectional: does source title appear in candidate content, or vice versa?
    const forward = this._titleContainment(sourceTitleTokens, candidateTokenSet);
    const reverse = this._titleContainment(candidateTitleTokens, sourceTokenSet);
    return Math.max(forward, reverse);
  }

  _titleContainment(titleTokens, contentTokenSet) {
    if (titleTokens.length === 0) return 0;
    let found = 0;
    for (const t of titleTokens) {
      if (contentTokenSet.has(t)) found++;
    }
    return found / titleTokens.length;
  }

  _jaccardSimilarity(setA, setB) {
    if (setA.size === 0 && setB.size === 0) return 0;

    let intersection = 0;
    const smaller = setA.size <= setB.size ? setA : setB;
    const larger = setA.size <= setB.size ? setB : setA;

    for (const item of smaller) {
      if (larger.has(item)) intersection++;
    }

    const union = setA.size + setB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  // ─── Scoring ───────────────────────────────────────────────────

  _computeRelated(record) {
    if (this._index.size === 0) return [];

    const guid = record.guid;
    const sourceDoc = this._index.get(guid);

    let sourceVec, sourceNorm, sourceTags, sourceRefs;
    let sourceTitleTokens, sourceTitleTokenSet, sourceTokenSet;

    if (sourceDoc) {
      sourceVec = sourceDoc.tfIdfVec;
      sourceNorm = sourceDoc.norm;
      sourceTags = sourceDoc.tags;
      sourceRefs = sourceDoc.refGuids;
      sourceTitleTokens = sourceDoc.titleTokens;
      sourceTitleTokenSet = sourceDoc.titleTokenSet;
      sourceTokenSet = sourceDoc.tokenSet;
    } else {
      // Record not in index — use minimal signals
      const title = record.getName() || "";
      sourceTitleTokens = this._tokenize(title);
      sourceTitleTokenSet = new Set(sourceTitleTokens);
      sourceVec = new Map();
      sourceNorm = 0;
      sourceTags = new Set();
      sourceRefs = new Set();
      sourceTokenSet = new Set();
    }

    const results = [];

    for (const [docGuid, doc] of this._index) {
      if (docGuid === guid) continue;

      // 1. Content similarity (TF-IDF cosine) — uses pre-computed norms
      const contentScore = this._cosineSimilarity(sourceVec, doc.tfIdfVec, sourceNorm, doc.norm);

      // 2. Title mention (does either note's title appear in the other's content?)
      const titleMentionScore = this._titleMentionScore(
        sourceTitleTokens, sourceTokenSet,
        doc.titleTokens, doc.tokenSet
      );

      // 3. References: direct link (either direction) OR shared refs to third notes
      const directRef = (sourceRefs.has(docGuid) || doc.refGuids.has(guid)) ? 1.0 : 0;
      const sharedRefJaccard = this._jaccardSimilarity(sourceRefs, doc.refGuids);
      const refScore = Math.max(directRef, sharedRefJaccard);

      // 4. Shared tags (Jaccard)
      const tagScore = this._jaccardSimilarity(sourceTags, doc.tags);

      // 5. Title similarity (Jaccard of title word sets)
      const titleScore = this._jaccardSimilarity(sourceTitleTokenSet, doc.titleTokenSet);

      const combinedScore =
        WEIGHT_CONTENT * contentScore +
        WEIGHT_TITLE_MENTION * titleMentionScore +
        WEIGHT_REFS * refScore +
        WEIGHT_TAGS * tagScore +
        WEIGHT_TITLE * titleScore;

      if (combinedScore >= SCORE_THRESHOLD) {
        // Collect shared tags and shared ref count for display
        const sharedTags = [];
        for (const tag of sourceTags) {
          if (doc.tags.has(tag)) sharedTags.push(tag);
        }

        let sharedRefCount = 0;
        for (const ref of sourceRefs) {
          if (doc.refGuids.has(ref)) sharedRefCount++;
        }

        results.push({
          guid: docGuid,
          title: doc.title,
          collectionName: doc.collectionName,
          collectionIcon: doc.collectionIcon,
          score: combinedScore,
          contentScore,
          titleMentionScore,
          refScore,
          tagScore,
          titleScore,
          sharedTags,
          sharedRefCount,
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, this._maxResults);
  }

  // ─── UI Rendering ──────────────────────────────────────────────

  _renderPanel() {
    const container = this._panelElement;
    if (!container) return;

    container.innerHTML = "";

    const view = document.createElement("div");
    view.className = "srn-view";

    // Header
    const header = document.createElement("div");
    header.className = "srn-header";

    const title = document.createElement("div");
    title.className = "srn-title";
    title.innerHTML = `
      <span class="srn-title-icon">${this.ui.createIcon("bulb").outerHTML}</span>
      Related Notes
    `;

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "srn-refresh-btn";
    refreshBtn.innerHTML = `${this.ui.createIcon("refresh").outerHTML} Rebuild`;
    refreshBtn.title = "Rebuild index";
    refreshBtn.onclick = () => this._rebuildIndex(true);

    header.appendChild(title);
    header.appendChild(refreshBtn);
    view.appendChild(header);

    // State: indexing
    if (this._isIndexing) {
      view.appendChild(this._createStatusMessage("loader-2", "Building index..."));
      container.appendChild(view);
      return;
    }

    // State: no active record
    if (!this._lastActiveGuid) {
      view.appendChild(this._createStatusMessage("file-text", "Open a note to see related content."));
      container.appendChild(view);
      return;
    }

    // Active note indicator
    const sourceDoc = this._index.get(this._lastActiveGuid);
    if (sourceDoc) {
      const activeNote = document.createElement("div");
      activeNote.className = "srn-active-note";
      activeNote.innerHTML = `Showing results for <strong>${this.ui.htmlEscape(sourceDoc.title)}</strong>`;
      view.appendChild(activeNote);
    }

    // State: no results
    if (!this._lastResults || this._lastResults.length === 0) {
      const notInIndex = this._lastActiveGuid && !this._index.has(this._lastActiveGuid);
      if (notInIndex) {
        const msg = this._createStatusMessage("refresh", "This note isn't indexed yet. Click Rebuild to update the index.");
        view.appendChild(msg);
      } else {
        view.appendChild(this._createStatusMessage("mood-empty", "No related notes found."));
      }
      container.appendChild(view);
      return;
    }

    // Render result cards — score bars are relative to the top result
    const maxScore = this._lastResults[0].score;
    const resultsContainer = document.createElement("div");
    resultsContainer.className = "srn-results";

    for (const result of this._lastResults) {
      resultsContainer.appendChild(this._createResultCard(result, maxScore));
    }

    view.appendChild(resultsContainer);
    container.appendChild(view);
  }

  _createResultCard(result, maxScore) {
    const card = document.createElement("div");
    card.className = "srn-card";

    const pct = Math.round(result.score * 100);
    // Scale bar relative to top result so the best match fills the bar
    const barWidth = maxScore > 0 ? Math.round((result.score / maxScore) * 100) : 0;

    // Score bar
    const scoreBar = document.createElement("div");
    scoreBar.className = "srn-card-score-bar";
    const scoreFill = document.createElement("div");
    scoreFill.className = "srn-card-score-fill";
    scoreFill.style.width = `${barWidth}%`;
    scoreBar.appendChild(scoreFill);
    card.appendChild(scoreBar);

    // Top row: icon + title + badge
    const topRow = document.createElement("div");
    topRow.className = "srn-card-top";

    const iconEl = document.createElement("div");
    iconEl.className = "srn-card-icon";
    const icon = this.ui.createIcon(result.collectionIcon || "file-text");
    iconEl.appendChild(icon);

    const titleEl = document.createElement("div");
    titleEl.className = "srn-card-title";
    titleEl.textContent = result.title;

    const badge = document.createElement("div");
    badge.className = "srn-card-badge";
    badge.textContent = `${pct}%`;

    // Tooltip with signal breakdown
    const tooltip = document.createElement("div");
    tooltip.className = "srn-tooltip";
    tooltip.innerHTML = [
      `Content: ${Math.round(result.contentScore * 100)}%`,
      `Name mention: ${Math.round(result.titleMentionScore * 100)}%`,
      `References: ${Math.round(result.refScore * 100)}%`,
      `Tags: ${Math.round(result.tagScore * 100)}%`,
      `Title: ${Math.round(result.titleScore * 100)}%`,
    ].join("<br>");
    badge.appendChild(tooltip);

    topRow.appendChild(iconEl);
    topRow.appendChild(titleEl);
    topRow.appendChild(badge);
    card.appendChild(topRow);

    // Meta row: collection + shared tags + shared refs
    const meta = document.createElement("div");
    meta.className = "srn-card-meta";

    const collEl = document.createElement("span");
    collEl.className = "srn-card-collection";
    collEl.textContent = result.collectionName;
    meta.appendChild(collEl);

    for (const tag of result.sharedTags) {
      const tagEl = document.createElement("span");
      tagEl.className = "srn-card-tag";
      tagEl.textContent = `#${tag}`;
      meta.appendChild(tagEl);
    }

    if (result.sharedRefCount > 0) {
      const refEl = document.createElement("span");
      refEl.className = "srn-card-refs";
      refEl.innerHTML = `${this.ui.createIcon("link").outerHTML} ${result.sharedRefCount} shared`;
      meta.appendChild(refEl);
    }

    card.appendChild(meta);

    // Click handler: open note in the other panel (not ours)
    card.onclick = async () => {
      const workspaceGuid = this.getWorkspaceGuid();
      if (!workspaceGuid) return;

      // Find any panel that isn't our Related Notes panel
      // Compare DOM elements rather than panel references for reliability
      let targetPanel = null;
      const myElement = this._panelElement;
      const panels = this.ui.getPanels();
      for (const p of panels) {
        if (p.getElement() === myElement) continue;
        targetPanel = p;
        break;
      }
      if (!targetPanel) {
        targetPanel = await this.ui.createPanel();
      }

      if (targetPanel) {
        targetPanel.navigateTo({
          type: "edit_panel",
          rootId: result.guid,
          workspaceGuid: workspaceGuid,
        });
        this.ui.setActivePanel(targetPanel);
      }
    };

    return card;
  }

  _createStatusMessage(iconName, text) {
    const empty = document.createElement("div");
    empty.className = "srn-empty";
    empty.innerHTML = `
      <div class="srn-empty-icon">${this.ui.createIcon(iconName).outerHTML}</div>
      <div class="srn-empty-text">${this.ui.htmlEscape(text)}</div>
    `;
    return empty;
  }
}
