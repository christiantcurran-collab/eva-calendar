// Eva's Weekly Calendar Application
// ===================================

// Configuration
const CONFIG = {
    startDate: new Date(2025, 0, 13), // Monday 13th Jan 2025 (closest Monday after 12th Jan)
    timeSlots: [
        { id: 'morning', label: '6-9am' },
        { id: 'midday', label: '9am-1pm' },
        { id: 'afternoon', label: '1-5pm' },
        { id: 'evening', label: '5-8pm' }
    ],
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    defaultEmail: 'ccurran@gmail.com',
    numberOfWeeks: 12,
    // EmailJS Configuration - You'll need to set these up at https://www.emailjs.com/
    emailjs: {
        serviceId: 'service_eva_calendar', // Create this in EmailJS
        templateId: 'template_weekly_plan', // Create this in EmailJS
        publicKey: 'YOUR_EMAILJS_PUBLIC_KEY' // Get this from EmailJS dashboard
    }
};

// State
let state = {
    currentWeekIndex: 0,
    weeks: {},
    customPeople: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initializeWeeks();
    renderWeekTabs();
    renderCalendar();
    renderMobileCalendar();
    setupDragAndDrop();
    setupEventListeners();
    setupMobileNavigation();
    checkScheduledEmails();
});

// Load state from localStorage
function loadState() {
    const savedState = localStorage.getItem('evaCalendarState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error('Error loading state:', e);
        }
    }
}

// Save state to localStorage and sync with backend
function saveState() {
    localStorage.setItem('evaCalendarState', JSON.stringify(state));
    
    // Sync with backend (for scheduled emails)
    syncWithBackend();
}

// Sync calendar data with backend
async function syncWithBackend() {
    try {
        await fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    } catch (error) {
        // Backend might not be available (e.g., running locally)
        console.log('Backend sync skipped (not available)');
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

// Render calendar grid
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
            cell.dataset.day = day;
            cell.dataset.slot = slot.id;
            
            const content = document.createElement('div');
            content.className = 'slot-content';
            
            // Render existing people in slot
            const people = weekData[day]?.[slot.id] || [];
            people.forEach((person, index) => {
                content.appendChild(createSlotChip(person, day, slot.id, index));
            });
            
            cell.appendChild(content);
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// Create a chip for a slot
function createSlotChip(person, day, slotId, index) {
    const chip = document.createElement('div');
    chip.className = 'slot-chip';
    chip.dataset.person = isDefaultPerson(person) ? person : 'custom';
    chip.draggable = true;
    chip.innerHTML = `
        <span>${person}</span>
        <button class="remove-chip" data-day="${day}" data-slot="${slotId}" data-index="${index}">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Remove button handler
    chip.querySelector('.remove-chip').addEventListener('click', (e) => {
        e.stopPropagation();
        removePersonFromSlot(day, slotId, index);
    });
    
    // Drag handlers for moving between slots
    chip.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            person,
            sourceDay: day,
            sourceSlot: slotId,
            sourceIndex: index
        }));
        chip.classList.add('dragging');
    });
    
    chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
    });
    
    return chip;
}

// Check if person is a default one
function isDefaultPerson(person) {
    return ['Mum', 'Dad', 'Megan', 'EDS', 'Lisa', 'Granny'].includes(person);
}

// Render mobile calendar
function renderMobileCalendar() {
    let mobileCalendar = document.querySelector('.mobile-calendar');
    
    if (!mobileCalendar) {
        mobileCalendar = document.createElement('div');
        mobileCalendar.className = 'mobile-calendar';
        document.querySelector('.calendar-wrapper').appendChild(mobileCalendar);
    }
    
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
            content.dataset.day = day;
            content.dataset.slot = slot.id;
            
            const people = weekData[day]?.[slot.id] || [];
            people.forEach((person, index) => {
                content.appendChild(createSlotChip(person, day, slot.id, index));
            });
            
            timeSlot.appendChild(content);
            dayCard.appendChild(timeSlot);
        });
        
        mobileCalendar.appendChild(dayCard);
    });
    
    // Setup drag and drop for mobile slots
    setupMobileSlotDropZones();
}

// Setup mobile slot drop zones
function setupMobileSlotDropZones() {
    const mobileSlots = document.querySelectorAll('.mobile-slot-content');
    
    mobileSlots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
}

// Setup drag and drop
function setupDragAndDrop() {
    // People chips
    const personChips = document.querySelectorAll('.person-chip:not(.custom-chip)');
    personChips.forEach(chip => {
        chip.addEventListener('dragstart', handlePersonDragStart);
        chip.addEventListener('dragend', handleDragEnd);
        
        // Touch support
        chip.addEventListener('touchstart', handleTouchStart, { passive: false });
        chip.addEventListener('touchmove', handleTouchMove, { passive: false });
        chip.addEventListener('touchend', handleTouchEnd);
    });
    
    // Calendar slots
    const slots = document.querySelectorAll('.calendar-slot');
    slots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
    });
}

// Drag handlers
function handlePersonDragStart(e) {
    const person = e.target.closest('.person-chip').dataset.person;
    e.dataTransfer.setData('text/plain', JSON.stringify({ person }));
    e.target.classList.add('dragging');
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.calendar-slot, .mobile-slot-content');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const dropZone = e.target.closest('.calendar-slot, .mobile-slot-content');
    if (dropZone) {
        dropZone.classList.remove('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropZone = e.target.closest('.calendar-slot, .mobile-slot-content, .slot-content');
    if (!dropZone) return;
    
    dropZone.classList.remove('drag-over');
    
    const slot = dropZone.closest('.calendar-slot, .mobile-slot-content') || dropZone;
    const day = slot.dataset.day;
    const slotId = slot.dataset.slot;
    
    if (!day || !slotId) return;
    
    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        
        // If moving from another slot, remove from source first
        if (data.sourceDay && data.sourceSlot !== undefined) {
            removePersonFromSlot(data.sourceDay, data.sourceSlot, data.sourceIndex, false);
        }
        
        addPersonToSlot(day, slotId, data.person);
    } catch (err) {
        console.error('Drop error:', err);
    }
}

// Touch handlers for mobile drag and drop
let touchDragElement = null;
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(e) {
    const chip = e.target.closest('.person-chip');
    if (!chip || chip.classList.contains('custom-chip')) return;
    
    touchDragElement = chip.cloneNode(true);
    touchDragElement.style.position = 'fixed';
    touchDragElement.style.zIndex = '10000';
    touchDragElement.style.opacity = '0.9';
    touchDragElement.style.pointerEvents = 'none';
    touchDragElement.style.transform = 'scale(1.1)';
    
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    
    touchDragElement.style.left = (touch.clientX - 50) + 'px';
    touchDragElement.style.top = (touch.clientY - 25) + 'px';
    
    document.body.appendChild(touchDragElement);
    chip.classList.add('dragging');
}

function handleTouchMove(e) {
    if (!touchDragElement) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    touchDragElement.style.left = (touch.clientX - 50) + 'px';
    touchDragElement.style.top = (touch.clientY - 25) + 'px';
    
    // Highlight drop zone
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elemBelow?.closest('.calendar-slot, .mobile-slot-content');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleTouchEnd(e) {
    if (!touchDragElement) return;
    
    const chip = document.querySelector('.person-chip.dragging');
    if (chip) chip.classList.remove('dragging');
    
    const touch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const dropZone = elemBelow?.closest('.calendar-slot, .mobile-slot-content');
    
    if (dropZone) {
        const day = dropZone.dataset.day;
        const slotId = dropZone.dataset.slot;
        const person = chip?.dataset.person;
        
        if (day && slotId && person) {
            addPersonToSlot(day, slotId, person);
        }
    }
    
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    if (touchDragElement.parentNode) {
        touchDragElement.parentNode.removeChild(touchDragElement);
    }
    touchDragElement = null;
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
function removePersonFromSlot(day, slotId, index, shouldRender = true) {
    const weekKey = getWeekKey(state.currentWeekIndex);
    
    if (state.weeks[weekKey]?.[day]?.[slotId]) {
        state.weeks[weekKey][day][slotId].splice(index, 1);
        saveState();
        
        if (shouldRender) {
            renderCalendar();
            renderMobileCalendar();
        }
    }
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
    
    // Custom person input
    document.getElementById('addCustomBtn').addEventListener('click', addCustomPerson);
    document.getElementById('customInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addCustomPerson();
        }
    });
    
    // Repeat week button
    document.getElementById('repeatBtn').addEventListener('click', repeatWeek);
    
    // Email buttons
    document.getElementById('emailPlanBtn').addEventListener('click', () => {
        document.getElementById('emailModal').classList.add('active');
    });
    
    document.getElementById('closeEmailModal').addEventListener('click', () => {
        document.getElementById('emailModal').classList.remove('active');
        document.getElementById('emailSuccess').style.display = 'none';
        document.getElementById('emailForm').style.display = 'flex';
    });
    
    document.getElementById('emailModal').addEventListener('click', (e) => {
        if (e.target.id === 'emailModal') {
            document.getElementById('emailModal').classList.remove('active');
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

// Add custom person
function addCustomPerson() {
    const input = document.getElementById('customInput');
    const name = input.value.trim();
    
    if (name) {
        state.customPeople.push(name);
        saveState();
        
        // Add a new chip
        const chipsContainer = document.getElementById('peopleChips');
        const customChip = document.getElementById('customChip');
        
        const newChip = document.createElement('div');
        newChip.className = 'person-chip';
        newChip.draggable = true;
        newChip.dataset.person = name;
        newChip.style.background = 'var(--chip-custom)';
        newChip.style.color = '#196f3d';
        newChip.innerHTML = `<span class="chip-text">${name}</span>`;
        
        // Add drag handlers
        newChip.addEventListener('dragstart', handlePersonDragStart);
        newChip.addEventListener('dragend', handleDragEnd);
        newChip.addEventListener('touchstart', handleTouchStart, { passive: false });
        newChip.addEventListener('touchmove', handleTouchMove, { passive: false });
        newChip.addEventListener('touchend', handleTouchEnd);
        
        chipsContainer.insertBefore(newChip, customChip);
        input.value = '';
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

// Setup mobile navigation
function setupMobileNavigation() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.nav-menu');
    
    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        menu.classList.toggle('active');
    });
    
    // Close menu when clicking a link
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
        
        setTimeout(() => {
            document.getElementById('emailModal').classList.remove('active');
            document.getElementById('emailSuccess').style.display = 'none';
            document.getElementById('emailForm').style.display = 'flex';
        }, 2000);
    }
}

// Send calendar email
async function sendCalendarEmail(recipientEmail) {
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey];
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    // Generate email content
    const emailContent = generateEmailContent(weekData, weekStart, weekEnd);
    
    // Try to send via backend API first
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
        console.log('Backend email failed, trying EmailJS...');
    }
    
    // Try EmailJS as fallback
    if (typeof emailjs !== 'undefined' && CONFIG.emailjs.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
        try {
            emailjs.init(CONFIG.emailjs.publicKey);
            
            await emailjs.send(CONFIG.emailjs.serviceId, CONFIG.emailjs.templateId, {
                to_email: recipientEmail,
                from_name: "Eva's Calendar",
                subject: `Eva's Calendar: Week of ${formatDate(weekStart)}`,
                message_html: emailContent.html,
                message: emailContent.text
            });
            
            console.log('Email sent via EmailJS');
            return true;
        } catch (error) {
            console.error('EmailJS error:', error);
        }
    }
    
    // Fallback to mailto link
    const subject = encodeURIComponent(`Eva's Calendar: Week of ${formatDate(weekStart)}`);
    const body = encodeURIComponent(emailContent.text);
    const mailtoLink = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
    return true;
}

// Generate email content (HTML and plain text)
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
    // Create a printable version
    const printWindow = window.open('', '_blank');
    const weekStart = getWeekStartDate(state.currentWeekIndex);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekKey = getWeekKey(state.currentWeekIndex);
    const weekData = state.weeks[weekKey] || createEmptyWeek();
    
    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;">
            <thead>
                <tr style="background: #3498db; color: white;">
                    <th style="padding: 12px; border: 1px solid #2980b9;">Time</th>
    `;
    
    CONFIG.days.forEach((day, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        tableHTML += `<th style="padding: 12px; border: 1px solid #2980b9;">${day}<br><small>${formatDate(date)}</small></th>`;
    });
    
    tableHTML += '</tr></thead><tbody>';
    
    CONFIG.timeSlots.forEach(slot => {
        tableHTML += `<tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #ebf5fb; font-weight: bold; text-align: center;">${slot.label}</td>
        `;
        
        CONFIG.days.forEach(day => {
            const people = weekData[day]?.[slot.id] || [];
            tableHTML += `<td style="padding: 10px; border: 1px solid #ddd; vertical-align: top; min-height: 60px;">
                ${people.map(p => `<span style="display: inline-block; background: #85c1e9; padding: 4px 10px; border-radius: 15px; margin: 2px; font-size: 12px;">${p}</span>`).join('')}
            </td>`;
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Eva's Calendar - Week of ${formatDate(weekStart)}</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 20px;
                    max-width: 1100px;
                    margin: 0 auto;
                }
                h1 { 
                    color: #3498db; 
                    text-align: center;
                    margin-bottom: 5px;
                }
                h2 {
                    color: #666;
                    text-align: center;
                    font-weight: normal;
                    margin-top: 0;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <h1>Eva's Weekly Calendar</h1>
            <h2>Week of ${formatDate(weekStart)} - ${formatDate(weekEnd)}</h2>
            ${tableHTML}
            <p style="text-align: center; color: #999; margin-top: 20px; font-size: 12px;">
                Generated on ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}
            </p>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Trigger print dialog after a short delay
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

// Check for scheduled emails (informational only - actual scheduling would need a backend)
function checkScheduledEmails() {
    // This function provides information about when emails would be sent
    // Actual email scheduling requires a backend service
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hours = now.getHours();
    
    // Saturday at 9am - Send proposed plan
    if (dayOfWeek === 6 && hours === 9) {
        console.log('Saturday 9am - Proposed plan email time');
        // In a real implementation, this would trigger an API call
    }
    
    // Sunday at 12pm - Send PDF
    if (dayOfWeek === 0 && hours === 12) {
        console.log('Sunday 12pm - PDF email time');
        // In a real implementation, this would trigger an API call
    }
}

// Restore custom people chips on load
function restoreCustomPeople() {
    state.customPeople.forEach(name => {
        const chipsContainer = document.getElementById('peopleChips');
        const customChip = document.getElementById('customChip');
        
        const newChip = document.createElement('div');
        newChip.className = 'person-chip';
        newChip.draggable = true;
        newChip.dataset.person = name;
        newChip.style.background = 'var(--chip-custom)';
        newChip.style.color = '#196f3d';
        newChip.innerHTML = `<span class="chip-text">${name}</span>`;
        
        newChip.addEventListener('dragstart', handlePersonDragStart);
        newChip.addEventListener('dragend', handleDragEnd);
        newChip.addEventListener('touchstart', handleTouchStart, { passive: false });
        newChip.addEventListener('touchmove', handleTouchMove, { passive: false });
        newChip.addEventListener('touchend', handleTouchEnd);
        
        chipsContainer.insertBefore(newChip, customChip);
    });
}

// Call restore on load
document.addEventListener('DOMContentLoaded', restoreCustomPeople);

