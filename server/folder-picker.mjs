import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const WINDOWS_FOLDER_PICKER_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select a project or workspace folder'
$dialog.ShowNewFolderButton = $false
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
`;

export async function browseFolder() {
  if (os.platform() !== 'win32') {
    const err = new Error('Folder browsing is currently supported only on Windows.');
    err.statusCode = 501;
    throw err;
  }

  const { stdout } = await execFileAsync(
    'powershell.exe',
    [
      '-NoProfile',
      '-STA',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      WINDOWS_FOLDER_PICKER_SCRIPT,
    ],
    { windowsHide: false, timeout: 120_000 },
  );
  const selectedPath = stdout.trim();
  return selectedPath || null;
}
