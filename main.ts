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
    file_path?: string; // Optional if we only use url in UI
    url: string;
    type: string;
}

interface IUpdate {
    id: string;
    author: string;
    timestamp: Date;
    content: string; // HTML
    isPinned: boolean;
}

interface ITask {
    id: string;
    name: string;
    status: string; // "Done", "Working on it", "Stuck", "Empty"
    progress: number; // 0-100
    timeline: { start: string | null; end: string | null };
    files: IFile[];
    updates: IUpdate[];
    group_id?: string; // Optional: for future grouping
}

interface IGroup {
    id: string;
    name: string;
    color: string;
    isCollapsed: boolean;
    tasks: ITask[];
}

interface IStatusOption {
    label: string;
    color: string;
}

// --- Constants & Config ---

const STATUS_OPTIONS: Record<string, IStatusOption> = {
    'Done': { label: 'Done', color: '#00c875' },
    'Working on it': { label: 'Working on it', color: '#fdab3d' },
    'Stuck': { label: 'Stuck', color: '#e2445c' },
    'To Do': { label: 'To Do', color: '#c4c4c4' }, // Added to match DB default
    'Empty': { label: '', color: '#c4c4c4' }
};

const DEFAULT_GROUP_COLOR = '#579bfc';

// --- State ---

let groups: IGroup[] = [
    {
        id: 'default',
        name: 'Main Board Tasks',
        color: '#00703c',
        isCollapsed: false,
        tasks: []
    }
];

let draggedTaskId: string | null = null;
let activeSidePanelTask: ITask | null = null;

// --- Data Fetching ---

async function fetchBoardData() {
    const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            attachments (*)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    // Map DB tasks to UI structure
    const mappedTasks: ITask[] = tasks.map((t: any) => ({
        id: t.id,
        name: t.title, // DB: title, UI: name
        status: t.status || 'To Do',
        progress: 0, // DB doesn't have progress yet, default 0
        timeline: {
            start: t.created_at ? t.created_at.split('T')[0] : null,
            end: t.due_date ? t.due_date.split('T')[0] : null
        },
        files: t.attachments ? t.attachments.map((a: any) => ({
            id: a.id,
            name: a.file_name,
            url: getFileUrl(a.file_path),
            type: a.file_type || 'file'
        })) : [],
        updates: [] // DB doesn't have updates yet
    }));

    // Put all tasks in default group for now (since we lack group_id in DB)
    groups[0].tasks = mappedTasks;
    renderBoard();
}

function getFileUrl(path: string) {
    const { data } = supabase.storage.from('saturday-files').getPublicUrl(path);
    return data.publicUrl;
}


// --- DOM Elements ---

const app = document.getElementById('app')!;


// --- Initialization ---

function init() {
    renderLayout();
    renderHome(); // Start with Home Page
    fetchBoardData(); // Load data from Supabase

    // Close popups on global click
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.popup-menu') && !target.closest('.cell-status') && !target.closest('.cell-timeline') && !target.closest('.cell-progress') && !target.closest('.date-picker-trigger')) {
            closeAllPopups();
        }
    });
}
// ...
// ...
function renderHome() {
    const mainArea = document.getElementById('main-area');
    if (!mainArea) return;

    mainArea.innerHTML = `
        <div style="padding: 40px; overflow-y: auto;">
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 8px; color: #323338;">Good morning, Khemmarin.k@lubd.com!</h1>
                    <div style="color: #676879;">Quickly access your recent boards, Inbox and workspaces</div>
                </div>
             </div>

             <div style="display: flex; gap: 24px;">
                 <div style="flex: 1;">
                    <!-- Recently Visited -->
                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 16px; font-weight: 500; margin-bottom: 16px; display: flex; align-items: center;">
                            <span style="margin-right: 8px;">▼</span> Recently visited
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
                            ${renderRecentCard('IT BO', 'work management > Business Tech', 'nav-it-bo')}
                            ${renderRecentCard('Tech Summary', 'work management > Business Tech')}
                            ${renderRecentCard('SOP and P&P', 'work management > Operations')}
                            ${renderRecentCard('Digital Engineering', 'work management > Operations')}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    `;
}

function renderRecentCard(title: string, path: string, id: string = '') {
    return `
        <div ${id ? `id="card-${id}"` : ''} onclick="${id ? `document.getElementById('${id}').click()` : 'window.location.reload()'}" style="background: white; border: 1px solid #d0d4e4; border-radius: 8px; overflow: hidden; cursor: pointer; transition: box-shadow 0.2s;">
            <div style="height: 80px; background: #e5f4ff; display: flex; flex-direction: column; padding: 10px;">
                <!-- Mock Layout -->
                <div style="height: 6px; width: 60%; background: #cce5ff; border-radius: 4px; margin-bottom: 6px;"></div>
                <div style="height: 6px; width: 80%; background: #cce5ff; border-radius: 4px; margin-bottom: 6px;"></div>
                <div style="height: 6px; width: 40%; background: #cce5ff; border-radius: 4px;"></div>
            </div>
            <div style="padding: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <span style="font-size: 12px;">📋</span>
                    <div style="font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
                </div>
                <div style="font-size: 11px; color: #9699a6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${path}</div>
            </div>
        </div>
    `;
}


function renderLayout() {
    app.innerHTML = `
        <header class="app-header">
            <div class="logo-area" style="color: #323338;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#E2445C" style="margin-right:8px"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                <span>monday work management</span>
            </div>
            <div style="display:flex; gap: 16px;">
                 <div style="background: #A76400; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">KK</div>
            </div>
        </header>
        
        <div class="app-body">
            <aside class="app-sidebar">
                <div class="sidebar-section">
                   <div class="sidebar-item active">
                        <span class="icon">
                            <svg class="sidebar-item-svg" viewBox="0 0 20 20"><path d="M8.53556 2.58362C9.33646 1.83445 10.6635 1.83445 11.4644 2.58361L16.4258 7.22455C17.0674 7.82473 17.5 8.79979 17.5 9.8732V15.5C17.5 16.8807 16.3807 18 15 18H14H12.5V13C12.5 12.4477 12.0523 12 11.5 12H10.5H8.5H7.5V13V18H6H5C3.61929 18 2.5 16.8807 2.5 15.5V9.8732C2.5 8.79979 2.93256 7.82473 3.57423 7.22455L8.53556 2.58362Z" fill="#0073ea" stroke="#0073ea" stroke-width="1.2"></path></svg>
                        </span>
                        Home
                   </div>
                   <!-- My work removed -->
                   <!-- AI Notetaker removed -->
                   <div class="sidebar-item">
                        <span class="icon">
                             <svg class="sidebar-item-svg" viewBox="0 0 20 20"><path d="M10 4.5C10.8284 4.5 11.5 5.17157 11.5 6C11.5 6.82843 10.8284 7.5 10 7.5C9.17157 7.5 8.5 6.82843 8.5 6C8.5 5.17157 9.17157 4.5 10 4.5ZM10 3C8.34315 3 7 4.34315 7 6C7 7.65685 8.34315 9 10 9C11.6569 9 13 7.65685 13 6C13 4.34315 11.6569 3 10 3ZM10 10.5C7.49 10.5 5.37893 11.8392 4.1482 13.7381C3.66311 14.4865 3.33649 15.2284 3.14925 15.8285C2.94639 16.4786 3.42896 17.1518 4.11051 17.1518H15.8895C16.571 17.1518 17.0536 16.4786 16.8507 15.8285C16.6635 15.2284 16.3369 14.4865 15.8518 13.7381C14.6211 11.8392 12.51 10.5 10 10.5ZM10 12C12.0366 12 13.626 13.1118 14.5907 14.5999C14.8698 15.0305 15.0747 15.3995 15.2017 15.6518H4.79831C4.92532 15.3995 5.13023 15.0305 5.40932 14.5999C6.37402 13.1118 7.9634 12 10 12Z" fill="currentColor"></path></svg>
                        </span>
                        Recents
                   </div>
                   <!-- More removed -->
                </div>

                <div class="sidebar-section">
                    <div class="workspace-header" style="padding-left:16px;">
                        <span>Favorites</span>
                        <span>></span>
                    </div>
                </div>

                <div class="sidebar-section">
                    <div class="workspace-header" style="justify-content:space-between; padding-left:16px;">
                        <span>Workspaces</span>
                        <span>...</span>
                    </div>
                    
                    <div style="padding: 0 16px; margin-bottom: 8px;">
                        <div class="sidebar-item" style="background: #f0f3f6; font-weight: 500; border: none; justify-content: space-between; padding: 6px 12px;">
                            <div style="display:flex; align-items:center;">
                                <span style="background: #FF5722; color: white; width: 22px; height: 22px; border-radius: 4px; display:flex; align-items:center; justify-content:center; font-size: 12px; margin-right: 8px;">B</span>
                                Business Tech
                            </div>
                            <span style="font-size: 16px;">+</span>
                        </div>
                    </div>
                    
                    <div class="workspace-list">
                        <div style="padding: 4px 24px; color: #666; font-size: 12px; display:flex; align-items:center;">
                           <span style="margin-right:4px;">▼</span> Business Tech Department
                        </div>
                         <div class="sidebar-item sub-item">
                            <span class="icon">📊</span>
                            Business Tech Dashboard
                        </div>
                        <div class="sidebar-item sub-item">
                            <span class="icon">📊</span>
                            Narai Mai Khao Dashboard
                        </div>
                        <div class="sidebar-item sub-item">
                            <span class="icon">📄</span>
                            Tech Summary
                        </div>
                        <div class="sidebar-item sub-item" id="nav-it-bo" style="cursor: pointer;">
                            <span class="icon">📋</span>
                            IT BO
                        </div>
                        <!-- ... other items -->
                    </div>
                </div>
            </aside>

            <main class="main-board" id="main-area">
                <!-- Content will be injected here. Default to Home Page -->
            </main>
        </div>


        <aside class="side-panel" id="side-panel">
            <div class="side-panel-header">
                <h2 id="panel-title" style="margin:0; font-size: 18px;">Task Details</h2>
                <button class="close-panel-btn" id="close-panel-btn">×</button>
            </div>
            <div class="side-panel-content" id="panel-content">
                <!-- Tabs and Content -->
            </div>
        </aside>
    `;

    document.getElementById('close-panel-btn')?.addEventListener('click', closeSidePanel);

    // Add Click Handler for IT BO
    document.getElementById('nav-it-bo')?.addEventListener('click', () => {
        // Clear main area and set up Board layout
        const mainArea = document.getElementById('main-area');
        if (mainArea) {
            mainArea.innerHTML = `
                <div class="board-header">
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <h1 class="board-title">IT BO</h1>
                        <div style="font-size: 13px; color: #666;">Main Table</div>
                    </div>
                </div>
                <div class="board-controls">
                    <button class="control-btn primary">New Item</button>
                    <div class="control-separator"></div>
                    <div class="search-box">
                        <span>🔍</span>
                        <input type="text" placeholder="Search">
                    </div>
                    <button class="control-btn">Person</button>
                    <button class="control-btn">Filter</button>
                    <button class="control-btn">Sort</button>
                </div>
                <div class="board-content" id="board-content">
                    <!-- Board Rendered Here -->
                </div>
            `;
            // Trigger board render
            renderBoard();

            // Highlight active Sidebar
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            document.getElementById('nav-it-bo')?.classList.add('active');
        }
    });
}

// --- Rendering Board ---

function renderBoard() {
    const container = document.getElementById('board-content');
    if (!container) return;

    // Save scroll position
    const scrollTop = container.scrollTop;

    container.innerHTML = '';

    groups.forEach(group => {
        container.appendChild(createGroupElement(group));
    });

    // Create new Group Button
    const addGroupBtn = document.createElement('button');
    addGroupBtn.textContent = '+ Add New Group';
    addGroupBtn.style.cssText = 'margin-top: 20px; padding: 10px 20px; border: 1px solid var(--border-color); background: white; cursor: pointer; border-radius: 4px; color: var(--text-primary);';
    addGroupBtn.onclick = () => {
        groups.push({
            id: 'g' + Date.now(),
            name: 'New Group',
            color: DEFAULT_GROUP_COLOR,
            isCollapsed: false,
            tasks: []
        });
        renderBoard();
    };
    container.appendChild(addGroupBtn);

    // Restore scroll
    container.scrollTop = scrollTop;
}

function createGroupElement(group: IGroup): HTMLElement {
    const container = document.createElement('div');
    container.className = 'group-container';

    // Handle Drop on Group (needed to move tasks to empty group)
    container.ondragover = (e) => {
        e.preventDefault();
        // Optional: Highlight group
    }
    container.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent bubbling
        if (draggedTaskId) {
            moveTaskToGroup(draggedTaskId, group.id);
        }
    }

    // Header
    const header = document.createElement('div');
    header.className = 'group-header';

    const toggle = document.createElement('div');
    toggle.className = 'group-toggle';
    toggle.innerHTML = group.isCollapsed ? '&#9654;' : '&#9660;';
    toggle.style.color = group.color;
    toggle.onclick = () => {
        group.isCollapsed = !group.isCollapsed;
        renderBoard();
    };

    const title = document.createElement('input');
    title.className = 'group-title';
    title.value = group.name;
    title.style.color = group.color;
    title.style.border = 'none';
    title.style.background = 'transparent';
    title.onchange = (e) => {
        group.name = (e.target as HTMLInputElement).value;
    };

    const colorPickerIcon = document.createElement('div');
    colorPickerIcon.style.cssText = `width: 16px; height: 16px; background: ${group.color}; border-radius: 4px; margin-left: 10px; cursor: pointer;`;
    colorPickerIcon.onclick = (e) => openGroupColorPicker(e, group);

    header.appendChild(toggle);
    header.appendChild(title);
    header.appendChild(colorPickerIcon);
    container.appendChild(header);

    if (group.isCollapsed) return container;

    // Table
    const table = document.createElement('table');
    table.className = 'task-table';

    // Table Header
    const thead = document.createElement('thead');
    thead.innerHTML = `
        <tr>
            <th style="width: 35%; padding-left: 40px;">Item</th>
            <th class="cell-status">Status</th>
            <th class="cell-timeline">Timeline</th>
            <th class="cell-progress">Progress</th>
            <th class="cell-conversation">Files</th>
            <th class="cell-conversation">Chat</th>
        </tr>
    `;
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement('tbody');
    group.tasks.forEach(task => {
        tbody.appendChild(createTaskRow(task, group.color, group.id));
    });

    // Add Item Row
    const addRow = document.createElement('tr');
    addRow.className = 'task-row add-row';
    const addCell = document.createElement('td');
    addCell.colSpan = 6;
    const addContainer = document.createElement('div');
    addContainer.style.display = 'flex';
    addContainer.style.alignItems = 'center';
    addContainer.style.borderLeft = `6px solid ${group.color}40`; // lighter color

    const addInput = document.createElement('input');
    addInput.placeholder = '+ Add Item';
    addInput.className = 'task-name-input';
    addInput.style.paddingLeft = '10px';
    addInput.onkeydown = (e) => {
        if (e.key === 'Enter' && addInput.value.trim()) {
            addTask(group.id, addInput.value.trim());
        }
    };

    addContainer.appendChild(addInput);
    addCell.appendChild(addContainer);
    addRow.appendChild(addCell);
    tbody.appendChild(addRow);

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
}

function createTaskRow(task: ITask, groupColor: string, groupId: string): HTMLElement {
    const tr = document.createElement('tr');
    tr.className = 'task-row';
    tr.draggable = true;

    // Drag Events
    tr.ondragstart = (e) => {
        draggedTaskId = task.id;
        tr.classList.add('dragging');
        e.dataTransfer?.setData('text/plain', task.id);
    };
    tr.ondragend = () => {
        tr.classList.remove('dragging');
        draggedTaskId = null;
    };

    // Drop Target Logic (Reordering)
    tr.ondragover = (e) => e.preventDefault();
    tr.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedTaskId && draggedTaskId !== task.id) {
            moveTask(draggedTaskId, task.id);
        }
    };

    // Name Cell
    const nameCell = document.createElement('td');
    nameCell.className = 'task-cell cell-name';
    nameCell.style.borderLeft = `6px solid ${groupColor}`;

    // Checkbox (Visual only)
    nameCell.innerHTML = `<span style="margin:0 8px; color: #ccc; cursor:pointer;" onclick="console.log('Select')">☐</span>`;

    const nameInput = document.createElement('input');
    nameInput.className = 'task-name-input';
    nameInput.value = task.name;
    nameInput.onchange = (e) => { task.name = (e.target as HTMLInputElement).value; };

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.innerHTML = '×';
    delBtn.title = "Delete Task";
    delBtn.onclick = () => deleteTask(groupId, task.id);

    nameCell.appendChild(nameInput);
    nameCell.appendChild(delBtn);
    tr.appendChild(nameCell);

    // Status Cell
    const statusCell = document.createElement('td');
    statusCell.className = 'task-cell cell-status';
    const statusDiv = document.createElement('div');
    statusDiv.className = 'status-label';
    const statusConfig = STATUS_OPTIONS[task.status] || STATUS_OPTIONS['Empty'];
    statusDiv.style.backgroundColor = statusConfig.color;
    statusDiv.textContent = statusConfig.label || '';
    statusDiv.title = statusConfig.label;
    if (!statusConfig.label) {
        statusDiv.style.background = '#c4c4c4'; // Default grey for empty
    }
    statusDiv.onclick = (e) => {
        e.stopPropagation();
        openStatusPicker(e, task);
    };
    statusCell.appendChild(statusDiv);
    tr.appendChild(statusCell);

    // Timeline Cell
    const timelineCell = document.createElement('td');
    timelineCell.className = 'task-cell cell-timeline';
    const timelineDiv = document.createElement('div');
    timelineDiv.style.cssText = 'background: #333; color: white; border-radius: 12px; padding: 2px 8px; font-size: 11px; display: inline-block; min-width: 80px;';

    if (task.timeline.start && task.timeline.end) {
        timelineDiv.textContent = `${formatDate(task.timeline.start)} - ${formatDate(task.timeline.end)}`;
        // Dynamic background logic based on date could go here
    } else {
        timelineDiv.style.background = '#d0d4e4';
        timelineDiv.textContent = '-';
    }
    timelineCell.className += ' date-picker-trigger';
    timelineCell.onclick = (e) => {
        e.stopPropagation();
        openDatePicker(e, task);
    };
    timelineCell.innerHTML = ''; // clear to append
    timelineCell.appendChild(timelineDiv);
    tr.appendChild(timelineCell);

    // Progress Cell
    const progressCell = document.createElement('td');
    progressCell.className = 'task-cell cell-progress';
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-bar-container';

    const track = document.createElement('div');
    track.className = 'progress-track';
    const fill = document.createElement('div');
    fill.className = 'progress-fill';
    fill.style.width = `${task.progress}%`;
    track.appendChild(fill);

    const text = document.createElement('span');
    text.className = 'progress-text';
    text.textContent = `${task.progress}%`;

    progressContainer.appendChild(track);
    progressContainer.appendChild(text);
    progressContainer.onclick = (e) => {
        e.stopPropagation();
        openProgressSlider(e, task);
    }
    progressCell.appendChild(progressContainer);
    tr.appendChild(progressCell);

    // Files Cell
    const filesCell = document.createElement('td');
    filesCell.className = 'task-cell cell-conversation'; // reusing size
    filesCell.innerHTML = task.files.length > 0 ? '📎' : '<span style="color:#ddd">+</span>';
    filesCell.onclick = () => openSidePanel(task, 'files');
    tr.appendChild(filesCell);

    // Conversation Cell
    const convCell = document.createElement('td');
    convCell.className = 'task-cell cell-conversation';
    convCell.innerHTML = `
        <div class="conversation-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${task.updates.length > 0 ? '#0073ea' : '#c3c6d4'}">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            ${task.updates.length > 0 ? `<span style="font-size:10px; margin-left:2px; color:#0073ea">${task.updates.length}</span>` : ''}
        </div>
    `;
    convCell.onclick = () => openSidePanel(task, 'updates');
    tr.appendChild(convCell);

    return tr;
}

// --- Data Helpers ---

async function addTask(groupId: string, name: string) {
    // 1. Insert into Supabase
    const { data, error } = await supabase
        .from('tasks')
        .insert([
            { title: name, status: 'To Do' }
        ])
        .select();

    if (error) {
        console.error("Error creating task:", error);
        alert("Failed to create task");
        return;
    }

    if (data && data.length > 0) {
        // 2. Refresh Board
        fetchBoardData();
    }
}

function deleteTask(groupId: string, taskId: string) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
        group.tasks = group.tasks.filter(t => t.id !== taskId);
        renderBoard();
    }
}

function moveTask(fromId: string, toId: string) {
    // Find source and dest
    let fromGroup: IGroup | undefined, fromIndex = -1;
    let toGroup: IGroup | undefined, toIndex = -1;

    groups.forEach(g => {
        const idx = g.tasks.findIndex(t => t.id === fromId);
        if (idx !== -1) { fromGroup = g; fromIndex = idx; }

        const idx2 = g.tasks.findIndex(t => t.id === toId);
        if (idx2 !== -1) { toGroup = g; toIndex = idx2; }
    });

    if (fromGroup && fromIndex !== -1 && toGroup && toIndex !== -1) {
        const [task] = fromGroup.tasks.splice(fromIndex, 1);
        toGroup.tasks.splice(toIndex, 0, task);
        renderBoard();
    }
}

function moveTaskToGroup(taskId: string, groupId: string) {
    let fromGroup: IGroup | undefined, fromIndex = -1;
    groups.forEach(g => {
        const idx = g.tasks.findIndex(t => t.id === taskId);
        if (idx !== -1) { fromGroup = g; fromIndex = idx; }
    });

    // Fix: Ensure groupId is used or acknowledge it is used
    const toGroup = groups.find(g => g.id === groupId);

    if (fromGroup && fromIndex !== -1 && toGroup) {
        if (fromGroup === toGroup) return; // Already there (at end? no, just cancel)
        const [task] = fromGroup.tasks.splice(fromIndex, 1);
        toGroup.tasks.push(task);
        renderBoard();
    }
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function closeAllPopups() {
    document.querySelectorAll('.popup-menu').forEach(el => el.remove());
}

// --- Popups Implementations ---

function openStatusPicker(e: MouseEvent, task: ITask) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'popup-menu';

    Object.values(STATUS_OPTIONS).forEach(opt => {
        if (!opt.label) return;
        const item = document.createElement('div');
        item.className = 'color-option';
        item.style.backgroundColor = opt.color;
        item.textContent = opt.label;
        item.onclick = () => {
            task.status = opt.label;
            if (task.status === 'Done') task.progress = 100;
            renderBoard();
            popup.remove();
        };
        popup.appendChild(item);
    });

    // Edit Labels Button
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit Labels';
    editBtn.style.cssText = 'width: 100%; border: none; background: #eee; padding: 4px; cursor: pointer; margin-top: 4px;';
    editBtn.onclick = () => alert('Edit Label Modal logic here (Mock)');
    popup.appendChild(editBtn);

    positionPopup(popup, e.target as HTMLElement);
    document.body.appendChild(popup);
}

function openGroupColorPicker(e: MouseEvent, group: IGroup) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'popup-menu';
    popup.style.width = '120px';
    popup.style.display = 'flex';
    popup.style.flexWrap = 'wrap';
    popup.style.gap = '4px';

    const colors = ['#00703c', '#A76400', '#FFEFD2', '#579bfc', '#a25ddc', '#e2445c'];
    colors.forEach(c => {
        const item = document.createElement('div');
        item.style.cssText = `width: 24px; height: 24px; background: ${c}; cursor: pointer; border-radius: 4px; border: 1px solid #ddd;`;
        item.onclick = () => {
            group.color = c;
            renderBoard();
            popup.remove();
        };
        popup.appendChild(item);
    });

    positionPopup(popup, e.target as HTMLElement);
    document.body.appendChild(popup);
}

function openProgressSlider(e: MouseEvent, task: ITask) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'popup-menu slider-container';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = task.progress.toString();
    slider.style.width = '100%';
    slider.oninput = (e: any) => {
        task.progress = parseInt(e.target.value);
        renderBoard(); // Real-time update
    };

    popup.appendChild(slider);
    positionPopup(popup, e.target as HTMLElement);
    document.body.appendChild(popup);
}

function openDatePicker(e: MouseEvent, task: ITask) {
    closeAllPopups();
    const popup = document.createElement('div');
    popup.className = 'popup-menu picker-container';

    const startInput = document.createElement('input');
    startInput.type = 'date';
    startInput.className = 'picker-input';
    if (task.timeline.start) startInput.value = task.timeline.start;

    const endInput = document.createElement('input');
    endInput.type = 'date';
    endInput.className = 'picker-input';
    if (task.timeline.end) endInput.value = task.timeline.end;

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Set Dates';
    saveBtn.className = 'picker-btn';
    saveBtn.style.background = '#0073ea';
    saveBtn.style.color = 'white';
    saveBtn.style.border = 'none';
    saveBtn.style.borderRadius = '4px';

    saveBtn.onclick = () => {
        task.timeline.start = startInput.value || null;
        task.timeline.end = endInput.value || null;
        renderBoard();
        popup.remove();
    };

    popup.appendChild(startInput);
    popup.appendChild(endInput);
    popup.appendChild(saveBtn);

    positionPopup(popup, e.target as HTMLElement);
    document.body.appendChild(popup);
}

function positionPopup(popup: HTMLElement, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    popup.style.top = (rect.bottom + 5) + 'px';
    popup.style.left = rect.left + 'px';

    // Adjust if off screen
    // (Simple check, can be improved)
    if (rect.left + 200 > window.innerWidth) {
        popup.style.left = (window.innerWidth - 220) + 'px';
    }
}

// --- Side Panel Details ---

function openSidePanel(task: ITask, tab: 'updates' | 'files' = 'updates') {
    activeSidePanelTask = task;
    const panel = document.getElementById('side-panel');
    const title = document.getElementById('panel-title');
    const content = document.getElementById('panel-content');
    if (!panel || !title || !content) return;

    panel.classList.add('open');
    title.textContent = task.name;

    renderSidePanelContent(tab);
}

function closeSidePanel() {
    const panel = document.getElementById('side-panel');
    if (panel) panel.classList.remove('open');
    activeSidePanelTask = null;
}

function renderSidePanelContent(activeTab: 'updates' | 'files') {
    const content = document.getElementById('panel-content');
    if (!content || !activeSidePanelTask) return;

    // Tabs
    const tabHTML = `
        <div style="display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px;">
            <div onclick="window.switchTab('updates')" style="padding: 10px 20px; cursor: pointer; border-bottom: 2px solid ${activeTab === 'updates' ? '#0073ea' : 'transparent'}; color: ${activeTab === 'updates' ? '#0073ea' : '#666'};">Updates</div>
            <div onclick="window.switchTab('files')" style="padding: 10px 20px; cursor: pointer; border-bottom: 2px solid ${activeTab === 'files' ? '#0073ea' : 'transparent'}; color: ${activeTab === 'files' ? '#0073ea' : '#666'};">Files</div>
        </div>
        <div id="tab-content"></div>
    `;

    content.innerHTML = tabHTML;
    const tabContent = document.getElementById('tab-content')!;

    if (activeTab === 'updates') {
        renderUpdatesTab(tabContent);
    } else {
        renderFilesTab(tabContent);
    }
}

// Global helper for simplified tab switching
(window as any).switchTab = (tab: 'updates' | 'files') => {
    if (activeSidePanelTask) renderSidePanelContent(tab);
}

function renderUpdatesTab(container: HTMLElement) {
    // Rich Editor
    const editor = document.createElement('div');
    editor.className = 'editor-container';
    editor.innerHTML = `
        <div class="editor-toolbar">
            <button class="editor-btn"><b>B</b></button>
            <button class="editor-btn"><i>I</i></button>
            <button class="editor-btn"><u>U</u></button>
            <button class="editor-btn">List</button>
        </div>
        <div contenteditable="true" class="editor-content" id="update-input" placeholder="Write an update..."></div>
        <div class="editor-footer">
            <button class="post-btn" id="post-update-btn">Update</button>
        </div>
    `;
    container.appendChild(editor);

    editor.querySelector('#post-update-btn')?.addEventListener('click', () => {
        const input = document.getElementById('update-input');
        if (input && input.textContent?.trim() && activeSidePanelTask) {
            activeSidePanelTask.updates.unshift({
                id: 'u' + Date.now(),
                author: 'KK',
                timestamp: new Date(),
                content: input.innerHTML,
                isPinned: false
            });
            renderUpdatesTab(container); // Re-render list
        }
    });

    // Feed
    if (activeSidePanelTask && activeSidePanelTask.updates) {
        activeSidePanelTask.updates.forEach(u => {
            const item = document.createElement('div');
            item.className = 'update-item';
            item.innerHTML = `
                <div class="update-header">
                    <strong>${u.author}</strong>
                    <span>${u.timestamp.toLocaleString()}</span>
                </div>
                <div class="update-body">${u.content}</div>
            `;
            container.appendChild(item);
        });
    }
}

function renderFilesTab(container: HTMLElement) {
    container.innerHTML = '';

    // File List
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '10px';
    list.style.marginBottom = '20px';

    if (activeSidePanelTask && activeSidePanelTask.files.length > 0) {
        activeSidePanelTask.files.forEach(f => {
            const row = document.createElement('div');
            row.style.cssText = 'display: flex; align-items: center; padding: 10px; border: 1px solid #ddd; border-radius: 8px; gap: 10px;';
            row.innerHTML = `
                <div style="font-size: 24px;">📄</div>
                <div style="flex: 1; overflow: hidden;">
                    <a href="${f.url}" target="_blank" style="display: block; font-weight: 500; color: #333; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</a>
                </div>
            `;
            list.appendChild(row);
        });
    } else {
        list.innerHTML = `<div style="text-align: center; color: #888; padding: 20px;">No files attached yet.</div>`;
    }
    container.appendChild(list);

    // Upload Button
    const uploadContainer = document.createElement('div');
    uploadContainer.style.textAlign = 'center';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    fileInput.onchange = handleFileUpload;

    const btn = document.createElement('button');
    btn.className = 'picker-btn';
    btn.style.width = 'auto';
    btn.textContent = '+ Add File';
    btn.onclick = () => fileInput.click();

    uploadContainer.appendChild(fileInput);
    uploadContainer.appendChild(btn);
    container.appendChild(uploadContainer);
}

async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !activeSidePanelTask) return;

    // 1. Upload to Supabase Storage
    const fileName = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
        .from('saturday-files') // Must match bucket name
        .upload(fileName, file);

    if (uploadError) {
        console.error('Upload Error:', uploadError);
        alert('Upload failed: ' + uploadError.message);
        return;
    }

    // 2. Insert into Attachments Table
    const { error: dbError } = await supabase
        .from('attachments')
        .insert([{
            task_id: activeSidePanelTask.id,
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            file_type: file.type
        }]);

    if (dbError) {
        console.error('DB Link Error:', dbError);
        alert('Failed to link file to task');
    } else {
        // 3. Refresh
        await fetchBoardData();

        // Find the task again to update the panel
        // Note: activeSidePanelTask might need to be re-referenced if objects were replaced
        const updatedTask = groups.flatMap(g => g.tasks).find(t => t.id === activeSidePanelTask!.id);
        if (updatedTask) {
            // Update the global ref just in case
            // (But openSidePanel sets it too)
            openSidePanel(updatedTask, 'files');
        }
    }
}

// Run
init();
