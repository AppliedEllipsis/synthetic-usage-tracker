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
  private readonly context: vscode.ExtensionContext;
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
