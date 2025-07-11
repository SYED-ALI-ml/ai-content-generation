# AI Social Media Manager with Veo2 Video Generation

Transform your social media workflow with AI-powered content creation, scheduling, analytics, and advanced video generation using Google Veo2.

---

## 🚀 Project Overview
This application is a full-stack AI Social Media Manager that enables users to:
- Register, log in, and manage their accounts securely
- Schedule and publish posts to multiple social media platforms
- Generate and manage AI-powered videos using Google Veo2
- Analyze engagement and performance with built-in analytics
- Store and manage all content securely and privately

---

## ✨ Features
- **User Authentication** (JWT, secure, private)
- **Post Scheduling** (Instagram, Facebook, LinkedIn, YouTube, Twitter)
- **AI Video Generation** (Google Veo2 integration, text-to-video, image-to-video)
- **Video Library** (private per user, download, delete, stats)
- **Analytics Dashboard**
- **Modern UI** (React, Tailwind, dark/light mode)
- **MongoDB** for all data storage

---

## 🛠️ Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **AI Video:** Google Veo2 (Vertex AI)
- **Cloud Storage:** Google Cloud Storage

---

## ⚡ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/SYED-ALI-ml/ai-content-generation.git
cd ai-content-generation
```

### 2. Install Dependencies
#### Backend
```bash
cd backend
npm install
```
#### Frontend
```bash
cd ../
npm install
```

### 3. Environment Variables
Copy and configure the backend environment variables:
```bash
cp backend/config.env.example backend/config.env
```
Edit `backend/config.env` and set:
- MongoDB URI
- JWT secret
- Google Cloud project, region, and bucket

### 4. Google Cloud Setup for Veo2
- Install [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- Authenticate:
  ```bash
  gcloud auth application-default login
  gcloud config set project <your-project-id>
  ```
- Create a bucket:
  ```bash
  gsutil mb gs://<your-bucket-name>
  ```
- Enable Vertex AI and Storage APIs in your Google Cloud Console

### 5. Run the Backend
```bash
cd backend
npm run dev
```

### 6. Run the Frontend
```bash
npm run dev
```

---

## 🧑‍💻 Usage
- Register or log in
- Use the Video Generator to create AI videos (text or image prompt)
- Manage your video library (download, delete, view stats)
- Schedule and manage social media posts
- View analytics dashboard

---

## 🌐 Environment Variables (backend/config.env)
```
MONGODB_URI=mongodb://localhost:27017/ai-social-media-manager
JWT_SECRET=your_jwt_secret
PORT=5001
NODE_ENV=development
GOOGLE_CLOUD_PROJECT_ID=your-google-cloud-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name
```

---

## 🤝 Contributing
1. Fork the repo
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

---

## 📄 License
MIT

---

## 📬 Contact
For questions or support, open an issue or contact [SYED-ALI-ml](https://github.com/SYED-ALI-ml).
