import * as vscode from "vscode";
import { ModelChange } from "../api/modelService";

/**
 * Display state for the model indicator
 */
export enum ModelIndicatorState {
  Idle = "idle",
  Loading = "loading",
  Ready = "ready",
  Error = "error",
  ChangesDetected = "changesDetected",
}

/**
 * Model indicator for status bar display
 *
 * Design decision: Separate model indicator from usage indicator to maintain
 * single responsibility. This allows independent control over model tracking
 * display while following the same patterns as the existing usage indicator.
 */
export class ModelIndicator {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: ModelIndicatorState = ModelIndicatorState.Idle;
  private modelCount: number = 0;
  private unreadChanges: number = 0;
  private lastText: string | null = null;
  private lastTooltip: string | null = null;
  private lastState: ModelIndicatorState | null = null;

  constructor(_context: vscode.ExtensionContext) {
    /**
     * Design decision: Use lower priority (99) than usage indicator (100)
     * so model indicator appears to the left of usage indicator in status bar.
     * This groups related Synthetic.new information together.
     */
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );

    _context.subscriptions.push(this.statusBarItem);
    this.statusBarItem.show();
  }

  /**
   * Set the indicator to idle state (no API key or tracking disabled)
   */
  setIdle(): void {
    this.currentState = ModelIndicatorState.Idle;
    this.modelCount = 0;
    this.unreadChanges = 0;
    this.updateStatusBar();
  }

  /**
   * Set the indicator to loading state
   */
  setLoading(): void {
    this.currentState = ModelIndicatorState.Loading;
    this.updateStatusBar();
  }

  /**
   * Set the indicator to ready state with model count
   */
  setReady(modelCount: number): void {
    this.currentState = ModelIndicatorState.Ready;
    this.modelCount = modelCount;
    this.updateStatusBar();
  }

  /**
   * Set the indicator to error state
   */
  setError(message: string): void {
    this.currentState = ModelIndicatorState.Error;
    this.updateStatusBar(message);
  }

  /**
   * Set the indicator to show changes detected
   */
  setChangesDetected(changes: ModelChange[]): void {
    this.currentState = ModelIndicatorState.ChangesDetected;
    this.unreadChanges = changes.length;
    this.updateStatusBar();
  }

  /**
   * Clear the changes notification
   */
  clearChanges(): void {
    this.unreadChanges = 0;
    if (this.currentState === ModelIndicatorState.ChangesDetected) {
      this.currentState = ModelIndicatorState.Ready;
    }
    this.updateStatusBar();
  }

  /**
   * Update the status bar display
   *
   * Design decision: Cache previous values to prevent unnecessary redraws.
   * VS Code status bar updates can cause visual flickering if done too frequently.
   */
  private updateStatusBar(errorMessage?: string): void {
    const text = this.buildText();
    const tooltip = this.buildTooltip(errorMessage);

    // Only update if values have actually changed
    if (
      this.lastText === text &&
      this.lastTooltip === tooltip &&
      this.lastState === this.currentState
    ) {
      return;
    }

    this.statusBarItem.text = text;
    this.statusBarItem.tooltip = tooltip;
    this.updateStatusColor();

    // Update cache
    this.lastText = text;
    this.lastTooltip = tooltip;
    this.lastState = this.currentState;
  }

  /**
   * Build the status bar text
   */
  private buildText(): string {
    switch (this.currentState) {
      case ModelIndicatorState.Idle:
        return "";
      case ModelIndicatorState.Loading:
        return "$(sync~spin) Models";
      case ModelIndicatorState.Ready:
        return `$(hubot) ${this.modelCount} models`;
      case ModelIndicatorState.Error:
        return "$(error) Models";
      case ModelIndicatorState.ChangesDetected:
        return `$(bell) ${this.unreadChanges} model changes`;
      default:
        return "";
    }
  }

  /**
   * Build the status bar tooltip
   */
  private buildTooltip(errorMessage?: string): string {
    switch (this.currentState) {
      case ModelIndicatorState.Idle:
        return "Model tracking: Waiting for API key";
      case ModelIndicatorState.Loading:
        return "Model tracking: Loading models...";
      case ModelIndicatorState.Ready:
        return `${this.modelCount} models available\\n\\nClick to view model details`;
      case ModelIndicatorState.Error:
        return `Model tracking error: ${errorMessage ?? "Unknown error"}\\n\\nClick to retry`;
      case ModelIndicatorState.ChangesDetected:
        return `${this.unreadChanges} model changes detected\\n\\nClick to view details`;
      default:
        return "";
    }
  }

  /**
   * Update the status bar color based on state
   */
  private updateStatusColor(): void {
    switch (this.currentState) {
      case ModelIndicatorState.Error:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.errorBackground"
        );
        break;
      case ModelIndicatorState.ChangesDetected:
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          "statusBarItem.warningBackground"
        );
        break;
      default:
        this.statusBarItem.backgroundColor = undefined;
        break;
    }
  }

  /**
   * Set the command to execute when the status bar item is clicked
   */
  setCommand(command: string): void {
    this.statusBarItem.command = command;
  }

  /**
   * Get the current state
   */
  getState(): ModelIndicatorState {
    return this.currentState;
  }

  /**
   * Get the current model count
   */
  getModelCount(): number {
    return this.modelCount;
  }

  /**
   * Get the number of unread changes
   */
  getUnreadChanges(): number {
    return this.unreadChanges;
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
