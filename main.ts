/**
 * NHG Saturday.com - Main Application Logic
 * Vanilla TypeScript
 */

import './index.css';
import { supabase } from './supabase';

// --- Interfaces ---

interface IFile {
    id: string;
    name: string;
    url: string;
    type: string;
}

interface IUpdate {
    id: string; author: string; timestamp: Date; content: string; isPinned: boolean;
}

interface ITask {
    id: string; name: string; status: string; progress: number;
    timeline: { start: string | null; end: string | null };
    files: IFile[]; updates: IUpdate[];
}

interface IGroup {
    id: string; name: string; color: string; isCollapsed: boolean; tasks: ITask[];
}

interface IStatusOption { label: string; color: string; }

// --- Constants ---

const STATUS_OPTIONS: Record<string, IStatusOption> = {
    'Done': { label: 'Done', color: '#00c875' },
    'Working on it': { label: 'Working on it', color: '#fdab3d' },
    'Stuck': { label: 'Stuck', color: '#e2445c' },
    'To Do': { label: 'To Do', color: '#c4c4c4' },
    'Empty': { label: '', color: '#c4c4c4' }
};

let groups: IGroup[] = [{ id: 'default', name: 'Main Board Tasks', color: '#00703c', isCollapsed: false, tasks: [] }];
let activeSidePanelTask: ITask | null = null;

// --- Data Fetching ---

async function fetchBoardData() {
    const { data: tasks, error } = await supabase.from('tasks').select('*, attachments (*)').order('created_at', { ascending: false });
    if (error) return;
    groups[0].tasks = tasks.map((t: any) => ({
        id: t.id, name: t.title, status: t.status || 'To Do', progress: 0,
        timeline: { start: t.created_at?.split('T')[0] || null, end: t.due_date?.split('T')[0] || null },
        files: t.attachments?.map((a: any) => ({ id: a.id, name: a.file_name, url: getFileUrl(a.file_path), type: a.file_type || 'file' })) || [],
        updates: []
    }));
    renderBoard();
}

function getFileUrl(path: string) {
    return supabase.storage.from('saturday-files').getPublicUrl(path).data.publicUrl;
}

// --- Rendering ---

function renderLayout() {
    const app = document.getElementById('app')!;
    app.innerHTML = `
        <header class="app-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <img src="/logo.png" style="height: 28px; width: auto; display: block;" alt="NHG Logo">
                <div style="font-weight: 600; font-size: 18px; letter-spacing: -0.5px;">NHG Saturday.com <span style="font-weight: 300;">work management</span></div>
            </div>
            <div style="background: #A76400; width: 32px; height: 32px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px;">KK</div>
        </header>
        
        <div class="app-body">
            <aside class="app-sidebar">
                <div class="sidebar-section">
                    <div class="sidebar-item active" id="nav-home">
                        <span class="icon">
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" width="18" height="18"><path d="M3.5 8.5L10 3L16.5 8.5V16.5H11.5V12.5H8.5V16.5H3.5V8.5Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </span> Home
                    </div>
                    <div class="sidebar-item" id="nav-recents">
                        <span class="icon">
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.3" width="18" height="18"><path d="M10 5V10L13 12M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C12.1 3 13.9 3.9 15.2 5.3L17 7M17 3V7H13" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                        </span> Recents
                    </div>
                </div>

                <div class="workspace-selector-container">
                    <div style="font-size: 14px; margin-bottom: 8px; color: #323338; display:flex; justify-content: space-between;">Workspace <span style="cursor:pointer">...</span></div>
                    <div class="workspace-box">
                        <span style="background: #FF5722; color: white; width: 20px; height: 20px; border-radius: 4px; display:flex; align-items:center; justify-content:center; font-size: 11px; margin-right: 8px;">B</span>
                        <span style="flex:1; font-weight: 500;">Business Tech</span>
                        <span style="font-size: 12px; margin: 0 4px;">⌄</span>
                        <span style="background: #0073ea; color: white; border-radius: 4px; width: 18px; height: 18px; display:flex; align-items:center; justify-content:center;">+</span>
                    </div>
                </div>

                <div class="workspace-list">
                    <div style="padding: 4px 16px; font-size: 12px; color: #676879;">▼ Business Tech Department</div>
                    <div class="sidebar-item sub-item" id="nav-tech-summary" style="cursor: pointer;">
                        <span class="icon">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M4 5C4 4.44772 4.44772 4 5 4H15C15.5523 4 16 4.44772 16 5V15C16 15.5523 15.5523 16 15 16H5C4.44772 16 4 15.5523 4 15V5ZM10 6H6V14H10V6Z"></path></svg>
                        </span> Tech Summary
                    </div>
                    <div class="sidebar-item sub-item" id="nav-it-bo" style="cursor: pointer;">
                        <span class="icon">
                            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M4 5C4 4.44772 4.44772 4 5 4H15C15.5523 4 16 4.44772 16 5V15C16 15.5523 15.5523 16 15 16H5C4.44772 16 4 15.5523 4 15V5ZM10 6H6V14H10V6Z"></path></svg>
                        </span> IT BO
                    </div>
                </div>
            </aside>

            <main class="main-board" id="main-area">
                <!-- Content Injected -->
            </main>
        </div>

        <aside class="side-panel" id="side-panel">
            <div style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between;">
                <h2 id="panel-title" style="margin:0; font-size: 18px;"></h2>
                <button onclick="document.getElementById('side-panel').classList.remove('open')" style="border:none; background:none; cursor:pointer; font-size: 20px;">×</button>
            </div>
            <div id="panel-content" style="padding: 20px;"></div>
        </aside>
    `;

    document.getElementById('nav-home')?.addEventListener('click', renderHome);
    document.getElementById('nav-recents')?.addEventListener('click', renderRecents);
    setupBoardNavigation();
}

function setupBoardNavigation() {
    document.getElementById('nav-it-bo')?.addEventListener('click', () => renderBoardPage('IT BO', 'nav-it-bo'));
    document.getElementById('nav-tech-summary')?.addEventListener('click', () => renderBoardPage('Tech Summary', 'nav-tech-summary'));
}

function renderBoardPage(title: string, navId: string) {
    const mainArea = document.getElementById('main-area')!;
    mainArea.innerHTML = `
        <div class="board-header-section">
            <div class="board-top-row">
                <div class="board-title-text">${title} <span style="font-size: 14px; color: #676879;">⌄</span></div>
            </div>
            <div class="board-tabs">
                <div class="tab-item active">Main table</div>
                <div class="tab-item">+</div>
            </div>
        </div>

        <div class="board-toolbar">
            <div class="toolbar-btn primary">New item <span style="margin-left:8px; border-left:1px solid #fff; padding-left:4px;">⌄</span></div>
            <div class="toolbar-btn">🔍 Search</div>
            <div class="toolbar-btn">👤 Person</div>
            <div class="toolbar-btn">⎔ Filter ⌄</div>
            <div class="toolbar-btn">⇅ Sort</div>
            <div class="toolbar-btn">👁 Hide</div>
            <div class="toolbar-btn">⊞ Group by ⌄</div>
        </div>

        <div class="board-scroll-area" id="board-content"></div>
    `;
    renderBoard();
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.getElementById(navId)?.classList.add('active');
}

function renderHome() {
    const mainArea = document.getElementById('main-area')!;
    mainArea.innerHTML = `<div style="padding: 40px;"><h1>Welcome to NHG Saturday.com</h1></div>`;
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-home')?.classList.add('active');
}

function renderRecents() {
    const mainArea = document.getElementById('main-area')!;
    mainArea.innerHTML = `<div style="padding: 40px;"><h1>Recent Boards</h1></div>`;
    document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-recents')?.classList.add('active');
}

function renderBoard() {
    const container = document.getElementById('board-content');
    if (!container) return;
    container.innerHTML = '';
    groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.style.margin = '20px 32px';
        groupEl.innerHTML = `
            <div style="color: ${group.color}; font-weight: 600; font-size: 18px; margin-bottom: 8px;">⌄ ${group.name}</div>
            <table class="task-table">
                <thead>
                    <tr>
                        <th style="width: 30%;">Item</th>
                        <th style="width: 50px; text-align:center;">Chat</th>
                        <th style="width: 80px; text-align:center;">Person</th>
                        <th style="width: 120px; text-align:center;">Status</th>
                        <th style="width: 140px; text-align:center;">Timeline</th>
                        <th style="width: 80px; text-align:center;">Files</th>
                    </tr>
                </thead>
                <tbody>
                    ${group.tasks.map(task => `
                        <tr class="task-row">
                            <td style="border-left: 6px solid ${group.color}">${task.name}</td>
                            <td style="text-align:center; cursor: pointer;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#c3c6d4"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                            </td>
                            <td><div class="avatar-circle">+</div></td>
                            <td style="background: ${STATUS_OPTIONS[task.status]?.color || '#ccc'}; color: white; text-align:center;">${task.status}</td>
                            <td style="text-align:center;">-</td>
                            <td style="text-align:center; cursor: pointer;">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#c3c6d4"><path d="M16.5 6H4.5C3.67 6 3 6.67 3 7.5V16.5C3 17.33 3.67 18 4.5 18H16.5C17.33 18 18 17.33 18 16.5V7.5C18 6.67 17.33 6 16.5 6ZM16.5 16.5H4.5V7.5H16.5V16.5ZM12 12V9H10.5V12H7.5V13.5H10.5V16.5H12V13.5H15V12H12Z"/></svg>
                            </td>
                        </tr>
                    `).join('')}
                    <tr class="task-row" style="background: #fcfcfc">
                        <td colspan="6" style="color: #676879; cursor: pointer;">+ Add Item</td>
                    </tr>
                </tbody>
            </table>
        `;
        container.appendChild(groupEl);
    });
}

function init() {
    renderLayout();
    renderHome();
    fetchBoardData();
}

init();
