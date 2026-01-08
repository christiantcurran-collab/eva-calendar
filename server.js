// Eva Calendar - Node.js Backend for Render Deployment
// =====================================================

const express = require('express');
const path = require('path');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Store calendar data in memory (in production, use a database)
let calendarData = {};

// Email configuration
const EMAIL_CONFIG = {
    from: 'ccurran@gmail.com',
    to: 'ccurran@gmail.com'
};

// Create email transporter (configure with your email service)
// For Gmail, you'll need to use an App Password
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER || 'ccurran@gmail.com',
            pass: process.env.EMAIL_PASS // Set this in Render environment variables
        }
    });
};

// API Routes
// Save calendar data
app.post('/api/calendar', (req, res) => {
    calendarData = req.body;
    console.log('Calendar data saved:', new Date().toISOString());
    res.json({ success: true });
});

// Get calendar data
app.get('/api/calendar', (req, res) => {
    res.json(calendarData);
});

// Send email manually
app.post('/api/send-email', async (req, res) => {
    try {
        const { to, subject, html, text } = req.body;
        
        const transporter = createTransporter();
        
        await transporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: to || EMAIL_CONFIG.to,
            subject: subject,
            text: text,
            html: html
        });
        
        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Generate PDF
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { html } = req.body;
        
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdf = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true
        });
        
        await browser.close();
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=eva-calendar.pdf');
        res.send(pdf);
    } catch (error) {
        console.error('PDF generation error:', error);
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
    console.log('Running Sunday midday PDF email task...');
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
                ${people.map(p => `<span style="display: inline-block; background: #85c1e9; padding: 4px 10px; border-radius: 15px; margin: 2px; font-size: 12px;">${p}</span>`).join('')}
            </td>`;
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    return html;
}

// Send weekly proposal email (Saturday morning)
async function sendWeeklyProposal() {
    const transporter = createTransporter();
    
    // Get next week's data
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
    
    await transporter.sendMail({
        from: EMAIL_CONFIG.from,
        to: EMAIL_CONFIG.to,
        subject: `📅 Eva's Calendar: Proposed Plan for Week of ${weekStart}`,
        html: `
            <p>Hi,</p>
            <p>Here's the proposed schedule for next week. Please review and make any necessary changes.</p>
            ${html}
            <p style="color: #666; margin-top: 20px;">
                <em>This is an automated email from Eva's Calendar.</em>
            </p>
        `
    });
    
    console.log('Weekly proposal email sent successfully');
}

// Send weekly PDF email (Sunday midday)
async function sendWeeklyPDF() {
    const transporter = createTransporter();
    
    // Get next week's data
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
    
    // Generate PDF
    let pdfBuffer;
    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                </style>
            </head>
            <body>${html}</body>
            </html>
        `, { waitUntil: 'networkidle0' });
        
        pdfBuffer = await page.pdf({
            format: 'A4',
            landscape: true,
            printBackground: true
        });
        
        await browser.close();
    } catch (error) {
        console.error('PDF generation failed:', error);
        // Send email without PDF attachment
        await transporter.sendMail({
            from: EMAIL_CONFIG.from,
            to: EMAIL_CONFIG.to,
            subject: `📅 Eva's Calendar: Final Plan for Week of ${weekStart}`,
            html: `
                <p>Hi,</p>
                <p>Here's the final schedule for next week.</p>
                ${html}
                <p style="color: #666; margin-top: 20px;">
                    <em>Note: PDF attachment could not be generated. This is an automated email from Eva's Calendar.</em>
                </p>
            `
        });
        return;
    }
    
    await transporter.sendMail({
        from: EMAIL_CONFIG.from,
        to: EMAIL_CONFIG.to,
        subject: `📅 Eva's Calendar: Final Plan for Week of ${weekStart}`,
        html: `
            <p>Hi,</p>
            <p>Here's the final schedule for next week. A PDF version is attached.</p>
            ${html}
            <p style="color: #666; margin-top: 20px;">
                <em>This is an automated email from Eva's Calendar.</em>
            </p>
        `,
        attachments: [{
            filename: `eva-calendar-${weekStart.replace(/\s/g, '-')}.pdf`,
            content: pdfBuffer
        }]
    });
    
    console.log('Weekly PDF email sent successfully');
}

// Start server
app.listen(PORT, () => {
    console.log(`Eva Calendar server running on port ${PORT}`);
    console.log(`Scheduled emails configured:`);
    console.log(`  - Saturday 9:00 AM GMT: Weekly proposal`);
    console.log(`  - Sunday 12:00 PM GMT: Weekly PDF`);
});

