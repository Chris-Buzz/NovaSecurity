# 🛡️ Nova Security - Cybersecurity Training Platform

A comprehensive, interactive web application that trains users to recognize and defend against real-world cybersecurity threats including phone scams, phishing emails, social engineering attacks, and SQL injection vulnerabilities.

## 🎮 Features

### 4 Game Modes
1. **Network Call Simulator** - Practice identifying phone scams and social engineering tactics
   - 20+ realistic phone call scenarios
   - Real scammer tactics and manipulation techniques
   - Proper handling of legitimate calls
   - Dynamic AI-powered scammer responses

2. **Phishing Detective** - Learn to spot fraudulent emails
   - 15 phishing email scenarios
   - Identify typosquatting, urgent language, credential harvesting
   - Multiple choice security questions
   - Educational tips for each attack type

3. **Password Cracker** - Understand social engineering and weak passwords
   - 12 social engineering scenarios
   - OSINT (Open Source Intelligence) techniques
   - Real-world password cracking tactics
   - Learn why passwords are vulnerable

4. **SQL Injection Detective** - Master web security fundamentals
   - 12 SQL injection code analysis exercises
   - Learn vulnerable vs secure implementations
   - Different injection types (basic, UNION-based, time-based, blind)
   - Real code examples from actual vulnerabilities

## 🎯 Key Features

✅ **Realistic Attack Scenarios** - 59+ total comprehensive training scenarios
✅ **Professional Audio** - ElevenLabs text-to-speech with diverse voice personas
✅ **Accurate Points System** - Granular scoring with instant feedback
✅ **Progress Tracking** - Persistent game state with LocalStorage
✅ **Mobile Responsive** - Works on desktop, tablet, and mobile devices
✅ **No Dependencies** - Vanilla JavaScript (no heavy frameworks)
✅ **Accessibility** - WCAG compliant interface design
✅ **Educational** - Learn real security concepts, not just answer questions

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- pip

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nova-security.git
cd nova-security

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API keys
touch .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Google Gemini API for AI responses
GEMINI_API_KEY=your_gemini_api_key_here

# ElevenLabs API for text-to-speech
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### Running Locally

```bash
python app.py
```

Then open your browser to `http://localhost:5000`

## 📦 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repo to Vercel
3. Add environment variables in Vercel project settings
4. Deploy!

```bash
vercel
```

### Manual Deployment

The project includes `vercel.json` configuration for automatic Vercel deployments. The configuration:
- Uses Python runtime
- Routes all static files correctly
- Handles API endpoints properly

## 🏗️ Project Structure

```
nova-security/
├── app.py                    # Flask backend with all game logic
├── requirements.txt          # Python dependencies
├── vercel.json              # Vercel deployment config
├── .gitignore               # Git ignore file
├── .env.example             # Example environment variables
├── templates/
│   └── index.html           # Main game interface
├── static/
│   ├── js/
│   │   └── script.js        # Game logic and UI interactions
│   └── css/
│       └── styles.css       # Responsive styling
└── README.md                # This file
```

## 🔧 Technologies Used

### Backend
- **Flask** - Python web framework
- **Google Gemini API** - AI for dynamic scammer responses
- **ElevenLabs API** - Professional text-to-speech
- **Python-dotenv** - Environment variable management

### Frontend
- **Vanilla JavaScript** - No framework overhead
- **HTML5** - Semantic markup
- **CSS3** - Responsive design
- **LocalStorage** - Client-side persistence

## 📊 Game Mechanics

### Points System

**Network Calls:**
- Scam calls: 0-300 points (faster hang-ups = more points)
- Legitimate calls: 50-200 points (proper engagement)

**Phishing Emails:**
- Base: 150 points
- +50 per correct highlight
- -25 per wrong highlight
- +150 for correct security question

**Password Cracking:**
- Base: 250 points
- -30 per incorrect attempt
- Minimum: 75 points

**SQL Injection:**
- Correct identification: 200 points
- Speed bonus: 50-100 points

## 🎓 Learning Outcomes

Users will learn:
- How scammers manipulate victims through phone calls
- Phishing email indicators and typosquatting tactics
- Why weak passwords are vulnerable to social engineering
- Real-world SQL injection attacks and how to prevent them
- Critical thinking about security threats

## 🔐 Security Best Practices

This educational app teaches:
- Never give sensitive info to unsolicited callers
- Verify caller identity by calling official numbers
- Check email domains carefully for typosquatting
- Use strong, unique passwords for each account
- Always use parameterized queries in code
- Input validation and output encoding

## 📝 API Endpoints

```
POST   /api/scammer/greeting        - Get new call scenario
POST   /api/scammer/respond         - Get scammer response
POST   /api/scammer/audio           - Generate voice audio
GET    /api/games/phishing          - Get phishing scenarios
GET    /api/games/password          - Get password scenarios
GET    /api/games/sql               - Get SQL scenarios
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

### To Contribute:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Roadmap

- [ ] Multiplayer competitive modes
- [ ] Leaderboards
- [ ] Custom scenario creation
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Video tutorials
- [ ] Certification system

## 📞 Support

For issues and questions:
- Open a GitHub issue
- Email: support@novasecurity.edu

## 👨‍💻 Author

Created as a comprehensive cybersecurity awareness training platform.

---

**Status:** Production Ready ✅
**Version:** 1.0.0
**Last Updated:** November 2025

**Remember:** Security is everyone's responsibility! 🛡️
