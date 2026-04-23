# 🌍 Last Message: Echoes from the Future

> *“If you're hearing this… it's already too late for us.”*

**Last Message** is an interactive XR-inspired web experience where users scan real-world objects and receive messages from a possible future affected by climate change, human decisions, and environmental collapse.

---

## 🚀 Demo

🔗 Live App: https://lastmessage.navium.com.co

---

## 🧠 Concept

What if the objects around us could tell us what happened?

Using AI, sound design, and immersive UI, this project transforms everyday objects into **messages from the future**, creating awareness about:

* 🌊 Water scarcity
* 🌫️ Air pollution
* 🐾 Wildlife extinction
* 🛒 Overconsumption
* ⚡ Energy crisis

---

## ✨ Features

### 📡 Object Scanning

Point your camera at an object and receive a contextual message from the future.

### 🧬 Legacy Mode (Voice Imprint)

Record your voice and leave a message for the future.

* Voice cloning powered by AI
* Emotional playback experience
* Personal “echo” preserved

### 🎧 Immersive Sound Design

* Ambient futuristic background
* Scan / analyze / reveal audio cues
* Synchronized UI + audio feedback

### 🎮 Interactive Experience

* Mobile-first design
* Game-like interface
* Smooth transitions and micro-interactions

---

## 🛠️ Tech Stack

### Frontend

* React
* Tailwind CSS
* shadcn/ui

### Backend

* Python + FastAPI

### AI & Audio

* Google Gemini (analysis & categorization)
* ElevenLabs (text-to-speech & voice cloning)

### Deployment

* Fly.io

---

## ⚙️ How It Works

1. User scans an object
2. AI analyzes the environment
3. A category is inferred (water, air, fauna, etc.)
4. A message from the future is generated
5. Audio is played with immersive UI feedback

---

## 🎤 Legacy Mode Flow

1. User records a short voice sample
2. Backend sends audio to ElevenLabs
3. A temporary voice clone is created
4. A message is generated using that voice
5. The “voice imprint” is played back

---

## 🔊 Sound System

Custom sound effects enhance immersion:

* `Futuristic_Ambience.mp3` → Home
* `scanning.wav` → Scan trigger
* `analizing.wav` → Processing loop
* `reveal.wav` → Final message

---

## 📦 Installation (Local)

```bash
# Clone repo
git clone https://github.com/your-username/last-message.git

# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🔐 Environment Variables

### Frontend (.env)

```
VITE_API_URL=http://localhost:8000
```

### Backend

```
ELEVENLABS_API_KEY=your_key
GEMINI_API_KEY=your_key
```

---

## 🌐 Deployment

The app is deployed using Fly.io:

* Frontend served via Nginx
* Backend as FastAPI service
* Custom domain configured

---

## 🎯 Hackathon Context

Built for the ElevenLabs + Kiro Hackathon.

Focus:

* Spec-driven development
* Creative use of AI audio
* Emotional storytelling through technology

---

## 💡 Future Improvements

* Real-time object detection (instead of snapshot)
* Multi-language support
* Persistent voice profiles
* Social sharing of messages
* XR / AR integration

---

## 🤝 Contributing

This is a hackathon project, but feedback and ideas are welcome!

---

## 📬 Contact

Created by Oscar Navas
📧 *on.navas@gmail.com*
🌐 https://navium.com.co

---

## 🧭 Final Thought

> “The future is not written yet…
> but it is already speaking to us.”
> 
