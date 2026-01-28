import * as vscode from "vscode";
import type { UsageInfo } from "../api/syntheticService";
import { type Model, type ModelChange, ModelChangeType } from "../api/modelService";

/**
 * Data structure for model information passed to the webview
 */
interface ModelData {
  models: Model[];
  changes: ModelChange[];
  lastUpdated: Date;
}

/**
 * Type for valid tabs in the details panel
 */
type TabType = "usage" | "models";

/**
 * Unified details panel showing both Usage and Models data
 *
 * Design decision: This panel uses a tabbed interface to consolidate
 * related information (usage stats and model details) into a single view,
 * reducing window clutter while maintaining easy access to both data types.
 *
 * The singleton pattern prevents duplicate panels from being created,
 * providing a consistent user experience.
 */
export class DetailsPanel {
  public static currentPanel: DetailsPanel | undefined;
  public static readonly viewType = "syntheticUsageTracker.details";

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _usageData: UsageInfo | undefined;
  private _modelData: ModelData | undefined;
  private _activeTab: TabType = "usage";

  /**
   * Create or show the details panel
   *
   * Design decision: Static factory method enforces singleton pattern
   * and allows specifying which tab should be active when opening.
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    activeTab?: TabType,
  ): DetailsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it and switch to requested tab
    if (DetailsPanel.currentPanel) {
      DetailsPanel.currentPanel._panel.reveal(column);
      if (activeTab) {
        DetailsPanel.currentPanel._activeTab = activeTab;
        DetailsPanel.currentPanel._update();
      }
      return DetailsPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      DetailsPanel.viewType,
      "Synthetic Usage Details",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "media"),
        ],
      },
    );

    DetailsPanel.currentPanel = new DetailsPanel(
      panel,
      context.extensionUri,
      activeTab || "usage",
    );
    return DetailsPanel.currentPanel;
  }

  /**
   * Private constructor to enforce singleton usage via createOrShow
   */
  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    activeTab: TabType,
  ) {
    this._panel = panel;
    this._activeTab = activeTab;

    // Set initial HTML content
    this._update();

    // Listen for panel close
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "refresh":
            // Trigger refresh via command
            vscode.commands.executeCommand("syntheticUsageTracker.refresh");
            return;
          case "switchTab":
            this._activeTab = message.tab as TabType;
            this._update();
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  /**
   * Update the panel with new data
   *
   * Supports partial updates - only updates the data type that was provided
   */
  public update(usageData?: UsageInfo, modelData?: ModelData): void {
    if (usageData) {
      this._usageData = usageData;
    }
    if (modelData) {
      this._modelData = modelData;
    }
    this._update();
  }

  /**
   * Update the webview content with current data
   */
  private _update(): void {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * Dispose of resources when panel is closed
   */
  public dispose(): void {
    DetailsPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * Generate the complete HTML for the webview
   */
  private _getHtmlForWebview(_webview: vscode.Webview): string {
    const usageHtml = this._getUsageHtml();
    const modelsHtml = this._getModelsHtml();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synthetic Usage Details</title>
    <style>
        ${this._getCommonStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Synthetic.new Details</h1>
            <button class="refresh-btn" onclick="refresh()">
                <span class="codicon codicon-refresh"></span>
                Refresh
            </button>
        </div>
        
        <div class="tabs">
            <button class="tab-btn ${this._activeTab === "usage" ? "active" : ""}" onclick="switchTab('usage')">
                <span class="codicon codicon-dashboard"></span>
                Usage
            </button>
            <button class="tab-btn ${this._activeTab === "models" ? "active" : ""}" onclick="switchTab('models')">
                <span class="codicon codicon-symbol-class"></span>
                Models
            </button>
        </div>
        
        <div class="tab-content">
            <div id="usage-tab" class="tab-pane ${this._activeTab === "usage" ? "active" : ""}">
                ${usageHtml}
            </div>
            <div id="models-tab" class="tab-pane ${this._activeTab === "models" ? "active" : ""}">
                ${modelsHtml}
            </div>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function switchTab(tab) {
            vscode.postMessage({ command: 'switchTab', tab: tab });
        }
        
        // Handle escape key to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                vscode.postMessage({ command: 'close' });
            }
        });
    </script>
</body>
</html>`;
  }

  /**
   * Generate CSS styles shared across both tabs
   */
  private _getCommonStyles(): string {
    return `
        :root {
            --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        h2 {
            margin: 0 0 15px 0;
            font-size: 18px;
            font-weight: 500;
            color: var(--vscode-foreground);
        }
        
        h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .refresh-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        
        .refresh-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .tab-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 10px 20px;
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .tab-btn:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .tab-btn.active {
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-focusBorder);
        }
        
        .tab-content {
            position: relative;
        }
        
        .tab-pane {
            display: none;
        }
        
        .tab-pane.active {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .codicon {
            font-family: "codicon";
            font-size: 14px;
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.5;
        }
        
        .empty-state-text {
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .empty-state-subtext {
            font-size: 12px;
            opacity: 0.7;
        }
    `;
  }

  /**
   * Generate HTML for the Usage tab
   */
  private _getUsageHtml(): string {
    if (!this._usageData) {
      return `
        <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div class="empty-state-text">No usage data available</div>
            <div class="empty-state-subtext">Click refresh to fetch usage information</div>
        </div>
      `;
    }

    const usage = this._usageData;
    const percentage = Math.round(usage.percentageUsed);
    const isWarning = percentage >= 80 && percentage < 90;
    const isCritical = percentage >= 90;

    // Determine progress bar color
    let progressColor = "var(--vscode-testing-iconPassed)";
    if (isCritical) {
      progressColor = "var(--vscode-testing-iconFailed)";
    } else if (isWarning) {
      progressColor = "var(--vscode-editorWarning-foreground)";
    }

    // Calculate time remaining until renewal
    const timeRemaining = this._calculateTimeRemaining(usage.renewsAt);

    return `
        <div class="usage-container">
            <div class="usage-header">
                <div class="percentage-display ${isCritical ? "critical" : isWarning ? "warning" : "normal"}">
                    <span class="percentage-value">${percentage}</span>
                    <span class="percentage-symbol">%</span>
                </div>
                <div class="usage-label">Quota Used</div>
            </div>
            
            <div class="progress-section">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${progressColor};"></div>
                </div>
                <div class="progress-labels">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${usage.requests.toLocaleString()}</div>
                    <div class="stat-label">Requests Used</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${usage.remaining.toLocaleString()}</div>
                    <div class="stat-label">Remaining</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${usage.limit.toLocaleString()}</div>
                    <div class="stat-label">Total Limit</div>
                </div>
            </div>
            
            <div class="renewal-section">
                <div class="renewal-info">
                    <span class="codicon codicon-calendar"></span>
                    <span>Renews: ${this._formatDate(usage.renewsAt)}</span>
                </div>
                <div class="time-remaining">
                    <span class="codicon codicon-clock"></span>
                    <span>Time remaining: ${timeRemaining}</span>
                </div>
            </div>
            
            ${isCritical ? `
                <div class="alert critical">
                    <span class="codicon codicon-error"></span>
                    <span>Critical: You have used ${percentage}% of your quota!</span>
                </div>
            ` : isWarning ? `
                <div class="alert warning">
                    <span class="codicon codicon-warning"></span>
                    <span>Warning: You have used ${percentage}% of your quota</span>
                </div>
            ` : ""}
        </div>
        
        <style>
            .usage-container {
                animation: fadeIn 0.3s ease;
            }
            
            .usage-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .percentage-display {
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
            }
            
            .percentage-value {
                font-size: 72px;
                font-weight: 700;
                line-height: 1;
            }
            
            .percentage-symbol {
                font-size: 36px;
                font-weight: 600;
            }
            
            .percentage-display.critical .percentage-value,
            .percentage-display.critical .percentage-symbol {
                color: var(--vscode-testing-iconFailed);
            }
            
            .percentage-display.warning .percentage-value,
            .percentage-display.warning .percentage-symbol {
                color: var(--vscode-editorWarning-foreground);
            }
            
            .percentage-display.normal .percentage-value,
            .percentage-display.normal .percentage-symbol {
                color: var(--vscode-testing-iconPassed);
            }
            
            .usage-label {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-top: 8px;
            }
            
            .progress-section {
                margin-bottom: 30px;
            }
            
            .progress-bar-bg {
                height: 12px;
                background: var(--vscode-scrollbarSlider-background);
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-bar-fill {
                height: 100%;
                border-radius: 6px;
                transition: width 0.5s ease;
            }
            
            .progress-labels {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 16px;
                margin-bottom: 30px;
            }
            
            .stat-card {
                background: var(--vscode-editor-inactiveSelectionBackground);
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 24px;
                font-weight: 700;
                color: var(--vscode-foreground);
                margin-bottom: 4px;
            }
            
            .stat-label {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
            }
            
            .renewal-section {
                background: var(--vscode-editor-inactiveSelectionBackground);
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .renewal-info, .time-remaining {
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 14px;
                margin-bottom: 10px;
            }
            
            .renewal-info:last-child, .time-remaining:last-child {
                margin-bottom: 0;
            }
            
            .alert {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 16px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
            }
            
            .alert.critical {
                background: var(--vscode-inputValidation-errorBackground);
                color: var(--vscode-testing-iconFailed);
                border: 1px solid var(--vscode-inputValidation-errorBorder);
            }
            
            .alert.warning {
                background: var(--vscode-inputValidation-warningBackground);
                color: var(--vscode-editorWarning-foreground);
                border: 1px solid var(--vscode-inputValidation-warningBorder);
            }
        </style>
    `;
  }

  /**
   * Generate HTML for the Models tab
   */
  private _getModelsHtml(): string {
    if (!this._modelData) {
      return `
        <div class="empty-state">
            <div class="empty-state-icon">🤖</div>
            <div class="empty-state-text">No model data available</div>
            <div class="empty-state-subtext">Click refresh to fetch model information</div>
        </div>
      `;
    }

    const { models, changes, lastUpdated } = this._modelData;

    // Group models by provider
    const modelsByProvider = this._groupModelsByProvider(models);

    return `
        <div class="models-container">
            <div class="last-updated">
                Last updated: ${this._formatDate(lastUpdated)}
            </div>
            
            <div class="models-section">
                <h2>Available Models</h2>
                ${Object.entries(modelsByProvider)
                  .map(
                    ([provider, providerModels]) => `
                    <div class="provider-group">
                        <h3>${this._escapeHtml(provider)}</h3>
                        <div class="models-grid">
                            ${providerModels
                              .map(
                                (model) => `
                                <div class="model-card">
                                    <div class="model-name">${this._escapeHtml(model.name)}</div>
                                    <div class="model-id">${this._escapeHtml(model.id)}</div>
                                    ${model.contextLength ? `<div class="model-context">Context: ${model.contextLength.toLocaleString()} tokens</div>` : ""}
                                </div>
                            `,
                              )
                              .join("")}
                        </div>
                    </div>
                `,
                  )
                  .join("")}
            </div>
            
            ${changes.length > 0 ? `
                <div class="changes-section">
                    <h2>Recent Changes</h2>
                    <div class="changes-timeline">
                        ${changes
                          .map(
                            (change) => `
                            <div class="change-item">
                                <div class="change-date">${this._formatDate(new Date(change.timestamp))}</div>
                                <div class="change-type ${change.type}">${change.type}</div>
                                <div class="change-description">${this._formatChangeDetails(change)}</div>
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                </div>
            ` : ""}
        </div>
        
        <style>
            .models-container {
                animation: fadeIn 0.3s ease;
            }
            
            .last-updated {
                text-align: right;
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                margin-bottom: 20px;
            }
            
            .models-section {
                margin-bottom: 30px;
            }
            
            .provider-group {
                margin-bottom: 24px;
            }
            
            .provider-group h3 {
                color: var(--vscode-focusBorder);
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
            
            .models-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 12px;
            }
            
            .model-card {
                background: var(--vscode-editor-inactiveSelectionBackground);
                padding: 12px;
                border-radius: 6px;
                border: 1px solid var(--vscode-panel-border);
            }
            
            .model-name {
                font-weight: 600;
                font-size: 13px;
                margin-bottom: 4px;
            }
            
            .model-id {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
                font-family: monospace;
                margin-bottom: 4px;
            }
            
            .model-context {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            
            .changes-section {
                margin-top: 30px;
            }
            
            .changes-timeline {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            
            .change-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px;
                background: var(--vscode-editor-inactiveSelectionBackground);
                border-radius: 6px;
                border-left: 3px solid var(--vscode-panel-border);
            }
            
            .change-date {
                font-size: 12px;
                color: var(--vscode-descriptionForeground);
                min-width: 100px;
            }
            
            .change-type {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                padding: 2px 8px;
                border-radius: 4px;
                min-width: 60px;
                text-align: center;
            }
            
            .change-type.added {
                background: var(--vscode-testing-iconPassed);
                color: white;
            }
            
            .change-type.removed {
                background: var(--vscode-testing-iconFailed);
                color: white;
            }
            
            .change-type.updated {
                background: var(--vscode-editorWarning-foreground);
                color: black;
            }
            
            .change-description {
                flex: 1;
                font-size: 13px;
            }
        </style>
    `;
  }

  /**
   * Group models by their provider
   */
  private _groupModelsByProvider(models: Model[]): Record<string, Model[]> {
    return models.reduce(
      (groups, model) => {
        const provider = model.provider || "Other";
        if (!groups[provider]) {
          groups[provider] = [];
        }
        groups[provider].push(model);
        return groups;
      },
      {} as Record<string, Model[]>,
    );
  }

  /**
   * Calculate human-readable time remaining until a date
   */
  private _calculateTimeRemaining(renewsAt: Date): string {
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
   * Format a date for display
   */
  private _formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /**
   * Format change details for display
   * Generates a human-readable description from the change details
   */
  private _formatChangeDetails(change: ModelChange): string {
    const { details, type } = change;

    switch (type) {
      case ModelChangeType.Added:
        return "New model added to the API";
      case ModelChangeType.Removed:
        return "Model removed from the API";
      case ModelChangeType.PricingChanged:
        return "Pricing updated";
      case ModelChangeType.FeaturesChanged: {
        if (details.differences && details.differences.length > 0) {
          return `Features changed: ${details.differences.join(", ")}`;
        }
        return "Features modified";
      }
      case ModelChangeType.ProviderChanged:
        return "Provider changed";
      case ModelChangeType.AlwaysOnChanged:
        return "Always-on status changed";
      case ModelChangeType.ContextLengthChanged:
        return "Context length modified";
      case ModelChangeType.QuantizationChanged:
        return "Quantization settings updated";
      default:
        return "Model properties modified";
    }
  }

  /**
   * Escape HTML special characters to prevent XSS
   */
  private _escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
