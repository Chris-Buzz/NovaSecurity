// ===== STORAGE MANAGER =====
const Storage = {
    get(key, defaultValue = null) {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    },
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },
    clear() {
        localStorage.clear();
    }
};

// ===== iOS AUDIO UNLOCK =====
let audioContextUnlocked = false;
let audioContext = null;

function unlockAudioContext() {
    if (audioContextUnlocked) return Promise.resolve();
    
    return new Promise((resolve) => {
        // Create a silent audio element and play it to unlock audio on iOS
        const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABhADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAYYQfNwAAAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sQZA8P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
        silentAudio.volume = 0.01;
        
        const playPromise = silentAudio.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('iOS Audio context unlocked');
                audioContextUnlocked = true;
                silentAudio.pause();
                silentAudio.currentTime = 0;
                resolve();
            }).catch(err => {
                console.warn('Could not unlock audio context:', err);
                resolve(); // Still resolve to continue
            });
        } else {
            audioContextUnlocked = true;
            resolve();
        }
    });
}

// ===== GAME STATE =====
let gameState = {
    totalScore: Storage.get('totalScore', 0),
    completedCount: Storage.get('completedCount', 0),
    currentStreak: Storage.get('currentStreak', 0),
    bestStreak: Storage.get('bestStreak', 0),
    totalAttempts: Storage.get('totalAttempts', 0),
    correctAttempts: Storage.get('correctAttempts', 0),
    phishingCompleted: Storage.get('phishingCompleted', []),
    passwordCompleted: Storage.get('passwordCompleted', []),
    networkCompleted: Storage.get('networkCompleted', []),
    sqlCompleted: Storage.get('sqlCompleted', []),
    achievements: Storage.get('achievements', [])
};

function saveGameState() {
    Object.keys(gameState).forEach(key => {
        Storage.set(key, gameState[key]);
    });
}

// ===== ACHIEVEMENTS =====
const achievements = [
    { id: 'first_blood', name: 'First Blood', desc: 'Complete your first challenge', icon: '▶', check: () => gameState.completedCount >= 1 },
    { id: 'beginner', name: 'Beginner', desc: 'Complete 5 challenges', icon: '◆', check: () => gameState.completedCount >= 5 },
    { id: 'intermediate', name: 'Intermediate', desc: 'Complete 10 challenges', icon: '■', check: () => gameState.completedCount >= 10 },
    { id: 'expert', name: 'Expert', desc: 'Complete 25 challenges', icon: '◉', check: () => gameState.completedCount >= 25 },
    { id: 'streak_3', name: 'Hot Streak', desc: 'Get a 3-challenge streak', icon: '▶▶', check: () => gameState.currentStreak >= 3 },
    { id: 'streak_5', name: 'On Fire', desc: 'Get a 5-challenge streak', icon: '▶▶▶', check: () => gameState.currentStreak >= 5 },
    { id: 'high_scorer', name: 'High Scorer', desc: 'Reach 1000 points', icon: '◆◆', check: () => gameState.totalScore >= 1000 },
    { id: 'perfectionist', name: 'Perfectionist', desc: '100% accuracy on 5 challenges', icon: '■■', check: () => gameState.correctAttempts === gameState.totalAttempts && gameState.totalAttempts >= 5 }
];

function checkAchievements() {
    let newAchievements = [];
    achievements.forEach(ach => {
        if (!gameState.achievements.includes(ach.id) && ach.check()) {
            gameState.achievements.push(ach.id);
            newAchievements.push(ach);
        }
    });
    saveGameState();
    return newAchievements;
}

function showAchievementNotification(achievement) {
    const notif = document.getElementById('achievementUnlocked');
    notif.textContent = `ACHIEVEMENT UNLOCKED: ${achievement.name}`;
    notif.classList.add('show');
    setTimeout(() => notif.classList.remove('show'), 3000);
}

// Particle Animation - Main Background
const canvas = document.getElementById('particles-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const particleCount = 100;

class Particle {
    constructor(canvasWidth, canvasHeight) {
        this.x = Math.random() * canvasWidth;
        this.y = Math.random() * canvasHeight;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2;
    }

    update(canvasWidth, canvasHeight) {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvasWidth) this.vx *= -1;
        if (this.y < 0 || this.y > canvasHeight) this.vy *= -1;
    }

    draw(context) {
        context.fillStyle = 'rgba(0, 245, 255, 0.5)';
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
    }
}

for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(canvas.width, canvas.height));
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
        particle.update(canvas.width, canvas.height);
        particle.draw(ctx);
    });

    particles.forEach((p1, i) => {
        particles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                ctx.strokeStyle = `rgba(0, 245, 255, ${0.2 * (1 - distance / 100)})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });
    });

    requestAnimationFrame(animateParticles);
}

animateParticles();

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Phone Canvas Particles
const phoneCanvas = document.getElementById('phone-particles-canvas');
const phoneCtx = phoneCanvas.getContext('2d');
const phoneScreen = document.querySelector('.phone-screen');

function resizePhoneCanvas() {
    phoneCanvas.width = phoneScreen.offsetWidth;
    phoneCanvas.height = phoneScreen.offsetHeight;
}

resizePhoneCanvas();
window.addEventListener('resize', resizePhoneCanvas);

const phoneParticles = [];
const phoneParticleCount = 50;

for (let i = 0; i < phoneParticleCount; i++) {
    phoneParticles.push(new Particle(phoneCanvas.width, phoneCanvas.height));
}

function animatePhoneParticles() {
    phoneCtx.clearRect(0, 0, phoneCanvas.width, phoneCanvas.height);

    phoneParticles.forEach(particle => {
        particle.update(phoneCanvas.width, phoneCanvas.height);
        particle.draw(phoneCtx);
    });

    phoneParticles.forEach((p1, i) => {
        phoneParticles.slice(i + 1).forEach(p2 => {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80) {
                phoneCtx.strokeStyle = `rgba(0, 245, 255, ${0.15 * (1 - distance / 80)})`;
                phoneCtx.lineWidth = 0.5;
                phoneCtx.beginPath();
                phoneCtx.moveTo(p1.x, p1.y);
                phoneCtx.lineTo(p2.x, p2.y);
                phoneCtx.stroke();
            }
        });
    });

    requestAnimationFrame(animatePhoneParticles);
}

animatePhoneParticles();

// ===== API CONFIGURATION =====
// API_BASE is defined in HTML: const API_BASE = '/api';

// Store original game data from inline constants
let phishingLevels;
let passwordLevels;
let networkLevels;
let sqlLevels;

// Load game data from API on page load
async function loadGameDataFromAPI() {
    try {
        console.log('Attempting to load game data from API...');
        
        // Load phishing levels
        const phishingRes = await fetch(`${API_BASE}/games/phishing`);
        if (phishingRes.ok) {
            const jsonData = await phishingRes.json();
            phishingLevels = jsonData.data || jsonData;
            console.log('Phishing levels loaded from API:', phishingLevels.length);
        } else {
            console.warn('Failed to load phishing levels from API, using inline data');
        }

        // Load password levels
        const passwordRes = await fetch(`${API_BASE}/games/password`);
        if (passwordRes.ok) {
            const jsonData = await passwordRes.json();
            passwordLevels = jsonData.data || jsonData;
            console.log('Password levels loaded from API:', passwordLevels.length);
        } else {
            console.warn('Failed to load password levels from API, using inline data');
        }

        // Load SQL levels (if available)
        const sqlRes = await fetch(`${API_BASE}/games/sql`);
        if (sqlRes.ok) {
            const jsonData = await sqlRes.json();
            sqlLevels = jsonData.data || jsonData;
            console.log('SQL levels loaded from API:', sqlLevels.length);
        } else {
            console.warn('Failed to load SQL levels from API, using inline data');
        }

        console.log('Game data API loading complete');
        return true;
    } catch (error) {
        console.error('Error loading game data from API:', error);
        console.log('Falling back to inline game data');
        return false;
    }
}

// ===== GAME DATA =====
const INLINE_PHISHING_LEVELS = [
    {
        id: 1,
        title: "PayPal Security Alert",
        type: "Email",
        difficulty: "easy",
        sender: "security@paypa1-alert.com",
        message: "Your PayPal account requires immediate verification. Unusual activity detected from IP 203.45.12.88 in Nigeria. Click here to secure your account within 24 hours or account will be permanently limited. Case ID: PP-8472-URGENT",
        highlights: ["paypa1-alert.com", "immediate verification", "Click here", "24 hours", "permanently limited"],
        question: {
            prompt: "What makes this email suspicious?",
            choices: [
                "Domain uses '1' instead of 'l' in PayPal (typosquatting)",
                "Email mentions unusual activity",
                "Case ID is present",
                "Mentions a specific IP address"
            ],
            correct: 0
        },
        tip: "Always check the sender's domain carefully. Legitimate PayPal emails come from @paypal.com, not variations with numbers or extra words. Typosquatting is one of the most common phishing techniques."
    },
    {
        id: 2,
        title: "Microsoft 365 Expiration",
        type: "Email",
        difficulty: "medium",
        sender: "no-reply@microsoft-security.services",
        message: "Your Microsoft 365 subscription expires today. To maintain access to your files and email, renew immediately at microsoft-renewal.services/verify. Enter your credentials to confirm renewal. Failure to act will result in permanent data loss.",
        highlights: ["microsoft-security.services", "expires today", "immediately", "microsoft-renewal.services", "Enter your credentials", "permanent data loss"],
        question: {
            prompt: "Which red flags indicate this is phishing?",
            choices: [
                "Uses urgent language and threatens data loss",
                "Links to suspicious domains not owned by Microsoft",
                "Requests credential entry through a link",
                "All of the above"
            ],
            correct: 3
        },
        tip: "Real Microsoft emails never ask you to click links to enter credentials. They use microsoft.com domains only. Multiple red flags (urgency, fake domains, credential requests) together confirm phishing."
    },
    {
        id: 3,
        title: "CEO Wire Transfer",
        type: "Email",
        difficulty: "hard",
        sender: "cfo@company-holdings.net",
        message: "Need urgent wire transfer processed. I'm in meetings all day - cannot be reached by phone. Wire $24,500 to vendor account: Wells Fargo 8472-4419-2203, routing 021000021. This is time-sensitive for the merger. Do not discuss with finance team as this is confidential. Confirm once sent.",
        highlights: ["company-holdings.net", "urgent", "cannot be reached", "Do not discuss", "confidential", "Confirm once sent"],
        question: {
            prompt: "What type of sophisticated attack is this?",
            choices: [
                "Standard phishing attempt",
                "Business Email Compromise (BEC) using authority and urgency",
                "Ransomware attack vector",
                "Simple spam email"
            ],
            correct: 1
        },
        tip: "BEC attacks impersonate executives to bypass controls. Red flags: urgency, secrecy ('do not discuss'), unavailability, and pressure to act immediately. Always verify large transfers through secondary communication."
    },
    {
        id: 4,
        title: "Amazon Order Confirmation",
        type: "Email",
        difficulty: "medium",
        sender: "orders@amazon-services.net",
        message: "Your order #482-7721945-8372619 for MacBook Pro 16-inch ($2,499.00) has been confirmed. Delivery expected tomorrow. If you did not make this purchase, click here to cancel within 2 hours. Your account will be charged immediately.",
        highlights: ["amazon-services.net", "click here", "2 hours", "charged immediately"],
        question: {
            prompt: "How does this phishing attempt create urgency?",
            choices: [
                "Uses fake expensive purchase to trigger panic",
                "Creates artificial 2-hour deadline",
                "Both A and B to make victim act without thinking",
                "None - this is a legitimate Amazon email"
            ],
            correct: 2
        },
        tip: "Phishers use fake purchase notifications to create panic. Check sender domain (amazon-services.net is fake - real is amazon.com). Never click links in suspicious emails - go directly to the site instead."
    },
    {
        id: 5,
        title: "Bank Fraud Alert",
        type: "SMS",
        difficulty: "hard",
        sender: "BankAlert",
        message: "FRAUD ALERT: Charge of $847.32 at Best Buy declined. Your card ending 4729 blocked. Verify at secure-bankverify.com/4729 or call 1-888-555-0123. Time sensitive - 30 min to respond. Reply STOP to cancel.",
        highlights: ["secure-bankverify.com", "Time sensitive", "30 min"],
        question: {
            prompt: "What makes this SMS phishing (smishing) effective?",
            choices: [
                "Uses real-looking alert format with specific details",
                "Provides fake phone number to call",
                "Creates urgency with 30-minute deadline",
                "All of the above make it convincing"
            ],
            correct: 3
        },
        tip: "Smishing uses realistic details (card numbers, amounts, timelines) to seem legitimate. Banks never send links via SMS. Always contact your bank using the number on your card or statement, never numbers in messages."
    },
    {
        id: 6,
        title: "IT Department Password Reset",
        type: "Email",
        difficulty: "hard",
        sender: "it-support@company.internal.net",
        message: "System maintenance requires all users to reset passwords. Click here to access the secure password portal. Use your current credentials to authenticate then create new password. This must be completed before 5PM today per security policy update. Contact helpdesk ext. 4892 with issues.",
        highlights: ["company.internal.net", "Click here", "Use your current credentials", "before 5PM today"],
        question: {
            prompt: "Why is this internal-looking email still phishing?",
            choices: [
                "IT would never ask for current credentials via email link",
                "Domain uses .internal.net which isn't standard",
                "Real IT departments use password portals accessible directly, not via email links",
                "All of the above"
            ],
            correct: 3
        },
        tip: "Internal phishing is sophisticated. Even if it looks like IT, legitimate departments never send password portals via email. The .internal.net domain is suspicious - check your company's actual IT domain format."
    },
    {
        id: 7,
        title: "LinkedIn Connection Request",
        type: "Email",
        difficulty: "hard",
        sender: "notifications@linked-in.services",
        message: "Sarah Chen has sent you a connection request on LinkedIn. View their profile at linked-in.services/profile/sarah-chen-92384. You have 45 days to accept or request expires. They've viewed your profile 3 times this week and appears to be a recruiter at Google.",
        highlights: ["linked-in.services", "View their profile", "recruiter at Google", "45 days"],
        question: {
            prompt: "Why is this phishing despite seeming legitimate?",
            choices: [
                "LinkedIn's real domain is linkedin.com, not linked-in.services",
                "Legitimate LinkedIn never asks to click links to view profiles",
                "The urgency ('45 days') and authority ('Google recruiter') are psychological triggers",
                "All of the above"
            ],
            correct: 3
        },
        tip: "Job seekers are targeted with fake LinkedIn invitations. The domain uses 'linked-in' (with dash) instead of 'linkedin' (no dash). Always go directly to LinkedIn.com instead of clicking email links. Legitimate employers don't recruit via phishing."
    },
    {
        id: 8,
        title: "Crypto Exchange Alert",
        type: "Email",
        difficulty: "hard",
        sender: "security@coinbaseexchange.co",
        message: "Unusual trading activity detected on your Coinbase account! $15,400 transferred to external wallet. Secure your account immediately: coinbaseexchange.co/security. Verify via 2FA code: 847392. Transaction ID: CB-9482-ULTRA. Time limit: 1 hour before funds are permanently lost.",
        highlights: ["coinbaseexchange.co", "Secure immediately", "external wallet", "1 hour", "permanently lost"],
        question: {
            prompt: "What sophisticated techniques make this phishing deceptive?",
            choices: [
                "Uses real transaction details ($15,400) to seem authentic",
                "Fake 2FA code to appear as if they have account access",
                "Combines urgency, authority, and social proof (real-looking transaction ID)",
                "All - this is a multi-layered attack"
            ],
            correct: 3
        },
        tip: "Crypto phishing combines urgency, fake transaction amounts, and 2FA codes to seem legitimate. Real Coinbase domain is coinbase.com, not coinbaseexchange.co. Never share 2FA codes - real exchanges won't ask for them via email."
    },
    {
        id: 9,
        title: "Tax Return Update",
        type: "Email",
        difficulty: "very hard",
        sender: "no-reply@irs-refund-status.gov",
        message: "IRS Refund Status Update: Your 2024 tax refund of $3,247 is ready for direct deposit but requires final verification at irs-refund-status.gov/verify-2024. Verification needed within 48 hours or refund will be held. Form I-9S requires your: SSN, DOB, address, and banking details for deposit. Ref: IRS-2024-847392.",
        highlights: ["irs-refund-status.gov", "final verification", "48 hours", "SSN", "DOB", "banking details"],
        question: {
            prompt: "What makes this sophisticated tax phishing so dangerous?",
            choices: [
                "Targets tax season when people are thinking about refunds",
                "Requests multiple PII (SSN, DOB, banking details) at once",
                "Uses fake .gov domain and official-sounding IRS references",
                "All of the above - this is a high-impact attack"
            ],
            correct: 3
        },
        tip: "Tax scams are among the most sophisticated phishing attacks. The IRS NEVER initiates contact via email about refunds or taxes. Real IRS domain is irs.gov. Never provide SSN, DOB, or banking details via email. If in doubt, call the IRS directly at 1-800-829-1040."
    },
    {
        id: 10,
        title: "Zero-Day Package Delivery",
        type: "Email",
        difficulty: "very hard",
        sender: "delivery@track-packages.xyz",
        message: "Your shipment from FedEx could not be delivered. Package #FDX-482-7392-XYZ awaits at local facility. Schedule redelivery or pickup at track-packages.xyz/redelivery. Click here for tracking. Your package contains items worth $1,247 - signature required. Last attempt: today at 3PM before return to sender. Track via QR: [image]",
        highlights: ["track-packages.xyz", "Last attempt: today", "Click here", "QR"],
        question: {
            prompt: "What advanced tactics does this package delivery phishing use?",
            choices: [
                "Impersonates trusted carrier (FedEx) with fake domain",
                "Uses urgency (last attempt, specific time) and scare tactics (item value)",
                "Includes QR code to bypass URL awareness and go directly to malware",
                "All - this is an advanced multi-vector attack"
            ],
            correct: 3
        },
        tip: "Modern phishing uses QR codes to bypass email security and user awareness. Never scan QR codes from unsolicited emails. Real FedEx/UPS use fedex.com and ups.com domains. Check actual tracking via the shipper's official app or website, not email links."
    }
];

const INLINE_PASSWORD_LEVELS = [
    {
        id: 1,
        title: "Social Media Influencer",
        password: "Fluffy2018",
        hints: [
            "Instagram handle @fluffylover mentions their Persian cat 'Fluffy'",
            "Profile creation date: March 2018",
            "Bio states: 'Cat mom since 2018'",
            "Posts show cat named Fluffy in 40+ photos"
        ],
        tip: "Pet names combined with significant years are extremely common passwords. Information from social media profiles makes these trivial to crack. Use randomly generated passwords instead."
    },
    {
        id: 2,
        title: "Corporate Employee",
        password: "Spring2024!",
        hints: [
            "Company enforces quarterly password changes",
            "Current season and year: Spring 2024",
            "Password policy: 8+ characters, 1 special character",
            "Previous passwords detected: Winter2023!, Fall2023!"
        ],
        tip: "Predictable patterns like Season+Year+! are easily guessed. Password rotation policies often lead to predictable changes. Use unique, random passwords stored in a password manager."
    },
    {
        id: 3,
        title: "Gaming Account Target",
        password: "Minecraft123",
        hints: [
            "Steam profile shows 847 hours in Minecraft",
            "Username: MinecraftPro123",
            "Most played game by 600+ hours margin",
            "Account created 2023, no special characters used"
        ],
        tip: "Using your favorite game with sequential numbers is in every password cracking dictionary. Gamers are often targeted - use unique passwords for each gaming account."
    },
    {
        id: 4,
        title: "Small Business Owner",
        password: "Coffee$hop",
        hints: [
            "Owns coffee shop called 'The Coffee Shop'",
            "Business website: thecoffeeshop.com",
            "Company email pattern: @thecoffeeshop.com",
            "Replaces 'S' with '$' in business name"
        ],
        tip: "Business owners often use their company name with simple character substitutions. This is predictable and dangerous - a breach affects business and personal accounts. Separate business and personal passwords completely."
    },
    {
        id: 5,
        title: "Tech Support Scam Victim",
        password: "Admin123!",
        hints: [
            "Called 'tech support' who asked them to create 'admin' account",
            "Scammer instructed: 'Make password admin123 with exclamation'",
            "Victim followed instructions exactly",
            "This is a social engineering attack in progress"
        ],
        tip: "Tech support scammers often have victims create accounts with known passwords. Real tech support NEVER asks you to create accounts or share passwords. This victim has been compromised."
    }
];

const INLINE_NETWORK_LEVELS = [
    {
        id: 1,
        title: "Corporate Network Intrusion",
        nodes: [
            { id: 1, label: "Web Server", icon: "WEB", threat: true, desc: "Serving unusual traffic" },
            { id: 2, label: "Database", icon: "DB", threat: false, desc: "Normal operations" },
            { id: 3, label: "Router", icon: "RTR", threat: true, desc: "Suspicious packets" },
            { id: 4, label: "Firewall", icon: "FW", threat: false, desc: "Rules intact" },
            { id: 5, label: "Workstation", icon: "PC", threat: true, desc: "Malware detected" },
            { id: 6, label: "Email Server", icon: "MAIL", threat: false, desc: "Quarantine active" },
            { id: 7, label: "DNS Server", icon: "DNS", threat: true, desc: "Redirecting traffic" },
            { id: 8, label: "VPN Gateway", icon: "VPN", threat: false, desc: "Secure tunnel" },
            { id: 9, label: "Backup Server", icon: "BAK", threat: false, desc: "Last backup OK" }
        ],
        tip: "In a real intrusion, compromised systems often show unusual traffic patterns. Web servers, routers, DNS, and workstations are common attack vectors. Regular monitoring and IDS systems are critical."
    },
    {
        id: 2,
        title: "IoT Botnet Attack",
        nodes: [
            { id: 1, label: "Smart Camera", icon: "CAM", threat: true, desc: "Default password" },
            { id: 2, label: "Smart Lock", icon: "LOCK", threat: false, desc: "Updated firmware" },
            { id: 3, label: "Gateway", icon: "GW", threat: true, desc: "Compromised" },
            { id: 4, label: "Thermostat", icon: "TEMP", threat: false, desc: "Secured" },
            { id: 5, label: "Smart TV", icon: "TV", threat: true, desc: "Outdated firmware" },
            { id: 6, label: "Hub", icon: "HUB", threat: false, desc: "Protected" },
            { id: 7, label: "Speaker", icon: "SPK", threat: true, desc: "Open port" },
            { id: 8, label: "Light System", icon: "LGHT", threat: false, desc: "Encrypted" },
            { id: 9, label: "Security Sys", icon: "SEC", threat: false, desc: "Monitoring" }
        ],
        tip: "IoT devices with default passwords, outdated firmware, or open ports are prime botnet targets. The Mirai botnet used exactly these vulnerabilities. Always change defaults and update firmware."
    },
    {
        id: 3,
        title: "Ransomware Spread",
        nodes: [
            { id: 1, label: "File Server", icon: "FS", threat: true, desc: "Files encrypted" },
            { id: 2, label: "HR Database", icon: "HR", threat: false, desc: "Isolated" },
            { id: 3, label: "Dev Server", icon: "DEV", threat: true, desc: "Lateral movement" },
            { id: 4, label: "Print Server", icon: "PRT", threat: false, desc: "Offline" },
            { id: 5, label: "Domain Ctrl", icon: "DC", threat: true, desc: "Admin compromised" },
            { id: 6, label: "Backup NAS", icon: "NAS", threat: false, desc: "Air-gapped" },
            { id: 7, label: "Accounting", icon: "ACCT", threat: true, desc: "Crypto running" },
            { id: 8, label: "Production", icon: "PROD", threat: false, desc: "Segmented" },
            { id: 9, label: "Marketing", icon: "MKT", threat: false, desc: "Protected" }
        ],
        tip: "Ransomware spreads through lateral movement after initial compromise. File servers, domain controllers, and systems with elevated access are priority targets. Network segmentation and offline backups are essential defenses."
    }
];

const INLINE_SQL_LEVELS = [
    {
        id: 1,
        title: "Login Authentication",
        code: [
            { line: "def login(username, password):", vulnerable: false },
            { line: "    query = \"SELECT * FROM users WHERE username='\" + username + \"' AND password='\" + password + \"'\"", vulnerable: true },
            { line: "    result = db.execute(query)", vulnerable: false },
            { line: "    return result", vulnerable: false }
        ],
        vulnerableLine: 1,
        tip: "String concatenation allows SQL injection. Input like: admin' OR '1'='1 bypasses authentication. Always use parameterized queries: cursor.execute('SELECT * FROM users WHERE username=? AND password=?', (username, password))"
    },
    {
        id: 2,
        title: "Product Search",
        code: [
            { line: "def search_products(search_term):", vulnerable: false },
            { line: "    sql = f\"SELECT * FROM products WHERE name LIKE '%{search_term}%'\"", vulnerable: true },
            { line: "    results = database.query(sql)", vulnerable: false },
            { line: "    return results", vulnerable: false }
        ],
        vulnerableLine: 1,
        tip: "F-strings with user input create injection points. Attacker input: %' OR 1=1 -- reveals all products. Use parameterized queries with LIKE: cursor.execute('SELECT * FROM products WHERE name LIKE ?', (f'%{search_term}%',))"
    },
    {
        id: 3,
        title: "User Profile Update",
        code: [
            { line: "def update_email(user_id, new_email):", vulnerable: false },
            { line: "    validated_email = sanitize_input(new_email)", vulnerable: false },
            { line: "    query = f\"UPDATE users SET email='{validated_email}' WHERE id={user_id}\"", vulnerable: true },
            { line: "    db.execute(query)", vulnerable: false },
            { line: "    return True", vulnerable: false }
        ],
        vulnerableLine: 2,
        tip: "Even with input validation, string formatting is dangerous. User could inject: test@example.com' WHERE '1'='1 to update all emails. Parameterized queries prevent this: cursor.execute('UPDATE users SET email=? WHERE id=?', (new_email, user_id))"
    },
    {
        id: 4,
        title: "Blog Comments",
        code: [
            { line: "def add_comment(post_id, author, comment):", vulnerable: false },
            { line: "    sql = \"INSERT INTO comments (post_id, author, comment) VALUES (\"", vulnerable: false },
            { line: "    sql += str(post_id) + \", '\" + author + \"', '\" + comment + \"')\"", vulnerable: true },
            { line: "    db.execute(sql)", vulnerable: false },
            { line: "    return True", vulnerable: false }
        ],
        vulnerableLine: 2,
        tip: "INSERT statements are also vulnerable. Malicious comment: '); DROP TABLE comments; -- could destroy data. Use parameterized inserts: cursor.execute('INSERT INTO comments VALUES (?, ?, ?)', (post_id, author, comment))"
    }
];

// ===== GAME VARIABLES =====
let currentGameMode = '';
let currentLevel = 0;
let timerInterval = null;
let selectedHighlights = [];
let selectedChoice = null;
let passwordAttempts = 0;
let selectedNodes = [];
let currentNetworkLevel = null;
let selectedSQLLine = null;
let levelRotation = {
    phishing: [],
    password: [],
    network: [],
    sql: []
};

// ===== DATA INITIALIZATION =====
// Initialize with inline data first
phishingLevels = INLINE_PHISHING_LEVELS;
passwordLevels = INLINE_PASSWORD_LEVELS;
networkLevels = INLINE_NETWORK_LEVELS;
sqlLevels = INLINE_SQL_LEVELS;

// Try to load from API, fall back to inline data if it fails
loadGameDataFromAPI().catch(error => {
    console.warn('API loading failed, using inline data:', error);
});

// ===== INITIALIZATION =====
updateHomeStats();
updateModeProgress();
updateTime();
setInterval(updateTime, 1000);

function updateTime() {
    const now = new Date();
    const hours = now.getHours() % 12 || 12;
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    document.getElementById('currentTime').textContent = `${hours}:${minutes} ${ampm}`;
}

function updateHomeStats() {
    document.getElementById('totalScore').textContent = gameState.totalScore.toLocaleString();
    document.getElementById('completedCount').textContent = gameState.completedCount;
    document.getElementById('streakCount').textContent = gameState.currentStreak;
}

function updateModeProgress() {
    const setProgress = (elementId, completed, total) => {
        const progress = (completed.length / total) * 100;
        document.getElementById(elementId).style.width = progress + '%';
    };

    setProgress('phishingProgress', gameState.phishingCompleted, phishingLevels.length);
    setProgress('passwordProgress', gameState.passwordCompleted, passwordLevels.length);
    setProgress('networkProgress', gameState.networkCompleted, networkLevels.length);
    setProgress('sqlProgress', gameState.sqlCompleted, sqlLevels.length);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    stopTimer();
}

function showHome() {
    showScreen('homeScreen');
    updateHomeStats();
    updateModeProgress();
}

// ===== MODAL FUNCTIONS =====
function showStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.add('active');

    // Update modal stats
    document.getElementById('modalTotalScore').textContent = gameState.totalScore.toLocaleString();
    document.getElementById('modalCompletedCount').textContent = gameState.completedCount;
    document.getElementById('phishingCompleted').textContent = gameState.phishingCompleted.length;
    document.getElementById('passwordCompleted').textContent = gameState.passwordCompleted.length;
    document.getElementById('networkCompleted').textContent = gameState.networkCompleted.length;
    document.getElementById('sqlCompleted').textContent = gameState.sqlCompleted.length;
    document.getElementById('modalCurrentStreak').textContent = gameState.currentStreak;
    document.getElementById('modalBestStreak').textContent = gameState.bestStreak;

    const accuracy = gameState.totalAttempts > 0 ?
        Math.round((gameState.correctAttempts / gameState.totalAttempts) * 100) : 0;
    document.getElementById('modalAccuracy').textContent = accuracy + '%';

    // Update achievements
    const achievementsGrid = document.getElementById('achievementsGrid');
    achievementsGrid.innerHTML = '';
    achievements.forEach(ach => {
        const unlocked = gameState.achievements.includes(ach.id);
        const achEl = document.createElement('div');
        achEl.className = 'achievement-item' + (unlocked ? ' unlocked' : '');
        achEl.innerHTML = `
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
        `;
        achievementsGrid.appendChild(achEl);
    });
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('statsModal').addEventListener('click', (e) => {
    if (e.target.id === 'statsModal') {
        closeStatsModal();
    }
});

function selectGameMode(mode) {
    currentGameMode = mode;
    currentLevel = 0;
    
    // Initialize rotation arrays if empty
    if (levelRotation[mode].length === 0) {
        const levelsArray = mode === 'phishing' ? phishingLevels :
                          mode === 'password' ? passwordLevels :
                          mode === 'network' ? networkLevels :
                          sqlLevels;
        levelRotation[mode] = shuffleArray([...Array(levelsArray.length).keys()]);
    }

    switch(mode) {
        case 'phishing':
            startPhishingLevel();
            break;
        case 'password':
            startPasswordLevel();
            break;
        case 'network':
            startNetworkLevel();
            break;
        case 'sql':
            startSQLLevel();
            break;
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== PHISHING GAME =====
function startPhishingLevel() {
    // Debug: Check if data is loaded
    console.log('Starting phishing level. phishingLevels count:', phishingLevels?.length);
    
    if (!phishingLevels || phishingLevels.length === 0) {
        console.error('Phishing levels not loaded!');
        alert('Error: Game data not loaded. Please refresh the page.');
        return;
    }
    
    // Get next level from rotation
    if (currentLevel >= levelRotation.phishing.length) {
        levelRotation.phishing = shuffleArray([...Array(phishingLevels.length).keys()]);
        currentLevel = 0;
    }
    
    const levelIndex = levelRotation.phishing[currentLevel];
    const level = phishingLevels[levelIndex];
    
    console.log('Loading level:', levelIndex, level?.title);
    
    selectedHighlights = [];
    selectedChoice = null;

    showScreen('phishingScreen');
    startTimer('timer', 45);

    document.getElementById('levelTitle').textContent = level.title;
    document.getElementById('levelType').textContent = level.type;
    document.getElementById('difficultyBadge').textContent = level.difficulty.toUpperCase();
    document.getElementById('difficultyBadge').className = `difficulty-badge difficulty-${level.difficulty}`;
    document.getElementById('messageSender').textContent = `From: ${level.sender}`;
    document.getElementById('questionPrompt').textContent = level.question.prompt;
    document.getElementById('submitBtn').disabled = true;

    let messageHTML = level.message;
    level.highlights.forEach((text, idx) => {
        const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        messageHTML = messageHTML.replace(regex, `<span class="highlight" data-text="${text}" data-index="${idx}">${text}</span>`);
    });
    document.getElementById('messageText').innerHTML = messageHTML;

    document.querySelectorAll('.highlight').forEach(el => {
        el.addEventListener('click', () => toggleHighlight(el, level));
    });

    const choicesContainer = document.getElementById('choicesContainer');
    choicesContainer.innerHTML = '';
    level.question.choices.forEach((choice, index) => {
        const choiceEl = document.createElement('div');
        choiceEl.className = 'choice';
        choiceEl.textContent = choice;
        choiceEl.onclick = () => selectChoice(index);
        choicesContainer.appendChild(choiceEl);
    });

    updateProgress();
}

function toggleHighlight(element, level) {
    const text = element.dataset.text;

    if (selectedHighlights.includes(text)) {
        selectedHighlights = selectedHighlights.filter(t => t !== text);
        element.classList.remove('selected');
    } else {
        selectedHighlights.push(text);
        element.classList.add('selected');
    }

    checkSubmitReady();
}

function selectChoice(index) {
    document.querySelectorAll('.choice').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.choice')[index].classList.add('selected');
    selectedChoice = index;
    checkSubmitReady();
}

function checkSubmitReady() {
    document.getElementById('submitBtn').disabled = selectedChoice === null;
}

function submitPhishing() {
    stopTimer();
    const levelIndex = levelRotation.phishing[currentLevel];
    const level = phishingLevels[levelIndex];
    const timerText = document.getElementById('timer').textContent.replace('s', '');
    const timeElapsed = 45 - parseInt(timerText);

    let correctHighlights = 0;
    let wrongHighlights = 0;

    document.querySelectorAll('.highlight').forEach(el => {
        const text = el.dataset.text;
        if (selectedHighlights.includes(text)) {
            if (level.highlights.includes(text)) {
                el.classList.add('correct-answer');
                correctHighlights++;
            } else {
                el.classList.add('wrong');
                wrongHighlights++;
            }
        } else if (level.highlights.includes(text)) {
            el.classList.add('correct-answer');
        }
    });

    const isCorrect = selectedChoice === level.question.correct;

    if (isCorrect) {
        document.querySelectorAll('.choice')[selectedChoice].classList.add('correct');
    } else {
        document.querySelectorAll('.choice')[selectedChoice].classList.add('incorrect');
        document.querySelectorAll('.choice')[level.question.correct].classList.add('correct');
    }

    const accuracy = Math.round(((correctHighlights / level.highlights.length) * 100));
    const points = (correctHighlights * 50) - (wrongHighlights * 25) + (isCorrect ? 150 : 0);

    gameState.totalAttempts++;
    if (isCorrect && accuracy >= 80) {
        gameState.correctAttempts++;
        if (!gameState.phishingCompleted.includes(level.id)) {
            gameState.phishingCompleted.push(level.id);
        }
    }
    saveGameState();

    setTimeout(() => showResult(points, accuracy, timeElapsed, level.tip, isCorrect), 1000);
}

// ===== PASSWORD CRACKER GAME =====
function startPasswordLevel() {
    console.log('Starting password level. passwordLevels count:', passwordLevels?.length);
    
    if (!passwordLevels || passwordLevels.length === 0) {
        console.error('Password levels not loaded!');
        alert('Error: Game data not loaded. Please refresh the page.');
        return;
    }
    
    // Get next level from rotation
    if (currentLevel >= levelRotation.password.length) {
        levelRotation.password = shuffleArray([...Array(passwordLevels.length).keys()]);
        currentLevel = 0;
    }
    
    const levelIndex = levelRotation.password[currentLevel];
    const level = passwordLevels[levelIndex];
    console.log('Loading password level:', levelIndex, level?.title);
    passwordAttempts = 0;

    showScreen('passwordScreen');
    startTimer('passwordTimer', 90);

    document.getElementById('passwordTitle').textContent = level.title;
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordFeedback').textContent = '';

    const hintsContainer = document.getElementById('passwordHints');
    hintsContainer.innerHTML = '<div class="hint-list-title">INTELLIGENCE GATHERED</div>';
    level.hints.forEach(hint => {
        const hintEl = document.createElement('div');
        hintEl.className = 'hint-item';
        hintEl.textContent = hint;
        hintsContainer.appendChild(hintEl);
    });
}

function checkPassword() {
    const levelIndex = levelRotation.password[currentLevel];
    const level = passwordLevels[levelIndex];
    const guess = document.getElementById('passwordInput').value;
    const feedback = document.getElementById('passwordFeedback');

    passwordAttempts++;

    if (guess.toLowerCase() === level.password.toLowerCase()) {
        stopTimer();
        const timerText = document.getElementById('passwordTimer').textContent.replace('s', '');
        const timeElapsed = 90 - parseInt(timerText);
        const points = Math.max(250 - (passwordAttempts * 30), 75);

        feedback.style.color = '#28a745';
        feedback.textContent = `ACCESS GRANTED! Password cracked in ${passwordAttempts} attempts.`;

        gameState.totalAttempts++;
        gameState.correctAttempts++;
        if (!gameState.passwordCompleted.includes(level.id)) {
            gameState.passwordCompleted.push(level.id);
        }
        saveGameState();

        setTimeout(() => showResult(points, 100, timeElapsed, level.tip, true), 1200);
    } else {
        feedback.style.color = '#dc3545';
        feedback.textContent = `ACCESS DENIED. Attempt ${passwordAttempts}/5`;

        if (passwordAttempts >= 5) {
            stopTimer();
            feedback.textContent = `LOCKOUT! The password was: ${level.password}`;
            gameState.totalAttempts++;
            saveGameState();
            setTimeout(() => showResult(0, 0, 90, level.tip, false), 1500);
        }
    }
}

// ===== NETWORK CALL GAME (AI Scammer) =====
let scammerConversation = [];
let scammerPersona = null;
let mediaRecorder = null;
let audioChunks = [];
let microphoneActive = false;
let recordingStartTime = null;
let currentScenarioId = null;
let callType = null;
let messageCount = 0;
let userGaveInfo = false;
let userHungUp = false;

// ===== NETWORK CALL GAME =====
let networkCallStartTime = null;
let callDurationInterval = null;
let requestedPersonalInfo = [];
const PERSONAL_INFO_KEYWORDS = {
    'ssn': ['ssn', 'social security', 'security number', '###-##-####'],
    'credit_card': ['credit card', 'card number', 'visa', 'mastercard', 'amex', '####-####-####-####'],
    'bank': ['bank account', 'account number', 'routing number', 'bank details'],
    'password': ['password', 'pin', 'password protected', 'security code'],
    'email': ['email', 'email address', '@'],
    'phone': ['phone number', 'cell phone', 'mobile number', '+1', '(', 'call me at'],
    'address': ['address', 'street', 'zip code', 'home address'],
    'name': ['name', 'first name', 'last name', 'full name'],
    'birthdate': ['date of birth', 'birthday', 'born in', 'age'],
    'payment': ['payment', 'credit', 'debit', 'wire transfer', 'itunes card', 'google play']
};

// Check for browser speech recognition support
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const synth = window.speechSynthesis;

async function startNetworkLevel() {
    // Show network screen
    showScreen('networkScreen');
    startTimer('networkTimer', 300); // 5 minutes for call

    // Fetch a new random scenario from the backend
    try {
        const response = await fetch(`${API_BASE}/scammer/greeting`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        
        if (data.success) {
            currentScenarioId = data.scenario_id;
            callType = data.call_type;  // 'scam' or 'legitimate'
            userGaveInfo = false;
            requestedPersonalInfo = [];
        }
    } catch (error) {
        console.error('Failed to load scenario:', error);
        currentScenarioId = 'paypal_scam';
        callType = 'scam';
    }

    // Reset call tracking
    scammerConversation = [];
    requestedPersonalInfo = [];
    networkCallStartTime = null;
    if (callDurationInterval) clearInterval(callDurationInterval);
    
    // Clear UI
    document.getElementById('conversationBox').innerHTML = '';
    document.getElementById('userInput').value = '';
    document.getElementById('infoList').innerHTML = '';
    microphoneActive = false;

    // Show incoming call screen, hide active call screen
    document.getElementById('incomingCallScreen').style.display = 'flex';
    document.getElementById('incomingCallScreen').classList.remove('hidden');
    document.getElementById('activeCallScreen').style.display = 'none';
    document.getElementById('activeCallScreen').classList.add('hidden');
    
    // Generate random phone number
    const randomNumber = `+1 (${Math.floor(Math.random()*900)+100}) ${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}`;
    document.getElementById('incomingCallerName').textContent = randomNumber;
}

function declineCall() {
    // User hung up immediately - need to determine if it's the right choice
    // First get the scenario to know if it's legit or scam
    fetch(`${API_BASE}/scammer/greeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(res => res.json())
    .then(data => {
        const callType = data.call_type;
        let points = 0;
        let accuracy = 0;
        let resultTitle = '';
        let resultIcon = '';
        let tip = '';
        let isCorrect = false;

        // LEGITIMATE CALL - Declining is WRONG
        if (callType === 'legitimate') {
            points = 0;
            accuracy = 0;
            resultTitle = 'MISTAKE!';
            resultIcon = '❌';
            tip = 'You declined a legitimate call from your bank! Always listen to the first few seconds to determine if it\'s real. Legitimate calls usually give their company name clearly.';
            isCorrect = false;
        }
        // SCAM CALL - Declining immediately is EXCELLENT
        else {
            points = 300;
            accuracy = 100;
            resultTitle = 'PERFECT!';
            resultIcon = '⭐';
            tip = 'Excellent! You rejected the call immediately without engaging. This is the absolute best defense - never let scammers keep you on the line.';
            isCorrect = true;
        }

        gameState.totalAttempts++;
        if (isCorrect) gameState.correctAttempts++;
        if (!gameState.networkCompleted.includes(1)) {
            gameState.networkCompleted.push(1);
        }
        saveGameState();

        setTimeout(() => {
            showResultWithCallDetails(points, accuracy, 0, tip, isCorrect, resultTitle, resultIcon);
        }, 500);
    })
    .catch(() => {
        // Fallback - assume scam if we can't get scenario
        const points = 300;
        const accuracy = 100;
        gameState.totalAttempts++;
        gameState.correctAttempts++;
        saveGameState();
        
        setTimeout(() => {
            showResultWithCallDetails(points, accuracy, 0, 'Great instinct! You declined immediately.', true, 'PERFECT!', '⭐');
        }, 500);
    });
}

function acceptCall() {
    // Unlock iOS audio context on user interaction
    unlockAudioContext().then(() => {
        console.log('Audio ready for playback');
    });
    
    // CRITICAL FOR iOS: Prime speech synthesis with immediate user interaction
    // iOS Safari requires at least one speak() call directly in user event handler
    const primeUtterance = new SpeechSynthesisUtterance(' ');
    primeUtterance.volume = 0.01;
    window.speechSynthesis.speak(primeUtterance);
    console.log('Speech synthesis primed for iOS');
    
    // Hide incoming call screen and show active call screen
    const incomingScreen = document.getElementById('incomingCallScreen');
    incomingScreen.style.display = 'none';
    incomingScreen.classList.add('hidden');
    
    const activeCallScreen = document.getElementById('activeCallScreen');
    activeCallScreen.classList.remove('hidden');
    activeCallScreen.style.display = 'flex';
    
    // Reset call tracking
    scammerConversation = [];
    requestedPersonalInfo = [];
    userGaveInfo = false;
    userHungUp = false;
    messageCount = 0;
    networkCallStartTime = null;
    if (callDurationInterval) clearInterval(callDurationInterval);
    
    // Start call tracking
    networkCallStartTime = Date.now();
    startCallDurationTimer();
    
    // Setup microphone button
    const micBtn = document.getElementById('micBtn');
    if (SpeechRecognition) {
        micBtn.style.opacity = '1';
        micBtn.style.cursor = 'pointer';
        micBtn.onclick = toggleMicrophone;
    } else {
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
        micBtn.title = 'Microphone not supported in your browser';
    }
    
    // Fetch scammer greeting
    fetch(`${API_BASE}/scammer/greeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    })
    .then(res => res.json())
    .then(data => {
        scammerPersona = data.persona;
        currentScenarioId = data.scenario_id;
        callType = data.call_type;
        const greeting = data.greeting;
        const callerName = data.caller_name || 'Unknown Caller';
        const callTime = data.call_time || 'Unknown Time';
        
        // Display caller name
        document.getElementById('callerName').textContent = callerName;
        
        // Display scammer's opening message with typing animation
        addMessageToConversation('scammer', greeting);
        scammerConversation.push({ role: 'assistant', content: greeting });
        
        // Detect and track personal info requests in greeting
        trackPersonalInfoRequest(greeting);
        
        // Speak the greeting
        speakMessage(greeting, 'scammer');
    })
    .catch(error => {
        console.error('Error getting scammer greeting:', error);
        const now = new Date();
        const currentTime = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const fallback = `Hello, this is David Richardson. The time is ${currentTime}. I'm calling about your account security. We've detected suspicious activity. Do you have a moment to verify your information?`;
        addMessageToConversation('scammer', fallback);
        scammerConversation.push({ role: 'assistant', content: fallback });
        scammerPersona = 'microsoft';
        currentScenarioId = 'paypal_scam';
        callType = 'scam';
        document.getElementById('callerName').textContent = 'David Richardson';
        trackPersonalInfoRequest(fallback);
        speakMessage(fallback, 'scammer');
    });
}

function startCallDurationTimer() {
    callDurationInterval = setInterval(() => {
        if (!networkCallStartTime) return;
        
        const elapsed = Math.floor((Date.now() - networkCallStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        document.getElementById('callDuration').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

function trackPersonalInfoRequest(text) {
    const lowerText = text.toLowerCase();
    
    for (const [infoType, keywords] of Object.entries(PERSONAL_INFO_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                if (!requestedPersonalInfo.includes(infoType)) {
                    requestedPersonalInfo.push(infoType);
                    addInfoToTracker(infoType);
                }
                break;
            }
        }
    }
}

function detectPersonalInfoInUserInput(text) {
    const lowerText = text.toLowerCase();
    let infoGiven = false;
    
    // Check for common personal info patterns
    const patterns = {
        'ssn': /\b\d{3}-\d{2}-\d{4}\b|\bssn\b|social security|###-##-####/i,
        'credit_card': /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b|credit card|card number/i,
        'bank': /\baccount\b|bank|routing|\d{6,12}\b/i,
        'password': /password|pin|pass|security code/i,
        'phone': /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\(\d{3}\)/,
        'email': /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
        'birthdate': /\b(0?[1-9]|1[0-2])\/([0-2]?[0-9]|3[0-1])\/(\d{4}|\d{2})\b|\d{1,2}-\d{1,2}-\d{2,4}|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
        'name': /my name is|i am|call me/i,
        'payment': /credit|debit|transfer|gift card|itunes|google play/i
    };
    
    for (const [infoType, pattern] of Object.entries(patterns)) {
        if (pattern.test(text)) {
            userGaveInfo = true;
            infoGiven = true;
            break;
        }
    }
    
    return infoGiven;
}

function addInfoToTracker(infoType) {
    const infoDisplay = {
        'ssn': '🔐 Social Security Number',
        'credit_card': '💳 Credit Card Number',
        'bank': '🏦 Bank Account Details',
        'password': '🔒 Password/PIN',
        'email': '📧 Email Address',
        'phone': '📱 Phone Number',
        'address': '🏠 Home Address',
        'name': '👤 Full Name',
        'birthdate': '📅 Date of Birth',
        'payment': '💰 Payment Method'
    };
    
    const tracker = document.getElementById('scamInfoTracker');
    tracker.classList.add('visible');
    
    const infoItem = document.createElement('div');
    infoItem.className = 'info-item';
    infoItem.textContent = infoDisplay[infoType] || infoType;
    document.getElementById('infoList').appendChild(infoItem);
}

function toggleMicrophone() {
    if (!SpeechRecognition) {
        alert('Speech recognition not supported in your browser');
        return;
    }

    const micBtn = document.getElementById('micBtn');
    
    if (microphoneActive) {
        // Stop recording
        stopMicrophoneRecording();
        micBtn.classList.remove('active');
    } else {
        // Start recording
        startMicrophoneRecording();
        micBtn.classList.add('active');
    }
}

function startMicrophoneRecording() {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // Show interim results for better UX
    recognition.lang = 'en-US';
    let finalTranscript = '';

    recognition.onstart = function() {
        microphoneActive = true;
        document.getElementById('micBtn').classList.add('active');
        recordingStartTime = Date.now();
        finalTranscript = '';
        console.log('Microphone recording started');
    };

    recognition.onresult = function(event) {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Show interim text while user is speaking
        const displayText = (finalTranscript || interimTranscript).trim();
        if (displayText) {
            document.getElementById('userInput').value = displayText;
        }
    };

    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        document.getElementById('micBtn').classList.remove('active');
        microphoneActive = false;
    };

    recognition.onend = function() {
        console.log('Microphone recording ended');
        document.getElementById('micBtn').classList.remove('active');
        microphoneActive = false;
        
        // Auto-submit immediately if we have text (zero delay)
        const userInput = document.getElementById('userInput').value.trim();
        if (userInput && userInput.length > 1) {
            console.log('Auto-submitting from microphone:', userInput);
            // Zero delay - submit as fast as possible
            submitNetworkResponse();
        }
    };

    recognition.start();
}

function stopMicrophoneRecording() {
    microphoneActive = false;
}

function handleNetworkInputKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitNetworkResponse();
    }
}

// Store current audio for control
let currentAudio = null;

function speakMessage(message, speaker) {
    // Stop any current speech and audio
    synth.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Only speak scammer messages
    if (speaker === 'scammer') {
        console.log(`DEBUG speakMessage: text: '${message.substring(0, 50)}...'`);
        console.log(`DEBUG: ELEVENLABS_API_KEY exists: ${!!ELEVENLABS_API_KEY}`);
        
        // ALWAYS use browser speech synthesis for reliability on mobile
        // ElevenLabs API calls can be slow and unreliable on cellular connections
        console.log('Using browser speech synthesis for immediate playback');
        fallbackSpeak(message);
        
        /* Disabled ElevenLabs for mobile reliability
        if (ELEVENLABS_API_KEY) {
            // For iOS Safari - create Audio object BEFORE async fetch to maintain user gesture context
            currentAudio = new Audio();
            currentAudio.preload = 'auto';
            currentAudio.volume = 1.0;
            
            currentAudio.onended = () => {
                currentAudio = null;
                // Auto-activate microphone after scammer finishes
                setTimeout(() => {
                    console.log('Scammer finished, auto-activating microphone');
                    if (!microphoneActive && SpeechRecognition) {
                        startMicrophoneRecording();
                    }
                }, 300);
            };
            
            currentAudio.onerror = (err) => {
                console.error('Audio error:', err);
                currentAudio = null;
                fallbackSpeak(message);
            };
            
            // Generate audio using ElevenLabs
            fetch(`${API_BASE}/scammer/audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: message,
                    voice_type: currentScenarioId
                })
            })
            .then(res => res.json())
            .then(data => {
                console.log(`DEBUG speakMessage response:`, data);
                if (data.success && data.audio && currentAudio) {
                    console.log(`DEBUG: Playing ElevenLabs audio for ${data.voice || 'unknown voice'}`);
                    
                    // Set the src on the pre-created Audio element
                    currentAudio.src = data.audio;
                    
                    // Try to play
                    const playPromise = currentAudio.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(err => {
                            console.warn('Could not play ElevenLabs audio:', err);
                            currentAudio = null;
                            // Fallback to browser speech synthesis
                            console.log('Falling back to browser speech synthesis');
                            fallbackSpeak(message);
                        });
                    }
                } else {
                    // Fallback to browser speech synthesis
                    console.log('No audio data from API, falling back to browser speech synthesis');
                    currentAudio = null;
                    fallbackSpeak(message);
                }
            })
            .catch(err => {
                console.error('Error getting ElevenLabs audio:', err);
                currentAudio = null;
                // Fallback to browser speech synthesis
                console.log('API error, falling back to browser speech synthesis');
                fallbackSpeak(message);
            });
        } else {
            fallbackSpeak(message);
        }
        */
    }
}

function fallbackSpeak(message) {
    // Clean up the message for speech
    const cleanMessage = message.replace(/[^\w\s.,!?'-]/g, '');
    
    console.log('fallbackSpeak called with message:', cleanMessage.substring(0, 50));
    
    // Cancel any ongoing speech
    synth.cancel();
    
    const utterance = new SpeechSynthesisUtterance(cleanMessage);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0; // Max volume for mobile
    utterance.lang = 'en-US';

    utterance.onstart = () => {
        console.log('Speech started');
    };

    utterance.onend = () => {
        console.log('Speech ended');
        // Auto-activate microphone after scammer finishes
        setTimeout(() => {
            console.log('Scammer finished speaking, auto-activating microphone');
            if (!microphoneActive && SpeechRecognition) {
                startMicrophoneRecording();
            }
        }, 300);
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error, event);
    };

    // For iOS: Get voices and set immediately if available
    const voices = synth.getVoices();
    if (voices.length > 0) {
        // Prefer English voices
        const englishVoice = voices.find(v => v.lang.startsWith('en-')) || voices[0];
        utterance.voice = englishVoice;
        console.log('Using voice:', englishVoice ? englishVoice.name : 'default');
    } else {
        console.log('No voices loaded yet, using default');
    }

    // Speak immediately - this MUST work since acceptCall primed the synthesis
    console.log('Calling synth.speak()');
    synth.speak(utterance);
}

// Stop all audio and speech when page closes
window.addEventListener('beforeunload', () => {
    synth.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
});

// Stop all audio and speech when page is hidden/minimized
window.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        synth.cancel();
        if (currentAudio) {
            currentAudio.pause();
        }
    }
});

function addMessageToConversation(sender, message) {
    const conversationBox = document.getElementById('conversationBox');
    const messageEl = document.createElement('div');
    messageEl.className = `message ${sender}-message`;
    
    // Add ringing animation for system messages about calling
    if (sender === 'system' && message.includes('ringing')) {
        messageEl.classList.add('ringing');
    }
    
    if (sender === 'scammer') {
        // Type out the scammer message
        messageEl.innerHTML = `<div class="message-content"></div>`;
        conversationBox.appendChild(messageEl);
        conversationBox.scrollTop = conversationBox.scrollHeight;
        
        typeMessage(messageEl.querySelector('.message-content'), message);
    } else {
        messageEl.innerHTML = `<div class="message-content">${escapeHtml(message)}</div>`;
        conversationBox.appendChild(messageEl);
        conversationBox.scrollTop = conversationBox.scrollHeight;
    }
}

function typeMessage(element, text, speed = 30) {
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function submitNetworkResponse() {
    const userInput = document.getElementById('userInput').value.trim();
    if (!userInput) {
        console.log('No input to submit');
        return;
    }

    console.log('Submitting:', userInput);
    console.log('Scenario:', currentScenarioId);

    // Check if user gave personal information
    detectPersonalInfoInUserInput(userInput);

    // Add user message to conversation immediately
    addMessageToConversation('user', userInput);
    scammerConversation.push({ role: 'user', content: userInput });
    document.getElementById('userInput').value = '';

    try {
        // Prepare the request body
        const requestBody = {
            message: userInput,
            conversation_history: scammerConversation,
            scenario_id: currentScenarioId,
            message_count: messageCount
        };
        
        console.log('Request body:', requestBody);

        // Show typing indicator while waiting for response
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message scammer-message typing-indicator';
        typingIndicator.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
        const conversationBox = document.getElementById('conversationBox');
        conversationBox.appendChild(typingIndicator);
        conversationBox.scrollTop = conversationBox.scrollHeight;

        // Get scammer response from API
        const respondRes = await fetch(`${API_BASE}/scammer/respond`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log('Response status:', respondRes.status);

        if (respondRes.ok) {
            const data = await respondRes.json();
            console.log('Scammer response data:', data);
            const response = data.response;
            messageCount = data.message_count || messageCount + 1;

            // Remove typing indicator and add response with realistic delay
            typingIndicator.remove();
            
            // Track personal info requests in scammer response
            trackPersonalInfoRequest(response);
            
            // Natural pause before scammer responds (500-1500ms realistic conversation delay)
            const responseDelay = 500 + Math.random() * 1000;
            setTimeout(() => {
                addMessageToConversation('scammer', response);
                scammerConversation.push({ role: 'assistant', content: response });
                speakMessage(response, 'scammer');
            }, responseDelay);
        } else {
            const errorData = await respondRes.text();
            console.error('API error response:', errorData);
            typingIndicator.remove();
            
            const fallback = "I didn't catch that. Can you repeat please? This is very urgent.";
            trackPersonalInfoRequest(fallback);
            setTimeout(() => {
                addMessageToConversation('scammer', fallback);
                scammerConversation.push({ role: 'assistant', content: fallback });
                speakMessage(fallback, 'scammer');
            }, 600);
        }
    } catch (error) {
        console.error('Error getting scammer response:', error);
        typingIndicator.remove();
        
        const fallback = "I didn't catch that. Can you repeat please? This is very urgent.";
        setTimeout(() => {
            addMessageToConversation('scammer', fallback);
            scammerConversation.push({ role: 'assistant', content: fallback });
            speakMessage(fallback, 'scammer');
        }, 600);
    }
}

function endCall() {
    stopTimer();
    if (callDurationInterval) clearInterval(callDurationInterval);
    synth.cancel(); // Stop any speech
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Calculate call duration
    const callDuration = networkCallStartTime ? 
        Math.floor((Date.now() - networkCallStartTime) / 1000) : 0;
    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    
    userHungUp = true;
    
    // Determine win/lose based on call type and user actions
    let points = 0;
    let accuracy = 0;
    let resultTitle = '';
    let resultIcon = '❌';
    let tip = '';
    let isCorrect = false;
    
    // LEGITIMATE CALL - User should NOT hang up
    if (callType === 'legitimate') {
        // If they gave personal info to a legitimate caller - LOSE
        if (userGaveInfo) {
            points = 0;
            accuracy = 0;
            resultTitle = 'RISKY!';
            resultIcon = '⚠️';
            tip = 'You gave personal information on a legitimate call. While this was actually safe, in a real scenario you should verify the caller first. Legitimate companies won\'t pressure you for sensitive info immediately - ask for a callback number and verify it independently.';
            isCorrect = false;
        }
        // Recognized as legitimate and stayed on line - GOOD
        else if (callDuration > 60) {
            points = 200;
            accuracy = 95;
            resultTitle = 'EXCELLENT!';
            resultIcon = '✓';
            tip = 'Great job! You recognized this as a legitimate call and handled it properly. You did not give sensitive information until verifying the caller. This shows good judgment distinguishing legitimate from scam calls.';
            isCorrect = true;
        }
        // Moderate engagement without giving info - OK
        else if (callDuration >= 30) {
            points = 150;
            accuracy = 85;
            resultTitle = 'GOOD!';
            resultIcon = '✓';
            tip = 'Good response! You stayed on the line and didn\'t give unnecessary personal information. However, you ended the call quickly. Legitimate callers usually have a specific reason - it\'s fine to listen and verify before providing sensitive data.';
            isCorrect = true;
        }
        // Hung up very quickly on legitimate call - RISKY
        else {
            points = 50;
            accuracy = 60;
            resultTitle = 'TOO CAUTIOUS';
            resultIcon = '⚠️';
            tip = `You hung up very quickly. While caution is good, you may have missed important information from your actual bank or service provider. Always ask the caller for their name, department, and reason for calling. You can always hang up and call them back using the official number on your card.`;
            isCorrect = false;
        }
    }
    // SCAM CALLS - Scoring based on how fast they hung up
    else if (callType === 'scam') {
        // If they gave personal info - automatic LOSE
        if (userGaveInfo) {
            points = 0;
            accuracy = 0;
            resultTitle = 'COMPROMISED!';
            resultIcon = '🚨';
            tip = `You gave personal information to a scammer! They got: ${requestedPersonalInfo.join(', ')}. In a real scenario, your identity and money could be stolen. NEVER give sensitive info to unsolicited callers.`;
            isCorrect = false;
        }
        // Hung up very quickly without giving info - WIN
        else if (callDuration < 30) {
            points = 300;
            accuracy = 100;
            resultTitle = 'EXCELLENT!';
            resultIcon = '⭐';
            tip = 'Perfect! You recognized this as a scam and hung up immediately without giving any personal information. This is the best defense against phone scams.';
            isCorrect = true;
        }
        // Hung up quickly - GOOD
        else if (callDuration < 60) {
            points = 250;
            accuracy = 90;
            resultTitle = 'GOOD!';
            resultIcon = '✓';
            tip = 'Good response! You ended the call before giving sensitive information. Remember: legitimate companies never call asking for passwords, SSNs, or credit card numbers.';
            isCorrect = true;
        }
        // Moderate duration - OK
        else if (callDuration < 120) {
            points = 150;
            accuracy = 70;
            resultTitle = 'NEEDS WORK';
            resultIcon = '⚠️';
            tip = `You didn't give info, but you stayed on the line too long. The scammer requested ${requestedPersonalInfo.length} types of personal info. In a real scenario, you could have been manipulated into giving it. Hang up sooner!`;
            isCorrect = true;
        }
        // Stayed too long - WARNING
        else {
            points = 50;
            accuracy = 50;
            resultTitle = 'AT RISK!';
            resultIcon = '⚠️';
            tip = `You stayed on the line for ${minutes}:${seconds.toString().padStart(2, '0')}. Even though you didn't give info this time, prolonged engagement increases vulnerability. The scammer requested ${requestedPersonalInfo.length} types of personal info. Trust your instincts and HANG UP on suspicious calls!`;
            isCorrect = false;
        }
    }

    // Mark as completed
    gameState.totalAttempts++;
    if (isCorrect) {
        gameState.correctAttempts++;
    }
    if (!gameState.networkCompleted.includes(1)) {
        gameState.networkCompleted.push(1);
    }
    saveGameState();

    // Show result with detailed info
    setTimeout(() => {
        showResultWithCallDetails(points, accuracy, callDuration, tip, isCorrect, resultTitle, resultIcon);
    }, 1000);
}

// ===== SQL INJECTION GAME =====
function startSQLLevel() {
    console.log('Starting SQL level. sqlLevels count:', sqlLevels?.length);
    
    if (!sqlLevels || sqlLevels.length === 0) {
        console.error('SQL levels not loaded!');
        alert('Error: Game data not loaded. Please refresh the page.');
        return;
    }
    
    // Get next level from rotation
    if (currentLevel >= levelRotation.sql.length) {
        levelRotation.sql = shuffleArray([...Array(sqlLevels.length).keys()]);
        currentLevel = 0;
    }
    
    const levelIndex = levelRotation.sql[currentLevel];
    const level = sqlLevels[levelIndex];
    console.log('Loading SQL level:', levelIndex, level?.title);
    selectedSQLLine = null;

    showScreen('sqlScreen');
    startTimer('sqlTimer', 60);

    document.getElementById('sqlTitle').textContent = level.title;
    document.getElementById('sqlFeedback').textContent = '';
    document.getElementById('sqlSubmitBtn').disabled = true;

    const editor = document.getElementById('codeEditor');
    editor.innerHTML = '';

    level.code.forEach((line, idx) => {
        const lineEl = document.createElement('div');
        lineEl.className = 'code-line';
        lineEl.innerHTML = formatCode(line.line);
        lineEl.onclick = () => selectSQLLine(lineEl, idx);
        editor.appendChild(lineEl);
    });
}

function formatCode(code) {
    return code
        .replace(/(def|return|SELECT|FROM|WHERE|AND|OR|LIKE|INSERT|UPDATE|VALUES|INTO|SET)/g, '<span class="keyword">$1</span>')
        .replace(/(".*?"|'.*?')/g, '<span class="string">$1</span>')
        .replace(/(\w+)\(/g, '<span class="function">$1</span>(');
}

function selectSQLLine(element, index) {
    document.querySelectorAll('.code-line').forEach(el => {
        el.style.background = '';
        el.style.borderLeft = '';
    });

    element.style.background = 'rgba(0, 245, 255, 0.2)';
    element.style.borderLeft = '3px solid #00f5ff';
    selectedSQLLine = index;
    document.getElementById('sqlSubmitBtn').disabled = false;
}

function submitSQL() {
    stopTimer();
    const levelIndex = levelRotation.sql[currentLevel];
    const level = sqlLevels[levelIndex];
    const timerText = document.getElementById('sqlTimer').textContent.replace('s', '');
    const timeElapsed = 60 - parseInt(timerText);

    const isCorrect = selectedSQLLine === level.vulnerableLine;
    const lines = document.querySelectorAll('.code-line');

    lines[level.vulnerableLine].classList.add('vulnerable');

    if (!isCorrect && selectedSQLLine !== null) {
        lines[selectedSQLLine].classList.add('safe');
    }

    const feedback = document.getElementById('sqlFeedback');
    feedback.style.background = isCorrect ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)';
    feedback.style.color = isCorrect ? '#28a745' : '#dc3545';
    feedback.style.border = `1px solid ${isCorrect ? '#28a745' : '#dc3545'}`;
    feedback.textContent = isCorrect ?
        'Vulnerability identified correctly!' :
        `Incorrect. The vulnerability was on line ${level.vulnerableLine + 1}`;

    const points = isCorrect ? 200 : 0;

    gameState.totalAttempts++;
    if (isCorrect) {
        gameState.correctAttempts++;
        if (!gameState.sqlCompleted.includes(level.id)) {
            gameState.sqlCompleted.push(level.id);
        }
    }
    saveGameState();

    setTimeout(() => showResult(points, isCorrect ? 100 : 0, timeElapsed, level.tip, isCorrect), 1800);
}

// ===== TIMER =====
function startTimer(elementId, seconds) {
    stopTimer();
    let timeLeft = seconds;
    const timerEl = document.getElementById(elementId);

    timerInterval = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft + 's';

        if (timeLeft <= 10) {
            timerEl.classList.add('warning');
        }

        if (timeLeft <= 0) {
            stopTimer();
            autoSubmit();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        document.querySelectorAll('.timer').forEach(t => t.classList.remove('warning'));
    }
}

function autoSubmit() {
    switch(currentGameMode) {
        case 'phishing':
            if (selectedChoice === null) selectedChoice = 0;
            submitPhishing();
            break;
        case 'password':
            gameState.totalAttempts++;
            saveGameState();
            showResult(0, 0, 90, passwordLevels[currentLevel].tip, false);
            break;
        case 'network':
            submitNetwork();
            break;
        case 'sql':
            if (selectedSQLLine === null) selectedSQLLine = 0;
            submitSQL();
            break;
    }
}

// ===== RESULTS =====
function showResultWithCallDetails(points, accuracy, callDuration, tip, success, resultTitle, resultIcon) {
    showScreen('resultScreen');
    
    // Scroll to top for mobile so buttons are visible
    setTimeout(() => {
        const resultScreen = document.getElementById('resultScreen');
        if (resultScreen) {
            resultScreen.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, 100);

    gameState.totalScore += Math.max(points, 0);
    if (success) {
        gameState.completedCount++;
        gameState.currentStreak++;
        if (gameState.currentStreak > gameState.bestStreak) {
            gameState.bestStreak = gameState.currentStreak;
        }
    } else {
        gameState.currentStreak = 0;
    }

    saveGameState();

    const minutes = Math.floor(callDuration / 60);
    const seconds = callDuration % 60;
    const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    document.getElementById('resultIcon').textContent = resultIcon;
    document.getElementById('resultTitle').textContent = resultTitle;
    document.getElementById('levelScore').textContent = Math.max(points, 0);
    document.getElementById('accuracyStat').textContent = accuracy + '%';
    document.getElementById('timeStat').textContent = durationText;
    document.getElementById('totalScore2').textContent = gameState.totalScore.toLocaleString();
    
    // Add call details to tip
    let detailedTip = tip;
    if (requestedPersonalInfo.length > 0) {
        detailedTip += `\n\nPersonal info requested: ${requestedPersonalInfo.length} types (${requestedPersonalInfo.join(', ')})`;
    }
    document.getElementById('tipText').textContent = detailedTip;

    // Check achievements
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
        showAchievementNotification(newAchievements[0]);
    }
}

function showResult(points, accuracy, time, tip, success) {
    showScreen('resultScreen');
    
    // Scroll to top for mobile so buttons are visible
    setTimeout(() => {
        const resultScreen = document.getElementById('resultScreen');
        if (resultScreen) {
            resultScreen.scrollTop = 0;
        }
        window.scrollTo(0, 0);
    }, 100);

    gameState.totalScore += Math.max(points, 0);
    if (success) {
        gameState.completedCount++;
        gameState.currentStreak++;
        if (gameState.currentStreak > gameState.bestStreak) {
            gameState.bestStreak = gameState.currentStreak;
        }
    } else {
        gameState.currentStreak = 0;
    }

    saveGameState();

    document.getElementById('resultIcon').textContent = success ? 'SUCCESS' : 'FAILED';
    document.getElementById('resultTitle').textContent = success ? 'Challenge Complete' : 'Challenge Failed';
    document.getElementById('levelScore').textContent = Math.max(points, 0);
    document.getElementById('accuracyStat').textContent = accuracy + '%';
    document.getElementById('timeStat').textContent = time + 's';
    document.getElementById('totalScore2').textContent = gameState.totalScore.toLocaleString();
    document.getElementById('tipText').textContent = tip;

    // Check achievements
    const newAchievements = checkAchievements();
    if (newAchievements.length > 0) {
        showAchievementNotification(newAchievements[0]);
    }
}

function nextChallenge() {
    // For network calls, don't increment level - fetch new random scenario
    if (currentGameMode !== 'network') {
        currentLevel++;
    }
    
    // Call appropriate start function based on game mode
    if (currentGameMode === 'phishing') {
        startPhishingLevel();
    } else if (currentGameMode === 'password') {
        startPasswordLevel();
    } else if (currentGameMode === 'network') {
        startNetworkLevel();  // Fetches new random scenario
    } else if (currentGameMode === 'sql') {
        startSQLLevel();
    }
}

function updateProgress() {
    const total = currentGameMode === 'phishing' ? phishingLevels.length :
                 currentGameMode === 'password' ? passwordLevels.length :
                 currentGameMode === 'network' ? networkLevels.length :
                 sqlLevels.length;
    const progress = ((currentLevel + 1) / total) * 100;
    document.getElementById('progressBar').style.width = progress + '%';
}

function resetProgress() {
    if (confirm('Reset all progress? This action cannot be undone.')) {
        Storage.clear();
        gameState = {
            totalScore: 0,
            completedCount: 0,
            currentStreak: 0,
            bestStreak: 0,
            totalAttempts: 0,
            correctAttempts: 0,
            phishingCompleted: [],
            passwordCompleted: [],
            networkCompleted: [],
            sqlCompleted: [],
            achievements: []
        };
        saveGameState();
        updateHomeStats();
        updateModeProgress();
        alert('Progress reset successfully.');
    }
}

// ===== ONBOARDING FUNCTIONS =====
let currentSlide = 0;

function nextSlide() {
    const slides = document.querySelectorAll('.onboarding-slide');
    const indicators = document.querySelectorAll('.indicator');
    
    // Hide current slide
    slides[currentSlide].classList.remove('active');
    indicators[currentSlide].classList.remove('active');
    
    // Move to next slide
    currentSlide++;
    
    // Show next slide
    if (currentSlide < slides.length) {
        slides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
    }
}

function skipOnboarding() {
    completeOnboarding();
}

function completeOnboarding() {
    const onboardingScreen = document.getElementById('onboardingScreen');
    onboardingScreen.style.display = 'none';
    showScreen('homeScreen');
}
