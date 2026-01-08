// Eva Calendar - Node.js Backend for Render Deployment
// =====================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Data file path for persistent storage
const DATA_FILE = path.join(__dirname, 'data', 'calendar-data.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Load calendar data from file on startup
let calendarData = loadCalendarData();

function loadCalendarData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            console.log('Calendar data loaded from file');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading calendar data:', error);
    }
    return { currentWeekIndex: 0, weeks: {}, customPeople: [] };
}

function saveCalendarData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Calendar data saved to file:', new Date().toISOString());
        return true;
    } catch (error) {
        console.error('Error saving calendar data:', error);
        return false;
    }
}

// Email configuration
const EMAIL_CONFIG = {
    from: 'Eva Calendar <onboarding@resend.dev>',
    to: 'ccurran@gmail.com'
};

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

// Send email using Resend
async function sendEmail({ to, subject, html, text }) {
    try {
        const { data, error } = await resend.emails.send({
            from: EMAIL_CONFIG.from,
            to: to || EMAIL_CONFIG.to,
            subject: subject,
            html: html,
            text: text
        });
        
        if (error) {
            console.error('Resend error:', error);
            return { success: false, error };
        }
        
        console.log('Email sent:', data);
        return { success: true, data };
    } catch (error) {
        console.error('Email error:', error);
        return { success: false, error: error.message };
    }
}

// API Routes

// Get calendar data (for loading on page load)
app.get('/api/calendar', (req, res) => {
    res.json(calendarData);
});

// Save calendar data (called when user makes changes)
app.post('/api/calendar', (req, res) => {
    calendarData = req.body;
    const saved = saveCalendarData(calendarData);
    res.json({ success: saved });
});

// Send email manually
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;
        
        const result = await sendEmail({ to, subject, html, text });
        
        if (result.success) {
            res.json({ success: true, message: 'Email sent successfully' });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Scheduled Email Tasks
// Saturday 9:00 AM GMT - Send proposed plan for next week
cron.schedule('0 9 * * 6', async () => {
    console.log('Running Saturday morning email task...');
    try {
        await sendWeeklyProposal();
    } catch (error) {
        console.error('Saturday email error:', error);
    }
}, {
    timezone: 'Europe/London'
});

// Sunday 12:00 PM GMT - Send PDF of the week's plan
cron.schedule('0 12 * * 0', async () => {
    console.log('Running Sunday midday email task...');
    try {
        await sendWeeklyPDF();
    } catch (error) {
        console.error('Sunday email error:', error);
    }
}, {
    timezone: 'Europe/London'
});

// Helper function to format calendar data for email
function formatCalendarForEmail(weekData, weekStart) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const timeSlots = [
        { id: 'morning', label: '6-9am' },
        { id: 'midday', label: '9am-1pm' },
        { id: 'afternoon', label: '1-5pm' },
        { id: 'evening', label: '5-8pm' }
    ];
    
    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h1 style="color: #3498db; text-align: center;">Eva's Weekly Calendar</h1>
            <h2 style="color: #666; text-align: center; font-weight: normal;">Week of ${weekStart}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background: #3498db; color: white;">
                        <th style="padding: 12px; border: 1px solid #2980b9;">Time</th>
    `;
    
    days.forEach(day => {
        html += `<th style="padding: 12px; border: 1px solid #2980b9;">${day}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    timeSlots.forEach(slot => {
        html += `<tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #ebf5fb; font-weight: bold; text-align: center;">${slot.label}</td>`;
        
        days.forEach(day => {
            const people = weekData?.[day]?.[slot.id] || [];
            html += `<td style="padding: 10px; border: 1px solid #ddd; vertical-align: top;">
                ${people.map(p => `<span style="display: inline-block; background: #85c1e9; padding: 4px 10px; border-radius: 15px; margin: 2px; font-size: 12px;">${p}</span>`).join('') || '-'}
            </td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    return html;
}

// Send weekly proposal email (Saturday morning)
async function sendWeeklyProposal() {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
    
    const weekKey = `week_${nextMonday.toISOString().split('T')[0]}`;
    const weekData = calendarData.weeks?.[weekKey] || {};
    
    const weekStart = nextMonday.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    const html = formatCalendarForEmail(weekData, weekStart);
    
    await sendEmail({
        to: EMAIL_CONFIG.to,
        subject: `📅 Eva's Calendar: Proposed Plan for Week of ${weekStart}`,
        html: `
            <p>Hi,</p>
            <p>Here's the proposed schedule for next week. Please review and make any necessary changes.</p>
            ${html}
            <p style="color: #666; margin-top: 20px;">
                <em>This is an automated email from Eva's Calendar.</em>
            </p>
        `,
        text: `Eva's Calendar - Proposed Plan for Week of ${weekStart}`
    });
    
    console.log('Weekly proposal email sent successfully');
}

// Send weekly PDF email (Sunday midday)
async function sendWeeklyPDF() {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
    
    const weekKey = `week_${nextMonday.toISOString().split('T')[0]}`;
    const weekData = calendarData.weeks?.[weekKey] || {};
    
    const weekStart = nextMonday.toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
    
    const html = formatCalendarForEmail(weekData, weekStart);
    
    await sendEmail({
        to: EMAIL_CONFIG.to,
        subject: `📅 Eva's Calendar: Final Plan for Week of ${weekStart}`,
        html: `
            <p>Hi,</p>
            <p>Here's the final schedule for next week.</p>
            ${html}
            <p style="color: #666; margin-top: 20px;">
                <em>This is an automated email from Eva's Calendar. You can print this email as a PDF.</em>
            </p>
        `,
        text: `Eva's Calendar - Final Plan for Week of ${weekStart}`
    });
    
    console.log('Weekly PDF email sent successfully');
}

// Start server
app.listen(PORT, () => {
    console.log(`Eva Calendar server running on port ${PORT}`);
    console.log(`Calendar data file: ${DATA_FILE}`);
    console.log(`Scheduled emails configured:`);
    console.log(`  - Saturday 9:00 AM GMT: Weekly proposal`);
    console.log(`  - Sunday 12:00 PM GMT: Weekly PDF`);
});
