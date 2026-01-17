# EduGram 🎓

**An AI-powered educational platform with personalized learning styles and kinesthetic learning activities.**

EduGram is a full-stack web application that adapts to different learning styles (Visual, Auditory, Reading/Writing, Kinesthetic) and provides interactive tools for learning.

---

## 🌟 Features

### 📚 Learning Style Detection
- **Quiz-based assessment** to identify student learning preferences
- Routes students to personalized learning experiences
- Four learning styles supported:
  - 🎨 **Visual**: Mindmaps, animations, diagrams
  - 🎵 **Auditory**: Voice assistant, speech support
  - 📝 **Reading/Writing**: Text-based materials
  - 🎮 **Kinesthetic**: Interactive activities, circuit simulations

### 🎯 Visual Learning
- **AI Mindmap Generator**: Creates mind maps from topics using Gemini API
- **Animation-based Learning**: Dynamic visual content
- **AI Video Generator**: Auto-generates educational videos with script, images, and voiceover

### 🎮 Kinesthetic Learning Hub
- **Drag & Match Categories**: AI-generated categorization exercises
- **Digital Logic Circuit Designer**: Build circuits based on natural language requests
- **Operating System Basics**: Coming soon

### 🔊 Auditory Learning
- **Voice Assistant**: Interactive learning through conversation
- **Speech Support**: Text-to-speech and speech recognition

### 📝 Additional Features
- Flashcard generation
- MCQ (Multiple Choice Question) generation
- Content summarization
- Image analysis
- YouTube search integration
- Material saving and organization

---

## 🛠 Tech Stack

### Frontend
- **Next.js** (React framework)
- **TypeScript**
- **CSS Modules**
- **js-cookie** (Cookie management)

### Backend
- **Django** (Python web framework)
- **Django REST Framework**
- **Google Gemini API** (AI-powered features)
- **Hugging Face** (Image generation)
- **moviepy** (Video editing)
- **edge-tts** (Text-to-speech)

### Database
- **SQLite** (Development)

---

## 📋 Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **pip** (Python package manager)
- **Git**
- **Google Gemini API Key** ([Get here](https://aistudio.google.com/apikey))

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/AditiShastri/edugram.git
cd edugram
```

### 2. Frontend Setup (Next.js)

```bash
# Install dependencies
npm install

# Create environment file
touch .env.local

# Add this to .env.local:
# NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Backend Setup (Django)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
touch .env

# Add this to backend/.env:
# GEMINI_API_KEY=your_gemini_api_key_here
# YOUTUBE_API_KEY=your_youtube_api_key_here (optional)
```

---

## 🏃 Running the Application

### Start Backend (Django)

```bash
cd backend
python manage.py runserver
# Backend runs on http://localhost:8000
```

### Start Frontend (Next.js)

```bash
npm run dev
# Frontend runs on http://localhost:3000
```

### Access the App
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Project Structure

```
edugram/
├── pages/                      # Next.js pages & API routes
│   ├── api/
│   │   ├── generate-mindmap.ts
│   │   └── generate-animation.ts
│   ├── quiz.tsx               # Learning style quiz
│   ├── kinesthetic-learning.tsx
│   ├── visuale.tsx
│   └── voice-assistant.tsx
├── components/                 # React components
├── styles/                     # CSS modules
├── context/                    # React context
├── public/                     # Static assets
├── backend/
│   ├── app/
│   │   ├── views.py          # API endpoints
│   │   ├── urls.py
│   │   ├── models.py
│   │   └── utils/            # Helper functions
│   ├── manage.py
│   ├── db.sqlite3
│   ├── requirements.txt
│   └── ...
├── .gitignore
├── .env.local
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 🔑 API Endpoints

### Kinesthetic Learning
- `POST /api/generate-drag-and-match/` - Generate AI-powered matching items
- `POST /api/design-digital-circuit/` - Design digital logic circuits

### Visual Learning
- `POST /api/generate-mindmap/` - Generate mind maps (Next.js)
- `POST /api/generate-video/` - Generate educational videos

### Other Features
- `POST /api/summarize/` - Summarize content
- `POST /api/generate-mcqs/` - Generate quiz questions
- `POST /api/analyze-image/` - Analyze images
- `POST /api/speech-generate/` - Generate speech

---

## 🌍 Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
```

### Backend (backend/.env)
```
GEMINI_API_KEY=your_gemini_key_here
YOUTUBE_API_KEY=your_youtube_key_here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

---

## 📱 Learning Paths

### 1. Take the Quiz
- Navigate to `/quiz`
- Answer 10 questions to identify your learning style
- Scores are saved in browser cookies

### 2. Get Personalized Content
- Visual learners → `/visuale`
- Auditory learners → `/voice-assistant`
- Reading/Writing learners → `/deaf`
- Kinesthetic learners → `/kinesthetic-learning`

### 3. Interactive Learning
- Use mind maps, animations, videos, drag-and-match, and circuit designers
- Save materials for later review

---

## 🤝 Contributing

1. **Fork the repository**
   ```bash
   # Go to GitHub and click "Fork"
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Go to the original repo
   - Click "New Pull Request"
   - Select your fork and branch
   - Describe your changes and submit

---

## 🐛 Troubleshooting

### CORS Issues
- Ensure backend is running on `http://localhost:8000`
- Check `CORS_ALLOWED_ORIGINS` in `backend/backend/settings.py`
- Restart backend after config changes

### Gemini API Key Issues
- Get key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
- Ensure key is added to `.env.local` (frontend) and `backend/.env`
- Restart both services

### Port Already in Use
```bash
# Kill process on port 3000 (frontend)
npx kill-port 3000

# Kill process on port 8000 (backend)
python -m pip install kill-port
kill-port 8000
```

---

## 📄 License

This project is open source and available under the MIT License.

---

## 👨‍💻 Author

**Aditi Shastri**
- GitHub: [@AditiShastri](https://github.com/AditiShastri)

---

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/)
- [Next.js](https://nextjs.org/)
- [Django](https://www.djangoproject.com/)
- [Hugging Face](https://huggingface.co/)

---

## 📞 Support

For issues, questions, or suggestions:
1. Open an issue on GitHub
2. Include detailed description and screenshots
3. Join discussions for feature requests

---

**Happy Learning! 🚀**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
