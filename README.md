# Windows Clipboard Manager

A simple clipboard history app that lives in the Windows system tray. Keep recent text and images, browse small previews, and click an entry to copy it back to the clipboard. Paste it wherever you want using **Ctrl+V**.

The app runs locally and does not upload your clipboard history to a server. The current interface is in Turkish.

[Türkçe README](README.tr.md)

## Download and run on Windows

**[Download for Windows x64 — v0.1.1 (ZIP)](https://github.com/EfeDogan/Windows_Clipboard_Manager/releases/download/v0.1.1/Clipboard-Manager-0.1.1-windows-x64.zip)** · [Release notes](https://github.com/EfeDogan/Windows_Clipboard_Manager/releases/tag/v0.1.1)

1. Download the ZIP using the link above.
2. Right-click the downloaded ZIP and choose **Extract All**. Keep the extracted folder in a permanent location.
3. Open that folder and double-click **Clipboard Manager.exe**.
4. Click its system tray icon or press **Ctrl+Shift+V** to open your history. If the icon is hidden, check the tray overflow next to the clock.

**No Node.js, Git, terminal commands, or separate installation are required.** Keep the EXE together with the other extracted files; do not run it from inside the ZIP.

This is a preview build for Windows x64. The package is unsigned. Automated native Windows clipboard and UI tests pass; manual testing with Explorer and installed document thumbnail providers is still needed. It runs from the extracted folder and does not include a setup wizard. The current app interface is in Turkish.

Use the download link above or the ZIP under **Assets** on the release page. GitHub's automatic **Source code** downloads are for development and do not contain a ready-to-run app.

## Features

- Text history, screenshot thumbnails, and copied file/document references with previews where available.
- Search and keyboard navigation.
- Always-visible buttons for editing text, pinning, copying, previewing, and deleting entries.
- Entries keep their original positions when selected, copied again, edited, or pinned. Pinned entries survive ordinary history cleanup.
- Private mode pauses history capture without deleting existing entries.
- Configurable history limits: 50, 100, 200, or 500 unpinned entries.
- Optional launch at Windows sign-in.
- Tray menu with a private-mode toggle and an exit command.

## Usage

| Action | How |
| --- | --- |
| Open or hide the panel | Click the tray icon or press **Ctrl+Shift+V** |
| Find an entry | Type in the search field |
| Navigate search results | Press **↑** or **↓** |
| Copy the selected search result | Press **Enter** while the search field is focused |
| Copy an entry | Click the entry or its copy button |
| Paste copied content | Press **Ctrl+V** in your destination app |
| Close the panel | Press **Esc** or click outside it |
| Edit saved text | Click the pencil button; save changes, then copy the entry when needed |
| View full content | Click the book button; the image button also opens an image preview |
| Pin or unpin an entry | Click its pin button |
| Pause recording | Enable **Gizli kip** (private mode) |
| Open settings | Click **Ayarlar** |
| Clear history | Click **Geçmişi temizle** and confirm |
| Quit | Right-click the tray icon and choose **Çıkış** |

Copying an entry closes the panel. The application does **not** automatically paste into another window. Duplicate clipboard content reuses the existing entry without moving it. Selecting an entry only changes its circle indicator. New entries appear at the top; existing entries retain their relative order, including pinned entries.

Clearing history preserves pinned entries unless you explicitly choose to include them. It does not clear the current system clipboard. If the global shortcut is unavailable, use the tray icon.

To enable launch at sign-in, open **Ayarlar**, check **Windows açıldığında başlat**, and save. Keep the packaged application in the same location after enabling this option.

## Local storage and privacy

History and settings are stored in `history.json` inside Electron's application data directory, normally:

```text
%APPDATA%/clipboard-manager/history.json
```

Use **Ayarlar → Veri klasörünü aç** to open the actual directory.

- History is stored **unencrypted** on the local computer.
- Private mode prevents new clipboard content from being saved. Existing history remains available, and content copied while private mode was active is not added just because you turn the mode off.
- Passwords and other sensitive content are not detected automatically. Enable private mode before copying them.
- The default history limit is 100 unpinned entries. Up to 100 pinned entries are supported.
- The stored-content budget is 50 MB, with a 10 MB limit per entry. For images, the entry limit applies to the stored base64 PNG representation. Older unpinned entries are removed to enforce the budget.

## Supported content and limitations

- Plain text and clipboard images are supported. Clipboard images, such as screenshots, are stored and copied back as PNG.
- Files copied in Explorer are stored as file references, including image files, documents, folders, and multi-file selections. Selecting a file entry restores a native file copy to the clipboard, so it can be pasted into Explorer. It does not merely copy the path as text.
- Image files show a thumbnail and their path. Windows document thumbnails depend on the available thumbnail provider; when unavailable, the path remains visible. Multiple-file entries show the first path and a count; the preview lists all paths.
- File history stores paths and available thumbnails, not backups of file contents. Files must remain at their original paths to be copied again. Missing files produce an error without replacing the current clipboard.
- Rich text formatting and source application information are not retained. Virtual files that have not been saved to disk, such as some email attachments, are not supported.
- Clipboard changes are checked every 700 ms, so very rapid consecutive copies may be missed.
- The executable's File Explorer icon currently uses Electron's default icon; the tray and window use the app icon.
- Windows tray placement, multiple monitors, DPI scaling, launch at sign-in, and compatibility with different Windows applications still need validation on a real Windows machine.

## Development: run from source

### Requirements

- Windows x64 for the intended desktop experience.
- [Node.js](https://nodejs.org/) **22.12.0 or newer**, including npm.
- [Git](https://git-scm.com/downloads), or download and extract this repository using GitHub's **Code → Download ZIP** option.

Open PowerShell or a terminal and run:

```powershell
git clone https://github.com/EfeDogan/Windows_Clipboard_Manager.git
cd Windows_Clipboard_Manager
npm ci
npm start
```

`npm ci` installs the project dependencies and downloads Electron. An internet connection is required for this step. The application starts in the system tray rather than opening a normal taskbar window. Check Windows' hidden tray icons if you do not immediately see it.

If you downloaded the source ZIP instead of cloning it, open a terminal in the extracted project folder and run `npm ci`, followed by `npm start`.

## Development: build the Windows ZIP

To create a distributable Windows x64 package:

```powershell
npm run dist:win
```

The output is:

```text
release/Clipboard-Manager-0.1.1-windows-x64.zip
```

To use that package on Windows:

1. Extract the **entire ZIP** into a permanent folder.
2. Run **Clipboard Manager.exe** from that folder.
3. Open the panel by clicking its tray icon or pressing **Ctrl+Shift+V**.

Keep the EXE together with its supporting files. The packaged application does not require Node.js or npm on the destination computer. This version is distributed as a ZIP rather than an installation wizard, and its executable is not code-signed.

For an unpacked application folder instead of a ZIP:

```powershell
npm run pack:win
```

The application folder is written to `release/win-unpacked/`. Windows ZIP packages can also be built on Linux using the same commands.

## Development checks

Run the history persistence and behavior tests:

```sh
npm test
```

On Linux with Xvfb installed, run the integration smoke test:

```sh
npm run test:smoke
```

The smoke test uses a temporary application profile and a separate X11 display. It checks native text/image/file clipboard operations, multi-file selections, missing-file handling, private mode, fixed entry ordering, the active circle indicator, file search/previews, editing, and settings. It also writes a panel screenshot with sample content to `test-output/panel.png`. Run it through the provided script to keep test clipboard writes off your regular desktop clipboard.

History/URI parsing tests and the Linux native clipboard/UI smoke test cover these behaviors. The [Windows checks workflow](https://github.com/EfeDogan/Windows_Clipboard_Manager/actions/runs/41295748536) passed the same tests against the native Windows clipboard in GitHub Actions. Interactive testing with Explorer and document thumbnail providers is still needed.

The application has no production npm dependencies. The build toolchain may report dependency advisories; inspect them with `npm audit`. Development dependencies are excluded from the packaged application's `app.asar`.
