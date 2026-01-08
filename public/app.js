// Eva's Weekly Calendar Application
// ===================================

// Configuration
const CONFIG = {
    startDate: new Date(2025, 0, 13), // Monday 13th Jan 2025
    timeSlots: [
        { id: 'morning', label: '6-9am' },
        { id: 'midday', label: '9am-1pm' },
        { id: 'afternoon', label: '1-5pm' },
        { id: 'evening', label: '5-8pm' }
    ],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    defaultPeople: ['Mum', 'Dad', 'Megan', 'EDS', 'Lisa', 'Granny'],
    defaultEmail: 'ccurran@gmail.com',
    numberOfWeeks: 12
};

// State
let state = {
    currentWeekIndex: 0,
    weeks: {},
    customPeople: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadState();
    initializeWeeks();
    renderWeekTabs();
    renderCalendar();
    renderMobileCalendar();
    setupEventListeners();
    setupMobileNavigation();
});

// Load state from server (shared) or localStorage (backup)
async function loadState() {
    // Try to load from server first (shared data)
    try {
        const response = await fetch('/api/calendar');
        if (response.ok) {
            const serverData = await response.json();
            if (serverData && serverData.weeks && Object.keys(serverData.weeks).length > 0) {
                state = { ...state, ...serverData };
                console.log('Loaded calendar data from server');
                // Also save to localStorage as backup
                localStorage.setItem('evaCalendarState', JSON.stringify(state));
                return;
            }
        }
    } catch (error) {
        console.log('Server not available, using localStorage');
    }
    
    // Fallback to localStorage
    const savedState = localStorage.getItem('evaCalendarState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state = { ...state, ...parsed };
            console.log('Loaded calendar data from localStorage');
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }
}

// Save state to server (shared) and localStorage (backup)
function saveState() {
    // Save to localStorage as backup
    localStorage.setItem('evaCalendarState', JSON.stringify(state));
    
    // Save to server for sharing with other users
    syncWithBackend();
}

// Sync calendar data with backend (saves for all users)
async function syncWithBackend() {
    try {
        const response = await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        if (response.ok) {
            console.log('Calendar saved to server');
        }
    } catch (error) {
        console.log('Backend sync skipped - running offline');
    }
}

// Initialize weeks data structure
function initializeWeeks() {
    for (let i = 0; i < CONFIG.numberOfWeeks; i++) {
        const weekKey = getWeekKey(i);
        if (!state.weeks[weekKey]) {
            state.weeks[weekKey] = createEmptyWeek();
        }
    }
}

// Create empty week structure
function createEmptyWeek() {
    const week = {};
    CONFIG.days.forEach(day => {
        week[day] = {};
        CONFIG.timeSlots.forEach(slot => {
            week[day][slot.id] = [];
        });
    });
    return week;
}

// Get week key from index
function getWeekKey(weekIndex) {
    const weekStart = new Date(CONFIG.startDate);
    weekStart.setDate(weekStart.getDate() + (weekIndex * 7));
    return `week_${weekStart.toISOString().split('T')[0]}`;
}

// Get week start date from index
function getWeekStartDate(weekIndex) {
    const date = new Date(CONFIG.startDate);
    date.setDate(date.getDate() + (weekIndex * 7));
    return date;
}

// Format date for display
function formatDate(date) {
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
}

// Get all available people (default + custom)
function getAllPeople() {
    return [...CONFIG.defaultPeople, ...state.customPeople];
}

// Render week tabs
function renderWeekTabs() {
    const tabsContainer = document.getElementById('weekTabs');
    tabsContainer.innerHTML = '';
    
    for (let i = 0; i < CONFIG.numberOfWeeks; i++) {
        const weekStart = getWeekStartDate(i);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        const tab = document.createElement('button');
        tab.className = `week-tab ${i === state.currentWeekIndex ? 'active' : ''}`;
        tab.dataset.weekIndex = i;
        tab.innerHTML = `
            Week ${i + 1}
            <span class="week-date">${formatDate(weekStart)} - ${formatDate(weekEnd)}</span>
        `;
        tab.addEventListener('click', () => selectWeek(i));
        tabsContainer.appendChild(tab);
    }
    
    // Scroll to active tab
    setTimeout(() => {
        const activeTab = tabsContainer.querySelector('.week-tab.active');
        if (activeTab) {
            activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
    }, 100);
}

// Select a week
function selectWeek(weekIndex) {
    state.currentWeekIndex = weekIndex;
    saveState();
    renderWeekTabs();
    renderCalendar();
    renderMobileCalendar();
}

// Render calendar grid (desktop)
function renderCalendar() {
    const tbody = document.getElementById('calendarBody');
    tbody.innerHTML = '';
    
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey] || createEmptyWeek();
    
    // Update header with dates
    const headerCells = document.querySelectorAll('.day-header');
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    
    headerCells.forEach((cell, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        cell.innerHTML = `${CONFIG.days[index]}<br><small>${formatDate(date)}</small>`;
    });
    
    CONFIG.timeSlots.forEach(slot => {
        const row = document.createElement('tr');
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = slot.label;
        row.appendChild(timeCell);
        
        // Day cells
        CONFIG.days.forEach(day => {
            const cell = document.createElement('td');
            cell.className = 'calendar-slot';
            
            const content = document.createElement('div');
            content.className = 'slot-content';
            
            // Render existing people in slot
            const people = weekData[day]?.[slot.id] || [];
            people.forEach((person, index) => {
                content.appendChild(createPersonChip(person, day, slot.id, index));
            });
            
            // Add dropdown to add more people
            content.appendChild(createPersonSelect(day, slot.id));
            
            cell.appendChild(content);
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// Create a person chip (for display in slot)
function createPersonChip(person, day, slotId, index) {
    const chip = document.createElement('div');
    chip.className = 'selected-person';
    chip.dataset.person = isDefaultPerson(person) ? person : 'custom';
    
    chip.innerHTML = `
        <span class="person-name">${person}</span>
        <button class="remove-person" title="Remove">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    chip.querySelector('.remove-person').addEventListener('click', () => {
        removePersonFromSlot(day, slotId, index);
    });
    
    return chip;
}

// Create person select dropdown
function createPersonSelect(day, slotId) {
    const container = document.createElement('div');
    container.className = 'select-container';
    
    const select = document.createElement('select');
    select.className = 'person-select';
    
    // Default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '+ Add person...';
    select.appendChild(defaultOption);
    
    // Add all available people as options
    getAllPeople().forEach(person => {
        const option = document.createElement('option');
        option.value = person;
        option.textContent = person;
        select.appendChild(option);
    });
    
    // Add "Custom..." option
    const customOption = document.createElement('option');
    customOption.value = '__custom__';
    customOption.textContent = '✏️ Custom...';
    select.appendChild(customOption);
    
    // Handle selection
    select.addEventListener('change', (e) => {
        if (e.target.value === '__custom__') {
            // Show custom input
            showCustomInput(container, day, slotId);
            e.target.value = '';
        } else if (e.target.value) {
            addPersonToSlot(day, slotId, e.target.value);
            e.target.value = '';
        }
    });
    
    container.appendChild(select);
    return container;
}

// Show custom input field
function showCustomInput(container, day, slotId) {
    // Remove existing custom input if any
    const existing = container.querySelector('.custom-input-container');
    if (existing) existing.remove();
    
    const inputContainer = document.createElement('div');
    inputContainer.className = 'custom-input-container';
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'custom-slot-input';
    input.placeholder = 'Enter name...';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'custom-add-btn';
    addBtn.textContent = 'Add';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'custom-cancel-btn';
    cancelBtn.innerHTML = '✕';
    
    addBtn.addEventListener('click', () => {
        const name = input.value.trim();
        if (name) {
            // Add to custom people list if not already there
            if (!state.customPeople.includes(name) && !CONFIG.defaultPeople.includes(name)) {
                state.customPeople.push(name);
            }
            addPersonToSlot(day, slotId, name);
        }
    });
    
    cancelBtn.addEventListener('click', () => {
        inputContainer.remove();
    });
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addBtn.click();
        }
    });
    
    inputContainer.appendChild(input);
    inputContainer.appendChild(addBtn);
    inputContainer.appendChild(cancelBtn);
    container.appendChild(inputContainer);
    
    // Focus the input
    setTimeout(() => input.focus(), 50);
}

// Check if person is a default one
function isDefaultPerson(person) {
    return CONFIG.defaultPeople.includes(person);
}

// Render mobile calendar (card view)
function renderMobileCalendar() {
    const mobileCalendar = document.getElementById('mobileCalendar');
    mobileCalendar.innerHTML = '';
    
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey] || createEmptyWeek();
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    
    CONFIG.days.forEach((day, dayIndex) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + dayIndex);
        
        const dayCard = document.createElement('div');
        dayCard.className = 'mobile-day-card';
        
        const header = document.createElement('div');
        header.className = 'mobile-day-header';
        header.textContent = `${day} - ${formatDate(date)}`;
        dayCard.appendChild(header);
        
        CONFIG.timeSlots.forEach(slot => {
            const timeSlot = document.createElement('div');
            timeSlot.className = 'mobile-time-slot';
            
            const label = document.createElement('div');
            label.className = 'mobile-time-label';
            label.textContent = slot.label;
            timeSlot.appendChild(label);
            
            const content = document.createElement('div');
            content.className = 'mobile-slot-content';
            
            // Render existing people
            const people = weekData[day]?.[slot.id] || [];
            people.forEach((person, index) => {
                content.appendChild(createPersonChip(person, day, slot.id, index));
            });
            
            // Add dropdown
            content.appendChild(createPersonSelect(day, slot.id));
            
            timeSlot.appendChild(content);
            dayCard.appendChild(timeSlot);
        });
        
        mobileCalendar.appendChild(dayCard);
    });
}


// Add person to slot
function addPersonToSlot(day, slotId, person) {
    const weekKey = getWeekKey(state.currentWeekIndex);
    
    if (!state.weeks[weekKey]) {
        state.weeks[weekKey] = createEmptyWeek();
    }
    
    if (!state.weeks[weekKey][day]) {
        state.weeks[weekKey][day] = {};
    }
    
    if (!state.weeks[weekKey][day][slotId]) {
        state.weeks[weekKey][day][slotId] = [];
    }
    
    state.weeks[weekKey][day][slotId].push(person);
    saveState();
    renderCalendar();
    renderMobileCalendar();
}

// Remove person from slot
function removePersonFromSlot(day, slotId, index) {
    const weekKey = getWeekKey(state.currentWeekIndex);
    
    if (state.weeks[weekKey]?.[day]?.[slotId]) {
        state.weeks[weekKey][day][slotId].splice(index, 1);
        saveState();
        renderCalendar();
        renderMobileCalendar();
    }
}


// Repeat week to following weeks
function repeatWeek() {
    const numWeeks = parseInt(document.getElementById('repeatWeeks').value) || 4;
    const sourceWeekKey = getWeekKey(state.currentWeekIndex);
    const sourceWeekData = state.weeks[sourceWeekKey];
    
    if (!sourceWeekData) {
        alert('Current week has no data to copy.');
        return;
    }
    
    for (let i = 1; i <= numWeeks; i++) {
        const targetWeekIndex = state.currentWeekIndex + i;
        if (targetWeekIndex < CONFIG.numberOfWeeks) {
            const targetWeekKey = getWeekKey(targetWeekIndex);
            state.weeks[targetWeekKey] = JSON.parse(JSON.stringify(sourceWeekData));
        }
    }
    
    saveState();
    alert(`Week copied to the following ${numWeeks} week(s)!`);
}

// Setup event listeners
function setupEventListeners() {
    // Tab scroll buttons
    document.getElementById('scrollTabsLeft').addEventListener('click', () => {
        document.getElementById('weekTabs').scrollBy({ left: -200, behavior: 'smooth' });
    });
    
    document.getElementById('scrollTabsRight').addEventListener('click', () => {
        document.getElementById('weekTabs').scrollBy({ left: 200, behavior: 'smooth' });
    });
    
    // Repeat week button
    document.getElementById('repeatBtn').addEventListener('click', repeatWeek);
    
    // Email buttons
    document.getElementById('emailPlanBtn').addEventListener('click', () => {
        document.getElementById('emailModal').classList.add('active');
    });
    
    document.getElementById('closeEmailModal').addEventListener('click', closeEmailModal);
    
    document.getElementById('emailModal').addEventListener('click', (e) => {
        if (e.target.id === 'emailModal') {
            closeEmailModal();
        }
    });
    
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);
    
    document.getElementById('sendEmailBtn').addEventListener('click', () => {
        const email = document.getElementById('emailRecipient').value;
        if (email) {
            sendCalendarEmail(email);
        }
    });
    
    // PDF download
    document.getElementById('downloadPdfBtn').addEventListener('click', generatePDF);
}

// Close email modal
function closeEmailModal() {
    document.getElementById('emailModal').classList.remove('active');
    document.getElementById('emailSuccess').style.display = 'none';
    document.getElementById('emailForm').style.display = 'flex';
}

// Setup mobile navigation
function setupMobileNavigation() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.nav-menu');
    
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
    });
    
    menu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            toggle.classList.remove('active');
            menu.classList.remove('active');
        });
    });
}

// Handle email form submit
function handleEmailSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('modalEmailInput').value;
    
    if (email) {
        sendCalendarEmail(email);
        document.getElementById('emailForm').style.display = 'none';
        document.getElementById('emailSuccess').style.display = 'block';
        
        setTimeout(closeEmailModal, 2000);
    }
}

// Send calendar email
async function sendCalendarEmail(recipientEmail) {
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey];
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const emailContent = generateEmailContent(weekData, weekStart, weekEnd);
    
    // Try backend API first
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                to: recipientEmail,
                subject: `Eva's Calendar: Week of ${formatDate(weekStart)}`,
                html: emailContent.html,
                text: emailContent.text
            })
        });
        
        if (response.ok) {
            console.log('Email sent via backend');
            return true;
        }
    } catch (error) {
        console.log('Backend email failed, using mailto...');
    }
    
    // Fallback to mailto
    const subject = encodeURIComponent(`Eva's Calendar: Week of ${formatDate(weekStart)}`);
    const body = encodeURIComponent(emailContent.text);
    window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
}

// Generate email content
function generateEmailContent(weekData, weekStart, weekEnd) {
    let text = `Eva's Weekly Calendar\n`;
    text += `Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}\n\n`;
    
    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h1 style="color: #3498db; text-align: center;">Eva's Weekly Calendar</h1>
            <h2 style="color: #666; text-align: center; font-weight: normal;">Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #3498db; color: white;">
                        <th style="padding: 12px; border: 1px solid #2980b9;">Time</th>
    `;
    
    CONFIG.days.forEach((day, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        html += `<th style="padding: 12px; border: 1px solid #2980b9;">${day}<br><small>${formatDate(date)}</small></th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    CONFIG.days.forEach(day => {
        text += `${day}:\n`;
        CONFIG.timeSlots.forEach(slot => {
            const people = weekData?.[day]?.[slot.id] || [];
            text += `  ${slot.label}: ${people.length ? people.join(', ') : '-'}\n`;
        });
        text += '\n';
    });
    
    CONFIG.timeSlots.forEach(slot => {
        html += `<tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #ebf5fb; font-weight: bold; text-align: center;">${slot.label}</td>`;
        
        CONFIG.days.forEach(day => {
            const people = weekData?.[day]?.[slot.id] || [];
            html += `<td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                ${people.map(p => `<span style="display: inline-block; background: #85c1e9; padding: 4px 10px; border-radius: 15px; margin: 2px; font-size: 12px;">${p}</span>`).join('') || '-'}
            </td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    return { html, text };
}

// Generate PDF
function generatePDF() {
    const printWindow = window.open('', '_blank');
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey] || createEmptyWeek();
    
    const { html } = generateEmailContent(weekData, weekStart, weekEnd);
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Eva's Calendar - Week of ${formatDate(weekStart)}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            ${html}
            <p style="text-align: center; color: #999; margin-top: 20px; font-size: 12px;">
                Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}
            </p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
}
