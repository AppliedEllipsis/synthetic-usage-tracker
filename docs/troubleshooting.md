# Troubleshooting Guide

This guide covers common issues and their solutions for the Synthetic.new Usage Tracker extension.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Issues](#configuration-issues)
- [API Issues](#api-issues)
- [Display Issues](#display-issues)
- [Performance Issues](#performance-issues)
- [Development Issues](#development-issues)

## Installation Issues

### Extension Not Appearing After Installation

**Symptoms**: Extension is installed but doesn't appear in the status bar

**Possible Causes**:
- VSCode needs to be restarted
- Extension activation failed
- API key not configured

**Solutions**:
1. Restart VSCode completely
2. Check the Output panel for error messages
3. Configure your API key using the command palette

### Installation Fails

**Symptoms**: Installation from marketplace or .vsix file fails

**Possible Causes**:
- Network connectivity issues
- VSCode version too old
- Insufficient permissions

**Solutions**:
1. Check your internet connection
2. Ensure VSCode is version 1.96.0 or higher
3. Try installing as administrator (Windows) or with sudo (Linux/Mac)

### Extension Shows as "Disabled"

**Symptoms**: Extension is installed but disabled

**Solutions**:
1. Open Extensions view (`Ctrl+Shift+X`)
2. Find "Synthetic.new Usage Tracker"
3. Click "Enable"

## Configuration Issues

### API Key Not Saving

**Symptoms**: API key is entered but not saved

**Possible Causes**:
- VSCode SecretStorage not available
- Platform-specific storage issue

**Solutions**:
1. Ensure VSCode is up to date
2. Check platform-specific storage:
   - **Windows**: Uses Credential Manager
   - **macOS**: Uses Keychain
   - **Linux**: Uses libsecret

### Settings Not Applying

**Symptoms**: Configuration changes don't take effect

**Possible Causes**:
- VSCode settings not reloaded
- Configuration file corrupted

**Solutions**:
1. Reload VSCode window (`Ctrl+Shift+P` → "Developer: Reload Window")
2. Check `settings.json` for syntax errors
3. Reset settings to default and reconfigure

### Invalid API Key Error

**Symptoms**: "Invalid API key" error message

**Possible Causes**:
- API key format incorrect
- API key expired
- API key revoked

**Solutions**:
1. Verify API key starts with `syn_`
2. Check API key validity at [https://dev.synthetic.new/](https://dev.synthetic.new/)
3. Regenerate API key if needed

## API Issues

### "Network Error" Message

**Symptoms**: Extension shows network error

**Possible Causes**:
- No internet connection
- Firewall blocking requests
- API endpoint unreachable

**Solutions**:
1. Check internet connection
2. Verify firewall allows VSCode to make HTTPS requests
3. Check API endpoint is correct (default: `https://api.synthetic.new/v2`)

### "Rate Limit Exceeded" Message

**Symptoms**: Extension shows rate limit error

**Possible Causes**:
- Too many requests in short time
- API rate limit exceeded

**Solutions**:
1. Increase refresh interval in settings
2. Wait a few minutes before retrying
3. Reduce auto-refresh frequency

### "Authentication Failed" Message

**Symptoms**: Extension shows authentication error

**Possible Causes**:
- Invalid API key
- API key permissions insufficient

**Solutions**:
1. Verify API key is correct
2. Check API key has necessary permissions
3. Regenerate API key if needed

### Usage Data Not Updating

**Symptoms**: Usage information stays the same

**Possible Causes**:
- Auto-refresh disabled
- Network issues
- API errors

**Solutions**:
1. Check if auto-refresh is enabled
2. Manually refresh using command palette
3. Check Output panel for error messages
4. Verify network connectivity

## Display Issues

### Status Bar Not Showing

**Symptoms**: Usage indicator not visible in status bar

**Possible Causes**:
- Extension not activated
- Status bar position changed
- Extension error

**Solutions**:
1. Check if extension is activated
2. Check status bar position setting (left/right)
3. Check Output panel for errors
4. Reload VSCode window

### Incorrect Usage Display

**Symptoms**: Usage percentage or numbers seem wrong

**Possible Causes**:
- API response format changed
- Calculation error
- Display settings incorrect

**Solutions**:
1. Refresh usage data manually
2. Check display settings (show percentage, show raw numbers)
3. Verify API response format hasn't changed

### Color Indicators Not Working

**Symptoms**: Status bar doesn't change color based on usage

**Possible Causes**:
- Thresholds not configured
- Theme color issue
- Extension bug

**Solutions**:
1. Check warning and critical threshold settings
2. Try a different VSCode theme
3. Report the issue if it persists

## Performance Issues

### VSCode Slows Down

**Symptoms**: VSCode becomes slow after installing extension

**Possible Causes**:
- Refresh interval too short
- Too many API requests
- Memory leak

**Solutions**:
1. Increase refresh interval (minimum 60 seconds recommended)
2. Disable auto-refresh if not needed
3. Report issue if problem persists

### High Memory Usage

**Symptoms**: VSCode memory usage increases over time

**Possible Causes**:
- Memory leak in extension
- Too much data cached

**Solutions**:
1. Reload VSCode window
2. Disable and re-enable extension
3. Report issue with memory profile

### CPU Usage High

**Symptoms**: CPU usage spikes periodically

**Possible Causes**:
- Frequent API requests
- Auto-refresh interval too short

**Solutions**:
1. Increase refresh interval
2. Disable auto-refresh
3. Check for other extensions causing high CPU

## Development Issues

### Build Fails

**Symptoms**: `npm run compile` fails

**Possible Causes**:
- TypeScript compilation error
- Missing dependencies
- Incorrect configuration

**Solutions**:
1. Check TypeScript error messages
2. Run `npm install` to ensure dependencies are installed
3. Verify `tsconfig.json` is correct

### Tests Fail

**Symptoms**: `npm test` fails

**Possible Causes**:
- Test code error
- Dependencies not installed
- Environment issue

**Solutions**:
1. Check test error messages
2. Run `npm install` to ensure dependencies are installed
3. Try running tests in watch mode to debug

### Linting Errors

**Symptoms**: `npm run lint` fails

**Possible Causes**:
- Code style violations
- ESLint configuration issue

**Solutions**:
1. Run `npm run lint:fix` to auto-fix issues
2. Manually fix remaining issues
3. Check ESLint configuration

### Extension Host Crashes

**Symptoms**: Extension Development Host crashes when debugging

**Possible Causes**:
- Unhandled exception
- Infinite loop
- Memory issue

**Solutions**:
1. Check Developer Tools console for errors
2. Add error handling to your code
3. Use breakpoints to debug

## Getting Help

If you can't resolve your issue:

1. **Check the Documentation**: Review [Installation Guide](installation.md) and [API Documentation](api.md)
2. **Search Existing Issues**: Check [GitHub Issues](https://github.com/your-username/synthetic-usage-tracker/issues)
3. **Create a New Issue**: Include:
   - VSCode version
   - Extension version
   - Operating system
   - Steps to reproduce
   - Error messages
   - Screenshots if applicable

## Debugging

### Enable Debug Logging

To see detailed logs:

1. Open VSCode settings
2. Search for "Synthetic Usage Tracker"
3. Enable debug logging (if available)
4. Check the Output panel for logs

### Check Extension Output

1. Open the Output panel (`Ctrl+Shift+U`)
2. Select "Synthetic Usage Tracker" from the dropdown
3. Review the logs for errors or warnings

### Use Developer Tools

In the Extension Development Host:

1. Press `Ctrl+Shift+I` (or `Cmd+Shift+I` on macOS)
2. Check the Console tab for errors
3. Check the Network tab for API requests

## Reporting Bugs

When reporting a bug, please include:

1. **Environment**:
   - VSCode version
   - Extension version
   - Operating system
   - Node.js version (for development)

2. **Steps to Reproduce**:
   - Detailed steps to reproduce the issue
   - Expected behavior
   - Actual behavior

3. **Error Messages**:
   - Full error message from Output panel
   - Screenshots if applicable

4. **Configuration**:
   - Your current extension settings (with API key redacted)
   - Any custom configuration

## Feature Requests

For feature requests:

1. Check existing issues first
2. Use the "enhancement" label
3. Describe the feature in detail
4. Explain why it would be useful
5. Consider if you can contribute the feature

## Related Documentation

- [Installation Guide](installation.md)
- [Architecture Documentation](architecture.md)
- [API Documentation](api.md)
- [Development Guide](development.md)
