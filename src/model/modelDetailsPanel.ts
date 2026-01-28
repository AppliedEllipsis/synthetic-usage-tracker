import * as vscode from "vscode";
import { Model, ModelChange, ModelChangeType } from "../api/modelService";

/**
 * Model details panel for displaying model information in a webview
 *
 * Design decision: Use a singleton pattern for the panel to prevent multiple
 * instances and manage state consistently. This follows VS Code's webview panel
 * best practices and ensures proper resource management.
 */
export class ModelDetailsPanel {
  public static currentPanel: ModelDetailsPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private models: Model[] = [];
  private changes: ModelChange[] = [];
  private disposables: vscode.Disposable[] = [];

  private constructor(
    context: vscode.ExtensionContext,
    models: Model[],
    changes: ModelChange[]
  ) {
    this.context = context;
    this.models = models;
    this.changes = changes;

    this.panel = vscode.window.createWebviewPanel(
      "syntheticModelDetails",
      "Synthetic Models",
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
            // Trigger refresh via extension
            vscode.commands.executeCommand(
              "syntheticUsageTracker.checkModelUpdates"
            );
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
   * Create or show the model details panel
   */
  public static createOrShow(
    context: vscode.ExtensionContext,
    models: Model[],
    changes: ModelChange[]
  ): ModelDetailsPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ModelDetailsPanel.currentPanel) {
      ModelDetailsPanel.currentPanel.panel.reveal(column);
      ModelDetailsPanel.currentPanel.updateContent(models, changes);
      return ModelDetailsPanel.currentPanel;
    }

    // Otherwise, create a new panel
    ModelDetailsPanel.currentPanel = new ModelDetailsPanel(
      context,
      models,
      changes
    );
    return ModelDetailsPanel.currentPanel;
  }

  /**
   * Update the panel content with new data
   */
  public updateContent(models: Model[], changes: ModelChange[]): void {
    this.models = models;
    this.changes = changes;
    this.panel.webview.html = this.getHtmlContent();
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    ModelDetailsPanel.currentPanel = undefined;

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
    const modelsHtml = this.renderModels();
    const changesHtml = this.renderChanges();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Synthetic Models</title>
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
        }
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
        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
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
        <h1>Synthetic Models</h1>
        <div class="header-actions">
            <button onclick="refresh()">$(refresh) Refresh</button>
            <button onclick="closePanel()">$(close) Close</button>
        </div>
    </div>
    
    ${changesHtml}
    ${modelsHtml}
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function closePanel() {
            vscode.postMessage({ command: 'close' });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Render the models section
   * 
   * Design decision: Group models by provider in a grid layout for better visual organization.
   * Each model is displayed as a card with key information prominently shown.
   * This approach allows users to quickly scan and compare models.
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
                No models available. Click Refresh to fetch the latest models.
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
      grouped.get(provider)!.push(model);
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
      : '';
    
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
                ${features.map(f => `<span class="feature-tag">${this.escapeHtml(f)}</span>`).join('')}
            </div>
            ` : ''}
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
    const inputs = input?.map(m => m.toLowerCase()) || [];
    const outputs = output?.map(m => m.toLowerCase()) || [];
    
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
                No changes detected. Changes will appear here when models are added, removed, or modified.
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
    const changeClass = change.type.toLowerCase().replace(/_/g, '_');
    
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
                    ${differences.map(d => `<div>${this.escapeHtml(d)}</div>`).join("")}
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
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
