# Kaymet Daily Reports Application

This application enables Kaymet to upload daily reports to Microsoft OneDrive. Users can login with their Microsoft accounts and upload files by selecting various report types.

## Features

- Authentication with Microsoft account
- Ability to select different report types:
  - Order amount and tonnage report
  - Offer report
  - Non-cash usage report
  - Daily R&D report
  - Shipment report
  - Cash flow
  - Other (custom name entry)
- Naming uploaded files according to date and report type
- Automatic daily folder creation
- Upload progress tracking

## Installation

### Requirements

- Node.js (>= 14.x)
- npm or yarn

### Backend

```bash
cd backend
npm install
npm run build
npm start
```

### Frontend

```bash
cd frontend
npm install
npm start
```

## Usage

1. After starting the frontend, go to `http://localhost:3000` in your web browser
2. Click the "Login with Microsoft" button and login with your Microsoft account
3. Select a report file
4. Choose the type of report you're uploading or enter a custom name with the "Other" option
5. Click the "Upload to OneDrive" button
6. Your file will be saved to a folder created with today's date, named according to the selected report type and date/time information

## Configuration

Set the following variables in the `.env` file for the backend:

```
PORT=3001
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3001/auth/callback
```

## License

This project is for private use and all rights are reserved. 