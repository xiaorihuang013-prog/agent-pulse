#!/usr/bin/env python3
"""Notification-only hook. Never emits approval decisions or changes Agent behavior."""
import json, os, pathlib, sys, time, uuid

def terminal_app():
    """Identify the terminal that hosts this agent, so the approval click can focus it.

    VS Code forks (Cursor) all report $TERM_PROGRAM='vscode', so the plain value is
    ambiguous. The fork injects an askpass path under its own app bundle, which is a
    reliable fingerprint: Cursor.app vs Visual Studio Code.app.
    """
    tp = os.environ.get('TERM_PROGRAM')
    if tp == 'vscode':
        for key in ('GIT_ASKPASS', 'VSCODE_GIT_ASKPASS_MAIN', 'VSCODE_GIT_ASKPASS_NODE'):
            val = os.environ.get(key) or ''
            if 'Cursor.app' in val:
                return 'Cursor'
            if 'Visual Studio Code.app' in val:
                return 'vscode'
    return tp

def main():
    row = json.load(sys.stdin)
    source = sys.argv[1]
    event = row.get('hook_event_name')
    if source not in ('Codex', 'Claude Code') or row.get('agent_id'):
        return
    kinds = {'PermissionRequest': 'approval', 'PostToolUse': 'resume',
             'PostToolUseFailure': 'resume', 'StopFailure': 'fail', 'Stop': 'resume', 'Interrupt': 'cancel'}
    kind = kinds.get(event)
    if event == 'Notification' and row.get('notification_type') == 'permission_prompt':
        kind = 'approval'
    if not kind:
        return
    # Auto/bypass modes must not produce a manual approval alert.
    if kind == 'approval' and row.get('permission_mode') in ('bypassPermissions', 'dontAsk', 'auto'):
        return
    dest = pathlib.Path.home() / 'Library/Application Support/agent-pulse/hook-events'
    dest.mkdir(parents=True, exist_ok=True, mode=0o700)
    payload = {'source': source, 'kind': kind, 'timestamp': time.time() * 1000,
               'path': row.get('transcript_path'), 'id': row.get('turn_id'),
               'requestId': row.get('tool_use_id') or row.get('tool_name') or 'permission',
               'terminalApp': terminal_app()}
    name = str(uuid.uuid4())
    tmp = dest / (name + '.tmp')
    tmp.write_text(json.dumps(payload), encoding='utf-8')
    os.chmod(tmp, 0o600)
    tmp.rename(dest / (name + '.json'))

try:
    main()
except Exception:
    pass  # A broken notification must never block the user's tool or task.
