import * as vscode from "vscode";
import { Model, ModelChange, ModelChangeType } from "../api/modelService";
import { UsageInfo } from "../api/syntheticService";

/**
 * Tab types for the details panel
 */
export type TabType = "usage" | "models";

/**
 * Unified details panel for displaying usage and model information in a webview
 *
 * Design decision: Use a singleton pattern for the panel to prevent multiple
 * instances and manage state consistently. This follows VS Code's webview panel
 * best practices and ensures proper resource management.
 *
 * Design decision: Unified panel with tab navigation reduces UI clutter and
 * provides a cohesive experience for viewing both usage and models data.
 * This is more efficient than separate panels which would fragment the user experience.
 */
export class DetailsPanel {
  public static currentPanel: DetailsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private models: Model[] = [];
  private changes: ModelChange[] = [];
  private usageData: UsageInfo | undefined;
  private activeTab: TabType = "usage";
  private disposables: vscode.Disposable[] = [];

  private constructor(
    _context: vscode.ExtensionContext,
    models: Model[],
    changes: ModelChange[],
    usageData?: UsageInfo,
    activeTab?: TabType
  ) {
    this.models = models;
    this.changes = changes;
    this.usageData = usageData;
    this.activeTab = activeTab ?? "usage";

    this.panel = vscode.window.createWebviewPanel(
      "syntheticDetails",
      "Synthetic Usage Tracker",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    this.panel.webview.html = this.getHtmlContent();

    // Handle panel disposal
    this.panel.onDidDispose(
      () => {
        this.dispose();
      },
      null,
      this.disposables
    );

    // Handle messages from webview
    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "refresh":
            // Trigger refresh based on active tab
            if (message.tab === "usage") {
              vscode.commands.executeCommand(
                "syntheticUsageTracker.refreshUsage"
              );
            } else {
              vscode.commands.executeCommand(
                "syntheticUsageTracker.checkModelUpdates"
              );
            }
            break;
          case "switchTab":
            this.activeTab = message.tab as TabType;
            break;
          case "close":
            this.panel.dispose();
            break;
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Create or show the details panel
   *
   * @param context - Extension context
   * @param activeTab - Which tab to show initially ('usage' or 'models')
   * @returns The DetailsPanel instance
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    activeTab?: TabType
  ): DetailsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and switch to requested tab
    if (DetailsPanel.currentPanel) {
      DetailsPanel.currentPanel.panel.reveal(column);
      if (activeTab) {
        DetailsPanel.currentPanel.activeTab = activeTab;
        DetailsPanel.currentPanel.updateWebview();
      }
      return DetailsPanel.currentPanel;
    }

    // Otherwise, create a new panel
    DetailsPanel.currentPanel = new DetailsPanel(
      context,
      [],
      [],
      undefined,
      activeTab
    );
    return DetailsPanel.currentPanel;
  }

  /**
   * Update the panel content with new data
   *
   * @param usageData - Optional usage information to display
   * @param models - Optional array of models to display
   * @param changes - Optional array of model changes to display
   */
  public update(
    usageData?: UsageInfo,
    models?: Model[],
    changes?: ModelChange[]
  ): void {
    if (usageData) {
      this.usageData = usageData;
    }
    if (models) {
      this.models = models;
    }
    if (changes) {
      this.changes = changes;
    }
    this.updateWebview();
  }

  /**
   * Update the webview HTML content
   */
  private updateWebview(): void {
    this.panel.webview.html = this.getHtmlContent();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    DetailsPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Generate HTML content for the webview
   */
  private getHtmlContent(): string {
    const usageHtml = this.renderUsageTab();
    const modelsHtml = this.renderModelsTab();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synthetic Usage Tracker</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
            margin: 0;
        }
        
        /* Header */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .header h1 {
            margin: 0;
            font-size: 1.5em;
            color: var(--vscode-foreground);
        }
        .header-actions {
            display: flex;
            gap: 10px;
        }
        
        /* Tab Navigation */
        .tab-nav {
            display: flex;
            gap: 0;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .tab-button {
            background-color: transparent;
            color: var(--vscode-foreground);
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
            transition: all 0.2s;
        }
        .tab-button:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .tab-button.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-foreground);
            font-weight: bold;
        }
        
        /* Tab Content */
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        
        /* Buttons */
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            border-radius: 3px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        /* Usage Tab Styles */
        .usage-container {
            max-width: 800px;
            margin: 0 auto;
        }
        .usage-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .usage-percentage {
            font-size: 4em;
            font-weight: bold;
            margin: 0;
            line-height: 1;
        }
        .usage-percentage.normal {
            color: var(--vscode-terminal-ansiGreen);
        }
        .usage-percentage.warning {
            color: var(--vscode-terminal-ansiYellow);
        }
        .usage-percentage.critical {
            color: var(--vscode-terminal-ansiRed);
        }
        .usage-label {
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
            font-size: 1.1em;
        }
        
        /* Progress Bar */
        .progress-container {
            margin: 30px 0;
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 10px;
            overflow: hidden;
            height: 30px;
            position: relative;
        }
        .progress-bar {
            height: 100%;
            transition: width 0.5s ease;
            border-radius: 10px;
        }
        .progress-bar.normal {
            background-color: var(--vscode-terminal-ansiGreen);
        }
        .progress-bar.warning {
            background-color: var(--vscode-terminal-ansiYellow);
        }
        .progress-bar.critical {
            background-color: var(--vscode-terminal-ansiRed);
        }
        .progress-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-weight: bold;
            color: var(--vscode-foreground);
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 30px 0;
        }
        .stat-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            text-align: center;
        }
        .stat-value {
            font-size: 1.8em;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        .stat-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
            margin-top: 5px;
        }
        
        /* Time Remaining */
        .time-remaining {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 20px;
            text-align: center;
            margin: 20px 0;
        }
        .time-remaining-label {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
        }
        .time-remaining-value {
            font-size: 1.5em;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        
        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 3em;
            margin-bottom: 15px;
        }
        
        /* Section Styles (for Models tab) */
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .section-count {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.8em;
        }
        
        /* Model Cards */
        .models-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 15px;
        }
        .model-card {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 15px;
            transition: border-color 0.2s;
        }
        .model-card:hover {
            border-color: var(--vscode-focusBorder);
        }
        .model-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .model-name {
            font-weight: bold;
            font-size: 1.1em;
            color: var(--vscode-foreground);
            margin: 0;
        }
        .model-id {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }
        .provider-badge {
            background-color: var(--vscode-activityBarBadge-background);
            color: var(--vscode-activityBarBadge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75em;
            text-transform: uppercase;
        }
        .model-details {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-top: 12px;
            font-size: 0.9em;
        }
        .detail-item {
            display: flex;
            flex-direction: column;
        }
        .detail-label {
            color: var(--vscode-descriptionForeground);
            font-size: 0.85em;
        }
        .detail-value {
            color: var(--vscode-foreground);
        }
        .features-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 10px;
        }
        .feature-tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.75em;
        }
        .always-on-badge {
            background-color: var(--vscode-terminal-ansiGreen);
            color: var(--vscode-button-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.75em;
            margin-left: 8px;
        }
        
        /* Changes Timeline */
        .changes-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .change-item {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px 15px;
            border-left: 4px solid var(--vscode-focusBorder);
        }
        .change-item.added {
            border-left-color: var(--vscode-terminal-ansiGreen);
        }
        .change-item.removed {
            border-left-color: var(--vscode-terminal-ansiRed);
        }
        .change-item.pricing_changed {
            border-left-color: var(--vscode-terminal-ansiYellow);
        }
        .change-item.features_changed {
            border-left-color: var(--vscode-terminal-ansiBlue);
        }
        .change-item.provider_changed {
            border-left-color: var(--vscode-terminal-ansiMagenta);
        }
        .change-item.always_on_changed {
            border-left-color: var(--vscode-terminal-ansiCyan);
        }
        .change-item.context_length_changed {
            border-left-color: var(--vscode-terminal-ansiBrightYellow);
        }
        .change-item.quantization_changed {
            border-left-color: var(--vscode-terminal-ansiBrightBlue);
        }
        .change-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .change-type {
            font-weight: bold;
            text-transform: capitalize;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .change-type-icon {
            font-size: 1.2em;
        }
        .change-timestamp {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
        }
        .change-model {
            font-size: 0.95em;
            color: var(--vscode-foreground);
            margin-bottom: 8px;
        }
        .change-details {
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            padding: 10px;
            font-size: 0.9em;
        }
        .change-diff {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .diff-row {
            display: flex;
            gap: 10px;
        }
        .diff-label {
            color: var(--vscode-descriptionForeground);
            min-width: 60px;
        }
        .diff-old {
            color: var(--vscode-terminal-ansiRed);
            text-decoration: line-through;
        }
        .diff-new {
            color: var(--vscode-terminal-ansiGreen);
        }
        .diff-arrow {
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Synthetic Usage Tracker</h1>
        <div class="header-actions">
            <button onclick="refreshCurrentTab()">$(refresh) Refresh</button>
            <button onclick="closePanel()">$(close) Close</button>
        </div>
    </div>
    
    <!-- Tab Navigation -->
    <div class="tab-nav">
        <button class="tab-button ${this.activeTab === "usage" ? "active" : ""}" onclick="switchTab('usage')" id="tab-usage">
            $(graph) Usage
        </button>
        <button class="tab-button ${this.activeTab === "models" ? "active" : ""}" onclick="switchTab('models')" id="tab-models">
            $(symbol-class) Models
        </button>
    </div>
    
    <!-- Usage Tab -->
    <div class="tab-content ${this.activeTab === "usage" ? "active" : ""}" id="content-usage">
        ${usageHtml}
    </div>
    
    <!-- Models Tab -->
    <div class="tab-content ${this.activeTab === "models" ? "active" : ""}" id="content-models">
        ${modelsHtml}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        let currentTab = '${this.activeTab}';
        
        function switchTab(tab) {
            currentTab = tab;
            
            // Update button states
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('tab-' + tab).classList.add('active');
            
            // Update content visibility
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('content-' + tab).classList.add('active');
            
            // Notify extension
            vscode.postMessage({ command: 'switchTab', tab: tab });
        }
        
        function refreshCurrentTab() {
            vscode.postMessage({ command: 'refresh', tab: currentTab });
        }
        
        function closePanel() {
            vscode.postMessage({ command: 'close' });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Render the usage tab content
   *
   * Design decision: Display usage data with visual indicators for thresholds.
   * Green (<80%), Yellow (80-90%), Red (>90%) provides intuitive status recognition.
   * Large percentage display with progress bar gives immediate visual feedback.
   */
  private renderUsageTab(): string {
    if (!this.usageData) {
      return `
        <div class="empty-state">
            <div class="empty-state-icon">$(graph)</div>
            <div>No usage data available.</div>
            <div style="margin-top: 10px; font-size: 0.9em;">Click Refresh to fetch your current quota information.</div>
        </div>`;
    }

    const { limit, requests, remaining, percentageUsed, renewsAt, renewsAtString } =
      this.usageData;

    // Determine status class based on thresholds
    let statusClass = "normal";
    if (percentageUsed > 90) {
      statusClass = "critical";
    } else if (percentageUsed > 80) {
      statusClass = "warning";
    }

    // Calculate time remaining until renewal
    const timeRemaining = this.calculateTimeRemaining(renewsAt);

    return `
        <div class="usage-container">
            <div class="usage-header">
                <div class="usage-percentage ${statusClass}">${percentageUsed.toFixed(1)}%</div>
                <div class="usage-label">of your API quota used</div>
            </div>
            
            <div class="progress-container">
                <div class="progress-bar ${statusClass}" style="width: ${percentageUsed}%"></div>
                <div class="progress-text">${requests.toLocaleString()} / ${limit.toLocaleString()}</div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${requests.toLocaleString()}</div>
                    <div class="stat-label">Used</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${remaining.toLocaleString()}</div>
                    <div class="stat-label">Remaining</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${limit.toLocaleString()}</div>
                    <div class="stat-label">Limit</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${renewsAtString}</div>
                    <div class="stat-label">Renews At</div>
                </div>
            </div>
            
            <div class="time-remaining">
                <div class="time-remaining-label">Time Until Renewal</div>
                <div class="time-remaining-value">${timeRemaining}</div>
            </div>
        </div>`;
  }

  /**
   * Calculate human-readable time remaining until renewal
   */
  private calculateTimeRemaining(renewsAt: Date): string {
    const now = new Date();
    const diff = renewsAt.getTime() - now.getTime();

    if (diff <= 0) {
      return "Renewal overdue";
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Render the models tab content
   *
   * Design decision: Group models by provider in a grid layout for better visual organization.
   * Each model is displayed as a card with key information prominently shown.
   * This approach allows users to quickly scan and compare models.
   */
  private renderModelsTab(): string {
    const modelsHtml = this.renderModels();
    const changesHtml = this.renderChanges();

    return `
        ${changesHtml}
        ${modelsHtml}`;
  }

  /**
   * Render the models section
   */
  private renderModels(): string {
    if (this.models.length === 0) {
      return `
        <div class="section">
            <div class="section-title">
                Available Models
                <span class="section-count">0</span>
            </div>
            <div class="empty-state">
                <div class="empty-state-icon">$(symbol-class)</div>
                <div>No models available.</div>
                <div style="margin-top: 10px; font-size: 0.9em;">Click Refresh to fetch the latest models.</div>
            </div>
        </div>`;
    }

    // Group models by provider for better organization
    const modelsByProvider = this.groupModelsByProvider(this.models);

    let modelsHtml = `
        <div class="section">
            <div class="section-title">
                Available Models
                <span class="section-count">${this.models.length}</span>
            </div>
            <div class="models-grid">`;

    for (const [, models] of modelsByProvider) {
      for (const model of models) {
        modelsHtml += this.renderModelCard(model);
      }
    }

    modelsHtml += `
            </div>
        </div>`;

    return modelsHtml;
  }

  /**
   * Group models by provider for organized display
   */
  private groupModelsByProvider(models: Model[]): Map<string, Model[]> {
    const grouped = new Map<string, Model[]>();

    for (const model of models) {
      const provider = model.provider || "unknown";
      if (!grouped.has(provider)) {
        grouped.set(provider, []);
      }
      // Safe to get the array since we just ensured it exists above
      const providerModels = grouped.get(provider);
      if (providerModels !== undefined) {
        providerModels.push(model);
      }
    }

    // Sort providers alphabetically
    return new Map([...grouped.entries()].sort());
  }

  /**
   * Render a single model card
   */
  private renderModelCard(model: Model): string {
    const pricing = this.formatPricing(model.pricing);
    const features = model.supported_features || [];
    const alwaysOnBadge = model.always_on
      ? '<span class="always-on-badge">Always On</span>'
      : "";

    return `
        <div class="model-card">
            <div class="model-header">
                <div>
                    <div class="model-name">${this.escapeHtml(model.name)}${alwaysOnBadge}</div>
                    <div class="model-id">${this.escapeHtml(model.id)}</div>
                </div>
                <span class="provider-badge">${this.escapeHtml(model.provider)}</span>
            </div>
            <div class="model-details">
                <div class="detail-item">
                    <span class="detail-label">Context</span>
                    <span class="detail-value">${model.context_length?.toLocaleString() || "N/A"} tokens</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Max Output</span>
                    <span class="detail-value">${model.max_output_length?.toLocaleString() || "N/A"} tokens</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Input Cost</span>
                    <span class="detail-value">${pricing.input}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Output Cost</span>
                    <span class="detail-value">${pricing.output}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Quantization</span>
                    <span class="detail-value">${this.escapeHtml(model.quantization || "N/A")}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Modalities</span>
                    <span class="detail-value">${this.formatModalities(model.input_modalities, model.output_modalities)}</span>
                </div>
            </div>
            ${features.length > 0 ? `
            <div class="features-list">
                ${features.map((f) => `<span class="feature-tag">${this.escapeHtml(f)}</span>`).join("")}
            </div>
            ` : ""}
        </div>`;
  }

  /**
   * Format pricing information for display
   */
  private formatPricing(pricing: Model["pricing"]): { input: string; output: string } {
    if (!pricing) {
      return { input: "N/A", output: "N/A" };
    }

    const inputPrice = pricing.prompt || pricing.input_cache_reads || "N/A";
    const outputPrice = pricing.completion || "N/A";

    return {
      input: inputPrice.startsWith("$") ? inputPrice : `$${inputPrice}`,
      output: outputPrice.startsWith("$") ? outputPrice : `$${outputPrice}`,
    };
  }

  /**
   * Format input/output modalities for display
   */
  private formatModalities(input: string[], output: string[]): string {
    const inputs = input?.map((m) => m.toLowerCase()) || [];
    const outputs = output?.map((m) => m.toLowerCase()) || [];

    const modalities = new Set([...inputs, ...outputs]);
    return Array.from(modalities).join(", ") || "N/A";
  }

  /**
   * Render the changes section
   *
   * Design decision: Display changes in a timeline-like format with visual indicators
   * for different change types. Each change shows the model affected, the type of change,
   * and specific differences when applicable. This helps users quickly understand
   * what has changed in the model catalog.
   */
  private renderChanges(): string {
    if (this.changes.length === 0) {
      return `
        <div class="section">
            <div class="section-title">
                Recent Changes
                <span class="section-count">0</span>
            </div>
            <div class="empty-state">
                No changes detected. Changes will appear when models are added, removed, or modified.
            </div>
        </div>`;
    }

    // Sort changes by timestamp (newest first)
    const sortedChanges = [...this.changes].sort((a, b) => b.timestamp - a.timestamp);

    let changesHtml = `
        <div class="section">
            <div class="section-title">
                Recent Changes
                <span class="section-count">${this.changes.length}</span>
            </div>
            <div class="changes-list">`;

    for (const change of sortedChanges) {
      changesHtml += this.renderChangeItem(change);
    }

    changesHtml += `
            </div>
        </div>`;

    return changesHtml;
  }

  /**
   * Render a single change item
   */
  private renderChangeItem(change: ModelChange): string {
    const timestamp = new Date(change.timestamp).toLocaleString();
    const icon = this.getChangeIcon(change.type);
    const changeClass = change.type.toLowerCase().replace(/_/g, "_");

    return `
        <div class="change-item ${changeClass}">
            <div class="change-header">
                <span class="change-type">
                    <span class="change-type-icon">${icon}</span>
                    ${this.formatChangeType(change.type)}
                </span>
                <span class="change-timestamp">${timestamp}</span>
            </div>
            <div class="change-model">
                <strong>${this.escapeHtml(change.modelName)}</strong>
                <span style="color: var(--vscode-descriptionForeground); margin-left: 8px;">
                    ${this.escapeHtml(change.modelId)}
                </span>
            </div>
            ${this.renderChangeDetails(change)}
        </div>`;
  }

  /**
   * Get icon for change type
   */
  private getChangeIcon(type: ModelChangeType): string {
    switch (type) {
      case ModelChangeType.Added:
        return "+";
      case ModelChangeType.Removed:
        return "−";
      case ModelChangeType.PricingChanged:
        return "$";
      case ModelChangeType.FeaturesChanged:
        return "✦";
      case ModelChangeType.ProviderChanged:
        return "➤";
      case ModelChangeType.AlwaysOnChanged:
        return "⚡";
      case ModelChangeType.ContextLengthChanged:
        return "📏";
      case ModelChangeType.QuantizationChanged:
        return "🔧";
      default:
        return "•";
    }
  }

  /**
   * Format change type for display
   */
  private formatChangeType(type: ModelChangeType): string {
    return type.replace(/_/g, " ");
  }

  /**
   * Render change details based on type
   */
  private renderChangeDetails(change: ModelChange): string {
    if (!change.details) {
      return "";
    }

    const { oldValue, newValue, differences } = change.details;

    // Handle pricing changes
    if (change.type === ModelChangeType.PricingChanged && oldValue && newValue) {
      const oldPricing = oldValue as Model["pricing"];
      const newPricing = newValue as Model["pricing"];

      return `
            <div class="change-details">
                <div class="change-diff">
                    ${this.renderPricingDiff("Input", oldPricing?.prompt, newPricing?.prompt)}
                    ${this.renderPricingDiff("Output", oldPricing?.completion, newPricing?.completion)}
                </div>
            </div>`;
    }

    // Handle features changes
    if (change.type === ModelChangeType.FeaturesChanged && differences) {
      return `
            <div class="change-details">
                <div class="change-diff">
                    ${differences.map((d) => `<div>${this.escapeHtml(d)}</div>`).join("")}
                </div>
            </div>`;
    }

    // Handle generic value changes
    if (oldValue !== undefined && newValue !== undefined) {
      return `
            <div class="change-details">
                <div class="change-diff">
                    <div class="diff-row">
                        <span class="diff-label">From:</span>
                        <span class="diff-old">${this.escapeHtml(String(oldValue))}</span>
                    </div>
                    <div class="diff-row">
                        <span class="diff-label">To:</span>
                        <span class="diff-new">${this.escapeHtml(String(newValue))}</span>
                    </div>
                </div>
            </div>`;
    }

    return "";
  }

  /**
   * Render pricing difference row
   */
  private renderPricingDiff(label: string, oldPrice: string | undefined, newPrice: string | undefined): string {
    const oldVal = oldPrice || "N/A";
    const newVal = newPrice || "N/A";

    if (oldVal === newVal) {
      return "";
    }

    return `
            <div class="diff-row">
                <span class="diff-label">${label}:</span>
                <span class="diff-old">${this.escapeHtml(oldVal)}</span>
                <span class="diff-arrow">→</span>
                <span class="diff-new">${this.escapeHtml(newVal)}</span>
            </div>`;
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """)
      .replace(/'/g, "&#039;");
  }
}
