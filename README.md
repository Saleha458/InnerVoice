# InnerVoice 

### Anonymous AI-Powered Emotional Support Platform

InnerVoice is a privacy-focused web platform designed to provide a safe and anonymous space for individuals seeking emotional support. The platform combines AI-powered assistance with verified human experts to help users access support without the fear of judgment or immediate disclosure of their identity.

## Features

🔐 Anonymous user authentication
🤖 AI-powered emotional support using Google Gemini
🧠 Emotional severity detection and safety escalation
👩‍⚕️ Verified expert registration and admin approval
📅 Expert support session booking
💬 Real-time user–expert chat
📞 Audio and video communication
🎤 Voice messaging
😊 Mood tracking
📓 Private journaling
👨‍👩‍👧 Parent education and guidance
🚨 Quick Exit functionality
🔔 Session notifications and reminders
🛡️ Role-based access control and privacy-focused architecture

## Technology Stack

### Frontend
React.js
Vite
JavaScript
HTML5
CSS3
React Router
Axios

### Backend
Node.js
Express.js
Socket.IO
WebRTC
Multer

### Database & Authentication
Firebase Authentication
Firebase Firestore

### AI & Cloud Services
Google Gemini API
Cloudinary

### Security
AES-256-GCM encryption
Firebase Authentication
Role-Based Access Control
Environment-based secret management

## User Roles

### User
Users can anonymously access AI support, track their mood, maintain private journals, discover verified experts, request sessions, communicate with experts, and use audio/video support.

### Expert
Experts can submit professional credentials for verification, manage support requests, conduct sessions, and communicate with users after admin approval.

### Parent
Parents can access dedicated educational resources, parenting guidelines, warning signs, and profile management.

### Admin
Administrators manage expert verification, users, reports, sessions, and overall platform safety.

## Expert Verification

Experts follow a controlled verification workflow:

**Registration → Pending Review → Admin Verification → Verified → Visible to Users**

Only verified experts can appear in the user-facing expert directory and receive support requests.

## AI Safety

InnerVoice uses AI to provide supportive responses and identify different levels of emotional severity:

LOW
MODERATE
HIGH
CRITICAL

Critical situations are handled with safety-oriented guidance and escalation toward professional or emergency support.
       │
       ▼
Cloudinary
