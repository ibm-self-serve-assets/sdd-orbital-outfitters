# Injecting `.env` Variables into macOS GUI Applications

By default, macOS GUI applications (apps launched from Finder, the Dock, Spotlight, or IDEs like VS Code) do not inherit environment variables defined in shell configuration files like `~/.zshrc` or `~/.bash_profile`. To make your localized variables available to GUI applications, you must inject them into the system's user-level session manager (`launchd`).

This guide outlines how to configure a permanent background agent that reads your `.env` file and updates `launchd` dynamically.

---

## Complete Setup Guide (Permanent Method)

This method creates a personal Launch Agent that automatically reads your `.env` file and injects its variables every time your Mac boots up or you log into your user account.

### Step 1: Create the Launch Agent Configuration File
Open your terminal and create a new property list (`.plist`) file inside your user's LaunchAgents directory:

```bash
nano ~/Library/LaunchAgents/com.user.loadenv.plist
```

### Step 2: Paste the Configuration XML
Copy and paste the code block below into the file. 

* **Crucial:** Ensure the path under `ProgramArguments` points to the exact absolute path of your `.env` file (e.g., `/Users/anthonystevens/.bob/.env`). Do not use tildes (`~`) for home directories here.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://apple.com">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.user.loadenv</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/zsh</string>
        <string>-c</string>
        <string>grep -v '^#' /Users/anthonystevens/.bob/.env | while IFS='=' read -r key value; do launchctl setenv "\(key" "\)value"; done</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```
*(If editing with nano, press `Ctrl + O` then `Enter` to save, and `Ctrl + X` to exit).*

### Step 3: Register the Service with macOS
Register the plist file using the modern macOS `bootstrap` framework:

```bash
launchctl bootstrap gui/\$(id -u) ~/Library/LaunchAgents/com.user.loadenv.plist
```

### Step 4: Run the Script Instantly
The agent is configured to run at startup. To force it to run right now and populate your environment variables immediately without logging out, execute a `kickstart` command:

```bash
launchctl kickstart -k gui/\$(id -u)/com.user.loadenv
```

---

## Verification

To verify that `launchd` successfully loaded the variables from your configuration file, query a specific key using `getenv`:

```bash
launchctl getenv DB_USER
```
If the terminal prints your variable value accurately, the setup is working successfully.

---

## Maintenance & Usage Rules

* **Updating Variables:** Changes made to your `.env` file do not automatically stream to `launchd` in real-time. Whenever you add, remove, or change a variable inside your `.env` file, refresh the system context by re-running the kickstart command:
  ```bash
  launchctl kickstart -k gui/\$(id -u)/com.user.loadenv
  ```
* **Restarting Applications:** Environment variables are evaluated only when an application initializes. If your target GUI app (e.g., VS Code, Xcode, Docker) was already open when you updated your variables, you must completely quit (`Cmd + Q`) and restart the app for the changes to apply.
* **Overwriting / Troubleshooting:** If you ever modify the underlying structural properties of the `.plist` file itself, you must tell macOS to unregister the old configuration before reloading it:
  ```bash
  launchctl bootout gui/\$(id -u) ~/Library/LaunchAgents/com.user.loadenv.plist
  launchctl bootstrap gui/\$(id -u) ~/Library/LaunchAgents/com.user.loadenv.plist
  ```
