# Eva's Weekly Calendar

A drag-and-drop weekly planner with automated email scheduling. Built with a light blue and white theme.

## Features

- **Weekly Calendar**: Monday to Sunday with 4 time slots per day (6-9am, 9am-1pm, 1-5pm, 5-8pm)
- **Drag & Drop**: Drag people/activities into calendar slots
- **People/Activities**: Mum, Dad, Megan, EDS, Lisa, Granny, plus custom entries
- **Week Tabs**: Navigate between weeks (starts Monday 13th January 2025)
- **Copy Weeks**: Apply one week's schedule to following weeks
- **Email Integration**: Send calendar via email
- **PDF Export**: Download/print calendar as PDF
- **Mobile Optimized**: Responsive design with touch support
- **Auto-Save**: All data persists in browser storage

## Automated Emails

The server sends automatic emails:
- **Saturday 9:00 AM GMT**: Proposed plan for the upcoming week
- **Sunday 12:00 PM GMT**: Final PDF of the week's plan

## Deployment on Render

### Quick Deploy

1. Push this repository to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New** → **Web Service**
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` configuration
6. Add environment variables:
   - `EMAIL_USER`: Your Gmail address (ccurran@gmail.com)
   - `EMAIL_PASS`: Your Gmail App Password (see below)
7. Click **Deploy**

### Gmail App Password Setup

To send emails from Gmail, you need an App Password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Create a new App Password for "Mail" on "Other (Custom name)"
5. Copy the 16-character password
6. Use this as the `EMAIL_PASS` environment variable in Render

### Alternative: EmailJS (No Backend Required)

If you want to use the site without the backend email functionality:

1. Sign up at [EmailJS](https://www.emailjs.com/)
2. Create a service connected to your email
3. Create an email template with these variables:
   - `to_email`
   - `from_name`
   - `subject`
   - `message_html`
   - `message`
4. Update the config in `public/app.js`:
   ```javascript
   emailjs: {
       serviceId: 'your_service_id',
       templateId: 'your_template_id',
       publicKey: 'your_public_key'
   }
   ```

## Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

Visit `http://localhost:3000` in your browser.

## File Structure

```
eva-calendar/
├── public/
│   ├── index.html      # Main HTML page
│   ├── styles.css      # Styles (light blue/white theme)
│   └── app.js          # Frontend JavaScript
├── server.js           # Express backend with email scheduling
├── package.json        # Dependencies and scripts
├── render.yaml         # Render deployment config
└── README.md           # This file
```

## Tech Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Node.js, Express
- **Email**: Nodemailer (backend) or EmailJS (frontend fallback)
- **Scheduling**: node-cron
- **PDF Generation**: Puppeteer

## License

MIT

