# Eva's Weekly Calendar

A drag-and-drop weekly planner with automated email scheduling. Built with a light blue and white theme.

## Features

- **Weekly Calendar**: Monday to Sunday with 4 time slots per day (6-9am, 9am-1pm, 1-5pm, 5-8pm)
- **Drag & Drop**: Drag people/activities into calendar slots
- **People/Activities**: Mum, Dad, Megan, EDS, Lisa, Granny, plus custom entries
- **Week Tabs**: Navigate between weeks (starts Monday 13th January 2025)
- **Copy Weeks**: Apply one week's schedule to following weeks
- **Email Integration**: Send calendar via email (using Resend)
- **PDF Export**: Download/print calendar as PDF
- **Mobile Optimized**: Responsive design with touch support
- **Auto-Save**: All data persists in browser storage

## Automated Emails

The server sends automatic emails to ccurran@gmail.com:
- **Saturday 9:00 AM GMT**: Proposed plan for the upcoming week
- **Sunday 12:00 PM GMT**: Final plan for the week

## Deployment on Render

### Step 1: Get a Free Resend API Key

1. Go to [Resend.com](https://resend.com) and sign up (free)
2. Go to **API Keys** in the dashboard
3. Click **Create API Key**
4. Copy the key (starts with `re_`)

**Why Resend?**
- ✅ **100 free emails/day** - more than enough for weekly emails
- ✅ Uses **API keys** - no personal passwords needed
- ✅ Emails come from Resend servers - not your personal account
- ✅ Easy to revoke access if needed
- ✅ Better email deliverability

### Step 2: Deploy on Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository: `christiantcurran-collab/eva-calendar`
4. Render will auto-detect the configuration
5. Add environment variable:
   - **Key**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (from Step 1)
6. Click **Deploy**

That's it! Your calendar will be live and sending automated emails.

## Email Configuration

Emails are sent from: `Eva Calendar <onboarding@resend.dev>`

To use your own domain for sending emails:
1. Add a domain in Resend dashboard
2. Verify DNS records
3. Update `EMAIL_CONFIG.from` in `server.js`

## Local Development

```bash
# Install dependencies
npm install

# Set your Resend API key
export RESEND_API_KEY=re_your_key_here

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
- **Email**: [Resend](https://resend.com) (free tier: 100 emails/day)
- **Scheduling**: node-cron

## Security

- ✅ No personal passwords stored
- ✅ API key can be revoked anytime from Resend dashboard
- ✅ Environment variables keep secrets out of code
- ✅ Resend handles email authentication (SPF, DKIM)

## License

MIT
