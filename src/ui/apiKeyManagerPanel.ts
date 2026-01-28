import * as vscode from "vscode";
import { ApiKeyManager, ApiKeyProfile } from "../config/apiKeyManager";
import { SyntheticService } from "../api/syntheticService";

/**
 * Webview panel for managing API key profiles
 *
 * Design decision: This panel provides a UI for users to add, delete, and switch
 * between multiple API key profiles. Using a webview allows for a rich, interactive
 * interface that matches VSCode's design language.
 */
export class ApiKeyManagerPanel {
  private static currentPanel: ApiKeyManagerPanel | undefined;
  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private profiles: ApiKeyProfile[] = [];

  private static readonly viewType = "syntheticApiKeyManager";

  private constructor(
    panel: vscode.WebviewPanel,
    private readonly apiKeyManager: ApiKeyManager,
  ) {
    this.panel = panel;

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleMessage(message);
      },
      null,
      this.disposables,
    );

    // Watch for profile changes
    this.apiKeyManager.onProfilesChanged(() => {
      this.refreshProfiles();
    });
  }

  /**
   * Show or create the API key manager panel
   *
   * Design decision: Use static factory method to implement singleton pattern
   * This prevents multiple panels from being open at once, ensuring consistent UX
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    apiKeyManager: ApiKeyManager,
  ): ApiKeyManagerPanel {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (ApiKeyManagerPanel.currentPanel) {
      ApiKeyManagerPanel.currentPanel.panel.reveal(column);
      return ApiKeyManagerPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      ApiKeyManagerPanel.viewType,
      "API Key Manager",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [extensionUri],
      },
    );

    ApiKeyManagerPanel.currentPanel = new ApiKeyManagerPanel(
      panel,
      apiKeyManager,
    );
    return ApiKeyManagerPanel.currentPanel;
  }

  /**
   * Refresh the panel with current profiles
   */
  private async refreshProfiles(): Promise<void> {
    this.profiles = await this.apiKeyManager.getProfiles();
    this._update();
  }

  /**
   * Handle messages from the webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case "addProfile":
        await this.handleAddProfile();
        break;
      case "deleteProfile":
        await this.handleDeleteProfile(message.id);
        break;
      case "setActiveProfile":
        await this.handleSetActiveProfile(message.id);
        break;
      case "cycleProfiles":
        await this.handleCycleProfiles();
        break;
    }
  }

  /**
   * Handle adding a new profile
   */
  private async handleAddProfile(): Promise<void> {
    const input = await vscode.window.showInputBox({
      prompt: "Enter your Synthetic.new API key",
      placeHolder: "syn_xxxxxxxxxxxxxxxxxxxx",
      password: true,
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key cannot be empty";
        }
        if (!SyntheticService.validateApiKey(value)) {
          return "Invalid API key format. API keys should start with 'syn_'";
        }
        return null;
      },
    });

    if (input) {
      const labelInput = await vscode.window.showInputBox({
        prompt: "Enter a label for this API key (optional)",
        placeHolder: "e.g., Production, Development",
      });

      await this.apiKeyManager.addProfile(input, labelInput || undefined);
      vscode.window.showInformationMessage("API key added successfully");
    }
  }

  /**
   * Handle deleting a profile
   */
  private async handleDeleteProfile(id: string): Promise<void> {
    const confirm = await vscode.window.showWarningMessage(
      "Are you sure you want to delete this API key?",
      { modal: true },
      "Delete",
      "Cancel",
    );

    if (confirm === "Delete") {
      await this.apiKeyManager.deleteProfile(id);
      vscode.window.showInformationMessage("API key deleted successfully");
    }
  }

  /**
   * Handle setting the active profile
   */
  private async handleSetActiveProfile(id: string): Promise<void> {
    await this.apiKeyManager.setActiveProfile(id);
    vscode.window.showInformationMessage("Active API key changed");
  }

  /**
   * Handle cycling to the next profile
   */
  private async handleCycleProfiles(): Promise<void> {
    const nextProfile = await this.apiKeyManager.cycleProfiles();
    if (nextProfile) {
      vscode.window.showInformationMessage(
        `Switched to: ${nextProfile.label || nextProfile.id}`,
      );
    }
  }

  /**
   * Update the webview content
   */
  private _update(): void {
    this.panel.webview.html = this._getHtmlForWebview(this.panel.webview);
  }

  /**
   * Generate HTML for the webview
   */
  private _getHtmlForWebview(webview: vscode.Webview): string {
    const profilesHtml = this.profiles
      .map(
        (profile) => `
        <div class="profile ${profile.isActive ? "active" : ""}" data-id="${profile.id}">
          <div class="profile-info">
            <div class="profile-label">${
              this.escapeHtml(profile.label || profile.id)
            }</div>
            <div class="profile-key">${this.maskApiKey(profile.key)}</div>
          </div>
          <div class="profile-actions">
            ${!profile.isActive ? `
              <button class="icon-button set-active" title="Set as active" data-id="${profile.id}">
                <i class="codicon codicon-check"></i>
              </button>
            ` : ''}
            <button class="icon-button delete" title="Delete" data-id="${profile.id}">
              <i class="codicon codicon-trash"></i>
            </button>
          </div>
        </div>
      `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${this.getNonce()}';">
        <title>API Key Manager</title>
        <style>
          :root {
            --vscode-font-family: var(--vscode-font-family);
            --vscode-font-size: var(--vscode-font-size);
            --vscode-foreground: var(--vscode-foreground);
            --vscode-background: var(--vscode-editor-background);
            --vscode-widget-background: var(--vscode-editorWidget-background);
            --vscode-border: var(--vscode-panel-border);
            --vscode-button-background: var(--vscode-button-secondaryBackground);
            --vscode-button-foreground: var(--vscode-button-secondaryForeground);
            --vscode-button-hoverBackground: var(--vscode-button-secondaryHoverBackground);
            --vscode-icon-foreground: var(--vscode-icon-foreground);
            --vscode-textLink-foreground: var(--vscode-textLink-foreground);
            --vscode-textCode-background: var(--vscode-textCodeBlock-background);
          }

          * {
            box-sizing: border-box;
          }

          html, body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-background);
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-border);
          }

          .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
          }

          .header-actions {
            display: flex;
            gap: 10px;
          }

          .button {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }

          .button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }

          .button.primary {
            background-color: var(--vscode-textLink-foreground);
            color: white;
          }

          .button.primary:hover {
            opacity: 0.9;
          }

          .profiles-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .profile {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px;
            border: 1px solid var(--vscode-border);
            border-radius: 6px;
            background-color: var(--vscode-widget-background);
            transition: border-color 0.2s, background-color 0.2s;
          }

          .profile:hover {
            border-color: var(--vscode-textLink-foreground);
          }

          .profile.active {
            border-color: var(--vscode-textLink-foreground);
            background-color: rgba(0, 136, 254, 0.1);
          }

          .profile-info {
            flex: 1;
            min-width: 0;
          }

          .profile-label {
            font-weight: 600;
            margin-bottom: 6px;
            font-size: 14px;
          }

          .profile-key {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: var(--vscode-icon-foreground);
            background-color: var(--vscode-textCode-background);
            padding: 4px 8px;
            border-radius: 3px;
            display: inline-block;
          }

          .profile-actions {
            display: flex;
            gap: 8px;
          }

          .icon-button {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 4px;
            background-color: transparent;
            color: var(--vscode-icon-foreground);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
          }

          .icon-button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }

          .icon-button.delete:hover {
            background-color: rgba(255, 0, 0, 0.1);
            color: #f14c4c;
          }

          .icon-button i {
            font-size: 16px;
          }

          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-icon-foreground);
          }

          .empty-state h2 {
            margin: 0 0 12px 0;
            font-size: 18px;
            font-weight: 600;
            color: var(--vscode-foreground);
          }

          .empty-state p {
            margin: 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>API Key Manager</h1>
            <div class="header-actions">
              <button class="button" id="cycleButton">
                <i class="codicon codicon-arrow-swap"></i>
                Cycle
              </button>
              <button class="button primary" id="addButton">
                <i class="codicon codicon-plus"></i>
                Add Key
              </button>
            </div>
          </div>

          <div class="profiles-list">
            ${profilesHtml || `
              <div class="empty-state">
                <h2>No API Keys Configured</h2>
                <p>Click "Add Key" to add your first API key.</p>
              </div>
            `}
          </div>
        </div>

        <script nonce="${this.getNonce()}">
          (function() {
            const vscode = acquireVsCodeApi();

            // Add button
            document.getElementById('addButton').addEventListener('click', () => {
              vscode.postMessage({ command: 'addProfile' });
            });

            // Cycle button
            document.getElementById('cycleButton').addEventListener('click', () => {
              vscode.postMessage({ command: 'cycleProfiles' });
            });

            // Delete buttons
            document.querySelectorAll('.delete').forEach(button => {
              button.addEventListener('click', (e) => {
                const profileId = button.dataset.id;
                vscode.postMessage({ command: 'deleteProfile', id: profileId });
              });
            });

            // Set active buttons
            document.querySelectorAll('.set-active').forEach(button => {
              button.addEventListener('click', (e) => {
                const profileId = button.dataset.id;
                vscode.postMessage({ command: 'setActiveProfile', id: profileId });
              });
            });
          })();
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Mask API key for display (show only last 6 characters)
   *
   * Design decision: Only show the last 6 characters for security
   * This allows users to distinguish between keys without exposing sensitive data
   */
  private maskApiKey(key: string): string {
    if (key.length <= 10) {
      return "syn_..." + key.substring(key.length - 6);
    }
    return `${key.substring(0, 4)}...${key.substring(key.length - 6)}`;
  }

  /**
   * Escape HTML to prevent XSS
   *
   * Design decision: Use a simple string replacement approach instead of DOM
   * This avoids the need for the 'document' object which is not available in
   * all TypeScript environments
   */
  private escapeHtml(text: string): string {
    const htmlEscapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]!);
  }

  /**
   * Generate a nonce for Content Security Policy
   */
  private getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    ApiKeyManagerPanel.currentPanel = undefined;
    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
