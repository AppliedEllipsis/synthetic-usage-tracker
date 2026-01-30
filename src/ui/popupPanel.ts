import * as vscode from "vscode";
import type { UsageInfo } from "../api/syntheticService";
import { type ModelData } from "../model/detailsPanel";
import { type Model, type ModelChange } from "../api/modelService";

/**
 * Type for valid tabs in the popup panel
 */
type TabType = "usage" | "models";

/**
 * Popup panel showing both Usage and Models data in a floating webview
 *
 * Design decision: This panel appears as a popup (not full window) to provide
 * quick access to usage and model information without disrupting the user's
 * workflow. The multi-pane layout allows viewing both usage and model data
 * side-by-side or switching between tabs.
 *
 * The singleton pattern prevents duplicate panels from being created,
 * providing a consistent user experience.
 */
export class PopupPanel {
  public static currentPanel: PopupPanel | undefined;
  public static readonly viewType = "syntheticUsageTracker.popup";

  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _usageData: UsageInfo | undefined;
  private _modelData: ModelData | undefined;
  private _activeTab: TabType = "usage";
  private _viewMode: "tabs" | "split" = "tabs";
  private _onTabSwitchCallback?: (tab: TabType) => void;
  /**
   * Track disposal state to prevent operations on disposed webviews
   *
   * Design decision: This flag prevents "webview is disposed" errors that occur when
   * async operations attempt to access the webview after it has been closed. Without
   * this guard, the _update() method could throw errors if called after dispose().
   */
  private _isDisposed: boolean = false;

  /**
   * Register a callback to be invoked when tabs are switched
   *
   * Design decision: This callback mechanism allows the extension to refresh
   * data when users switch tabs, ensuring the panel always shows current information.
   * Without this, switching tabs would only update the UI without refreshing data.
   */
  public onTabSwitch(callback: (tab: TabType) => void): void {
    this._onTabSwitchCallback = callback;
  }

  /**
   * Create or show the popup panel
   *
   * Design decision: Static factory method enforces singleton pattern
   * and allows specifying which tab should be active when opening.
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    activeTab?: TabType,
    usage?: UsageInfo,
    models?: ModelData,
  ): PopupPanel {
    // If we already have a panel, show it and switch to requested tab
    if (PopupPanel.currentPanel) {
      PopupPanel.currentPanel._panel.reveal();
      if (activeTab) {
        PopupPanel.currentPanel._activeTab = activeTab;
        PopupPanel.currentPanel._update();
      }
      // Design decision: Update data when reusing an existing panel to ensure
      // the panel displays current information. Without this, a reused panel
      // would show stale data or an empty state, causing user confusion.
      if (usage) {
        PopupPanel.currentPanel.updateUsage(usage);
      }
      if (models) {
        PopupPanel.currentPanel.updateModels(models);
      }
      return PopupPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      PopupPanel.viewType,
      "Synthetic Usage Details",
      vscode.ViewColumn.Beside, // Opens in a column next to the editor
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, "media"),
        ],
      },
    );

    // Design decision: Pass initial data to constructor so the panel displays data
    // immediately upon creation. Without this, the webview renders with empty state
    // because _update() is called before _modelData is set.
    PopupPanel.currentPanel = new PopupPanel(
      panel,
      context.extensionUri,
      activeTab || "usage",
      usage,
      models,
    );
    return PopupPanel.currentPanel;
  }

  /**
   * Private constructor to enforce singleton usage via createOrShow
   */
  private constructor(
    panel: vscode.WebviewPanel,
    _extensionUri: vscode.Uri,
    activeTab: TabType,
    usage?: UsageInfo,
    models?: ModelData,
  ) {
    this._panel = panel;
    this._activeTab = activeTab;
    // Store initial data so the panel displays data immediately upon creation
    this._usageData = usage;
    this._modelData = models;

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
            // Notify callback to trigger data refresh when switching tabs
            this._onTabSwitchCallback?.(this._activeTab);
            return;
          case "setViewMode":
            this._viewMode = message.mode as "tabs" | "split";
            this._update();
            return;
        }
      },
      null,
      this._disposables,
    );
  }

  /**
   * Update the panel with new usage data
   *
   * Design decision: Separate methods for updating usage and model data
   * allow for partial updates - only updating the data type that was provided.
   */
  public updateUsage(usage: UsageInfo): void {
    this._usageData = usage;
    this._update();
  }

  /**
   * Update the panel with new model data
   */
  public updateModels(models: ModelData): void {
    this._modelData = models;
    this._update();
  }

  /**
   * Hide the panel
   */
  public hide(): void {
    this._panel.dispose();
  }

  /**
   * Update the webview content with current data
   *
   * Design decision: Check _isDisposed flag before accessing webview to prevent
   * "webview is disposed" errors during async operations. This ensures that
   * concurrent update requests after disposal are safely ignored.
   */
  private _update(): void {
    // Guard against operations on disposed webview
    if (this._isDisposed) {
      return;
    }
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  /**
   * Dispose of resources when panel is closed
   */
  public dispose(): void {
    // Set disposed flag first to prevent concurrent operations
    this._isDisposed = true;
    PopupPanel.currentPanel = undefined;

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
            <div class="header-actions">
                <button class="view-mode-btn" onclick="setViewMode('${this._viewMode === 'tabs' ? 'split' : 'tabs'}')">
                    <span class="codicon codicon-${this._viewMode === 'tabs' ? 'layout' : 'panel-bottom'}"></span>
                    ${this._viewMode === 'tabs' ? 'Split View' : 'Tab View'}
                </button>
                <button class="refresh-btn" onclick="refresh()">
                    <span class="codicon codicon-refresh"></span>
                    Refresh
                </button>
            </div>
        </div>
        
        ${this._viewMode === 'tabs' ? `
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
        ` : `
        <div class="split-view">
            <div class="split-pane usage-pane">
                <h2>
                    <span class="codicon codicon-dashboard"></span>
                    Usage
                </h2>
                ${usageHtml}
            </div>
            <div class="split-pane models-pane">
                <h2>
                    <span class="codicon codicon-symbol-class"></span>
                    Models
                </h2>
                ${modelsHtml}
            </div>
        </div>
        `}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function switchTab(tab) {
            vscode.postMessage({ command: 'switchTab', tab: tab });
        }
        
        function setViewMode(mode) {
            vscode.postMessage({ command: 'setViewMode', mode: mode });
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
            padding: 16px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            overflow-x: hidden;
        }
        
        .container {
            max-width: 100%;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        h1 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        h2 {
            margin: 0 0 12px 0;
            font-size: 14px;
            font-weight: 600;
            color: var(--vscode-foreground);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        h3 {
            margin: 0 0 8px 0;
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .header-actions {
            display: flex;
            gap: 8px;
        }
        
        .refresh-btn, .view-mode-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }
        
        .refresh-btn:hover, .view-mode-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .tabs {
            display: flex;
            gap: 0;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .tab-btn {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            border-bottom: 2px solid transparent;
            cursor: pointer;
            font-size: 12px;
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
        
        .split-view {
            display: flex;
            gap: 16px;
            height: calc(100vh - 100px);
            min-height: 400px;
        }
        
        .split-pane {
            flex: 1;
            overflow-y: auto;
            padding-right: 8px;
        }
        
        .split-pane::-webkit-scrollbar {
            width: 8px;
        }
        
        .split-pane::-webkit-scrollbar-track {
            background: var(--vscode-editor-background);
        }
        
        .split-pane::-webkit-scrollbar-thumb {
            background: var(--vscode-scrollbarSlider-background);
            border-radius: 4px;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .codicon {
            font-family: "codicon";
            font-size: 13px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 16px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state-icon {
            font-size: 40px;
            margin-bottom: 12px;
            opacity: 0.5;
        }
        
        .empty-state-text {
            font-size: 13px;
            margin-bottom: 6px;
        }
        
        .empty-state-subtext {
            font-size: 11px;
            opacity: 0.7;
        }
    `;
  }

  /**
   * Generate HTML for the Usage tab
   *
   * Design decision: Reuse the same visual design as the original DetailsPanel
   * to maintain consistency and provide a familiar user experience.
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
                margin-bottom: 20px;
            }
            
            .percentage-display {
                display: inline-flex;
                align-items: baseline;
                gap: 4px;
            }
            
            .percentage-value {
                font-size: 48px;
                font-weight: 700;
                line-height: 1;
            }
            
            .percentage-display.critical .percentage-value {
                color: var(--vscode-testing-iconFailed);
            }
            
            .percentage-display.warning .percentage-value {
                color: var(--vscode-editorWarning-foreground);
            }
            
            .percentage-display.normal .percentage-value {
                color: var(--vscode-testing-iconPassed);
            }
            
            .percentage-symbol {
                font-size: 24px;
                font-weight: 600;
                color: var(--vscode-descriptionForeground);
            }
            
            .usage-label {
                font-size: 14px;
                color: var(--vscode-descriptionForeground);
                margin-top: 8px;
            }
            
            .progress-section {
                margin-bottom: 24px;
            }
            
            .progress-bar-bg {
                height: 24px;
                background: var(--vscode-progressBar-background);
                border-radius: 12px;
                overflow: hidden;
                position: relative;
            }
            
            .progress-bar-fill {
                height: 100%;
                transition: width 0.5s ease;
                border-radius: 12px;
            }
            
            .progress-labels {
                display: flex;
                justify-content: space-between;
                margin-top: 6px;
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
                margin-bottom: 24px;
            }
            
            .stat-card {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 16px;
                text-align: center;
            }
            
            .stat-value {
                font-size: 20px;
                font-weight: 600;
                color: var(--vscode-foreground);
                margin-bottom: 4px;
            }
            
            .stat-label {
                font-size: 11px;
                color: var(--vscode-descriptionForeground);
            }
            
            .renewal-section {
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 16px;
            }
            
            .renewal-info, .time-remaining {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: var(--vscode-foreground);
                margin-bottom: 8px;
            }
            
            .renewal-info:last-child, .time-remaining:last-child {
                margin-bottom: 0;
            }
            
            .alert {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px 16px;
                border-radius: 6px;
                font-size: 13px;
            }
            
            .alert.critical {
                background: rgba(255, 0, 0, 0.1);
                border: 1px solid var(--vscode-testing-iconFailed);
                color: var(--vscode-testing-iconFailed);
            }
            
            .alert.warning {
                background: rgba(255, 165, 0, 0.1);
                border: 1px solid var(--vscode-editorWarning-foreground);
                color: var(--vscode-editorWarning-foreground);
            }
        </style>
    `;
  }

  /**
   * Generate HTML for the Models tab
   *
   * Design decision: Reuse the same visual design as the original DetailsPanel
   * to maintain consistency and provide a familiar user experience.
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

    const { models, changes } = this._modelData;

    return `
        <div class="models-container">
            <div class="changes-section">
                <h3>Recent Changes</h3>
                ${changes.length === 0 ? `
                    <div class="no-changes">No recent changes</div>
                ` : `
                    <div class="changes-list">
                        ${changes.map((change) => this._renderChange(change)).join('')}
                    </div>
                `}
            </div>
            
            <div class="models-section">
                <h3>Available Models (${models.length})</h3>
                <div class="models-list">
                    ${models.map((model) => this._renderModel(model)).join('')}
                </div>
            </div>
        </div>
        
        <style>
            .models-container {
                animation: fadeIn 0.3s ease;
            }
            
            .changes-section, .models-section {
                margin-bottom: 20px;
            }
            
            .no-changes {
                padding: 20px;
                text-align: center;
                color: var(--vscode-descriptionForeground);
                font-size: 13px;
                background: var(--vscode-editor-background);
                border: 1px solid var(--vscode-panel-border);
                border-radius: 6px;
            }
            
            .changes-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            
            .models-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 400px;
                overflow-y: auto;
            }
            
            .models-list::-webkit-scrollbar {
                width: 6px;
            }
            
            .models-list::-webkit-scrollbar-track {
                background: var(--vscode-editor-background);
            }
            
            .models-list::-webkit-scrollbar-thumb {
                background: var(--vscode-scrollbarSlider-background);
                border-radius: 3px;
            }
        </style>
    `;
  }

  /**
   * Render a single model change
   */
  private _renderChange(change: ModelChange): string {
    const changeIcon = change.type === "added" ? "add" : 
                      change.type === "removed" ? "remove" : "edit";
    
    return `
      <div class="change-item">
        <span class="codicon codicon-${changeIcon}"></span>
        <div class="change-details">
            <div class="change-name">${change.modelName}</div>
            <div class="change-time">${this._formatDate(new Date(change.timestamp))}</div>
        </div>
      </div>
      <style>
        .change-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
        }
        
        .change-details {
            flex: 1;
        }
        
        .change-name {
            font-size: 13px;
            font-weight: 500;
            color: var(--vscode-foreground);
            margin-bottom: 4px;
        }
        
        .change-time {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
      </style>
    `;
  }

  /**
   * Render a single model
   */
  private _renderModel(model: Model): string {
    return `
      <div class="model-item">
        <div class="model-header">
            <span class="model-name">${model.name}</span>
            <span class="codicon codicon-chevron-right"></span>
        </div>
        <div class="model-description">${model.description || 'No description available'}</div>
      </div>
      <style>
        .model-item {
            padding: 12px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .model-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .model-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
        }
        
        .model-name {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
        }
        
        .model-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }
      </style>
    `;
  }

  /**
   * Calculate time remaining until a given date
   */
  private _calculateTimeRemaining(date: Date): string {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff <= 0) {
      return "Renewed";
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h`;
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
