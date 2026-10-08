# InnerVoice

### A Privacy-Focused AI-Powered Mental Wellbeing Platform

InnerVoice is a full-stack web application designed to provide a secure and supportive environment for emotional expression, mental wellbeing, personal reflection, and professional guidance. It combines AI-assisted conversations, encrypted private records, real-time expert communication, and role-based access control.

**Live Website:** https://innervoice.salehaimtiaz.com/  
**GitHub:** https://github.com/Saleha458/InnerVoice

---

## Key Features

- **AI Support:** Google Gemini-powered supportive conversations with user consent and safety-aware responses.
- **Private Vault:** Passphrase-protected encryption and a Recovery Kit for private data access.
- **Mood Tracking:** Daily emotional check-ins, interactive mood charts, history, and wellbeing suggestions.
- **Private Journal:** Encrypted personal journaling and reflection.
- **Expert Consultation:** Verified expert profiles, appointment booking, and session management.
- **Secure Messaging:** Real-time encrypted User–Expert text and voice communication.
- **Starred Messages:** Save important conversations for future reference.
- **Private Reports:** Confidential reporting workflows with access controls.
- **Notifications:** Session updates, reminders, and activity notifications.
- **Role-Based Dashboards:** Dedicated functionality for Users, Experts, Parents, and Administrators.
- **Account Management:** Authentication, account deactivation, restoration, and guarded deletion.
- **Responsive Design:** Optimized user experience across desktop and mobile devices.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React.js, JavaScript, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| AI Integration | Google Gemini |
| Real-Time Communication | Socket.IO |
| Security | Web Crypto API, AES-GCM, Helmet, Rate Limiting, Role-Based Access |
| Media Storage | Cloudinary |
| Data Visualization | Recharts |
| Testing | Jest, Supertest, Cypress |
| Deployment | Vercel, Render |
| Version Control | Git, GitHub |

## Project Structure

```text
InnerVoice/
├── frontend/        # React application
├── backend/         # REST APIs and real-time services
├── firebase/        # Firebase rules and configuration
└── README.md
```

## Local Setup

**Requirements:** Node.js, npm, Firebase configuration, and the required external service credentials.

Clone the repository:

```bash
git clone https://github.com/Saleha458/InnerVoice.git
cd InnerVoice
```

**Backend:**

```bash
cd backend
npm install
npm run dev
```

**Frontend:** Open a separate terminal.

```bash
cd frontend
npm install
npm run dev
```

Configure environment variables for Firebase, Gemini, Cloudinary, and the applicable API endpoints before running the application. Never commit `.env` files, private keys, or credentials.

## Testing

Backend automated tests:

```bash
cd backend
npm test
```

Frontend production build:

```bash
cd frontend
npm run build
```

Frontend end-to-end testing:

```bash
cd frontend
npx cypress open
```

## Privacy and Safety

InnerVoice implements encrypted private records, vault-based access, role-based authorization, protected expert verification documents, and controlled account deletion.

AI assistance is intended for supportive interactions and does not replace professional healthcare, diagnosis, therapy, or emergency services.

**InnerVoice is not an emergency response service.**

## Deployment

**Frontend:** Vercel  
**Backend:** Render  
**Production Website:** https://innervoice.salehaimtiaz.com
---

© 2026 InnerVoice. All rights reserved.
