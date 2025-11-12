from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
import google.generativeai as genai
import json
from datetime import datetime
import base64
import requests

load_dotenv()

app = Flask(__name__, template_folder='templates', static_folder='static')
CORS(app)

# Configure Gemini API
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Configure ElevenLabs API
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY', 'a3a44a82b031f40862d549b49dee261158f6406cbc447deff1f69c1fc4dd42ad')
ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1"

# ElevenLabs voices for phone calls - Simple setup with one male and one female voice
ELEVENLABS_VOICES = {
    'male': {
        'voice_id': 'SOYHLrjzK2X1ezoPC6cr',  # Harry (male, american, professional)
        'name': 'Agent'
    },
    'female': {
        'voice_id': 'pFZP5JQG7iQjIQuC4Bku',  # Lily (female, professional)
        'name': 'Agent'
    }
}

def get_elevenlabs_audio(text, voice_type='male'):
    """Generate audio using ElevenLabs API"""
    try:
        voice_config = ELEVENLABS_VOICES.get(voice_type, ELEVENLABS_VOICES['male'])
        voice_id = voice_config['voice_id']
        
        print(f"DEBUG: Generating audio for voice_type='{voice_type}', voice_id='{voice_id}', name='{voice_config['name']}'")
        print(f"DEBUG: Text: {text[:50]}...")
        
        headers = {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        data = {
            'text': text,
            'model_id': 'eleven_turbo_v2_5',  # Using newer model for free tier
            'voice_settings': {
                'stability': 0.65,
                'similarity_boost': 0.85,
                'style': 0.4,
                'use_speaker_boost': True
            }
        }
        
        response = requests.post(
            f'{ELEVENLABS_API_URL}/text-to-speech/{voice_id}',
            json=data,
            headers=headers,
            timeout=30
        )
        
        if response.status_code == 200:
            # Convert audio to base64 for sending to frontend
            audio_base64 = base64.b64encode(response.content).decode('utf-8')
            print(f"DEBUG: ElevenLabs success! Audio length: {len(audio_base64)} chars")
            return {
                'success': True,
                'audio': f'data:audio/mpeg;base64,{audio_base64}',
                'voice': voice_config['name']
            }
        else:
            print(f"ElevenLabs error: {response.status_code} - {response.text}")
            return {'success': False, 'error': f'ElevenLabs API error: {response.status_code}'}
    
    except Exception as e:
        print(f"Error generating ElevenLabs audio: {e}")
        return {'success': False, 'error': str(e)}

# ===== SCAMMER PERSONAS =====
SCAMMER_PERSONAS = {
    'paypal': {
        'name': 'PayPal Security Alert',
        'system_prompt': '''You are a real PayPal security agent calling about fraudulent activity. You sound professional, slightly concerned, and authoritative. You reference specific technical details to sound legitimate. You use genuine-sounding security language like "account verification," "unusual access patterns," and "temporary suspension." You mention specific locations, IP addresses, or devices to make it sound real. You create urgency without being too aggressive. You adapt your tone based on the user's responses. If they're skeptical, you become more technical. If they're worried, you become reassuring. You speak naturally, not like a script.
Examples of realistic responses:
- "Yes, we detected login attempts from an IP address in Beijing. Have you been traveling recently?"
- "Okay, so just to clarify, you haven't authorized any charges over $500 in the last 24 hours?"
- "I understand your concern. This is why we're being proactive about this."
Keep responses conversational and natural (1-2 sentences). NEVER sound like you're reading from a script.'''
    },
    'microsoft': {
        'name': 'Microsoft Tech Support',
        'system_prompt': '''You are a Microsoft tech support representative. You sound helpful but concerned about the user's computer security. You use realistic technical terms like "Windows Defender alerts," "registry errors," "malware signatures," and "system events." You reference the Event Viewer and Task Manager to sound authentic. You speak like you're reading real diagnostic information from their computer (which you are pretending to do). You gradually build concern, starting mild and increasing based on how the user responds. You suggest TeamViewer or Chrome Remote Desktop as if it's a standard troubleshooting step. You sound impatient like a real tech support person would be.
Examples of realistic responses:
- "Okay, so I'm looking at your system logs here and I'm seeing some concerning activity in the Event Viewer."
- "Yes, I can definitely help. This is actually more common than you'd think with Windows systems."
- "The best way to fix this is remote access - I can walk you through it step by step."
Keep responses natural and slightly rushed (1-2 sentences), like a real support call.'''
    },
    'prince': {
        'name': 'Nigerian Prince',
        'system_prompt': '''You are a wealthy person from Nigeria with a legitimate business opportunity. You speak English as a second language with occasional grammatical quirks, but you're educated and professional. You're polite, formal, and respectful. You use words like "esteemed," "beneficiary," "transaction," and "discretion." You tell an elaborate story about inheritance, gold, or export deals. You're patient and persistent but never aggressive. You build rapport before asking for help. You reference other people who have "helped" successfully before. You speak like someone writing in English, with slightly formal phrasing.
Examples of realistic responses:
- "I assure you that this opportunity is completely legitimate and has been verified by our legal team."
- "You would be one of just five people chosen for this particular transaction."
- "Many Western citizens have benefited from similar arrangements. Are you interested in learning more?"
Keep responses warm and formal (1-2 sentences). Sound educated but not native English speaker.'''
    },
    'irs': {
        'name': 'IRS Agent',
        'system_prompt': '''You are an IRS revenue agent calling about a tax audit or unpaid taxes. You sound official, formal, and slightly impatient. You use legitimate-sounding IRS terms like "Notice of Assessment," "Outstanding Tax Liability," "back taxes," and "statutory penalty." You reference specific tax years and document numbers. You act like this is serious business and you're doing the user a favor by calling instead of just filing legal action. You use pressure but not threats - you sound like a bureaucrat who's tired of dealing with non-compliance. You know real tax law terminology. You act slightly annoyed if questioned.
Examples of realistic responses:
- "Sir/Ma'am, according to our records, you owe $7,420 in unpaid federal income tax from 2019."
- "I can only hold this resolution for 24 hours. After that, we file a federal claim against your assets."
- "This is standard protocol. We've already attempted three notices."
Keep responses official and businesslike (1-2 sentences). Sound like a government employee.'''
    }
}


# ===== CALL SCENARIOS =====
CALL_SCENARIOS = [
    # ===== PHONE SCAMS (60+ scenarios) =====
    # PayPal Scams
    {
        'id': 'paypal_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'male',
        'caller_name': 'David Richardson',
        'company': 'PayPal Security',
        'phone': '+1 (415) 555-0147',
        'opening': "Good afternoon, this is David Richardson from PayPal Security. We've detected fraudulent activity on your account. I need to verify some information to secure it. Can you confirm the last 4 digits of the credit card on file?",
        'followups': [
            "Thank you. Now I need your social security number to verify your identity in our system.",
            "Perfect. For security purposes, I'll need to send you a verification code via email. What's the email address associated with your account?",
            "One more thing - can you provide your account password so I can reset the security settings?"
        ],
        'info_requests': ['credit_card', 'ssn', 'email', 'password'],
        'success_phrase': 'account secured|verified|updated',
        'red_flags': ['verify information', 'confirm details', 'security check']
    },
    {
        'id': 'paypal_unusual_activity',
        'type': 'scam',
        'difficulty': 'easy',
        'caller_name': 'PayPal Support',
        'company': 'PayPal',
        'phone': '+1 (415) 555-0148',
        'opening': "Hi there, this is PayPal support calling about unusual activity on your account from China. For your security, we need to confirm your full name and date of birth right now.",
        'followups': [
            "Thank you. Now can you provide your account password to verify you're the real owner?",
            "Great! We also need your bank routing number to confirm we have the right account on file."
        ],
        'info_requests': ['name', 'birthdate', 'password', 'bank'],
        'red_flags': ['unusual activity', 'for your security', 'right now'],
    },
    {
        'id': 'paypal_refund_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'male',
        'caller_name': 'Mark Johnson',
        'company': 'PayPal Fraud Department',
        'phone': '+1 (415) 555-0149',
        'opening': "Good morning! This is Mark Johnson from PayPal Fraud Department. We're processing a refund for you from a recent unauthorized transaction. To release the funds, I need to verify your identity. What's your account email?",
        'followups': [
            "Perfect. Now, what's the 3-digit security code on the back of your payment method?",
            "One more thing - can you confirm your full social security number so I can expedite this refund?"
        ],
        'info_requests': ['email', 'cvv', 'ssn'],
        'red_flags': ['refund processing', 'expedite', 'verify identity'],
    },
    
    # Microsoft/Tech Support Scams
    {
        'id': 'microsoft_scam',
        'type': 'scam',
        'difficulty': 'hard',
        'gender': 'male',
        'caller_name': 'Agent Marcus Chen',
        'company': 'Microsoft Tech Support',
        'phone': '+1 (206) 555-0198',
        'opening': "Hello, this is Agent Marcus Chen from Microsoft Windows Support. We've detected multiple security threats on your computer. This is very urgent. Are you at your computer right now so I can help you fix this?",
        'followups': [
            "Okay, I need remote access to diagnose the problem. Can you please read me the 6-digit code on your screen? It should be under Support & Recovery Assistant.",
            "Perfect, I'm connected now. I'm seeing malware signatures and registry errors. I need your credit card number to purchase the advanced security software to remove this.",
            "Before we proceed, I need your social security number for the license registration."
        ],
        'info_requests': ['password', 'credit_card', 'ssn'],
        'red_flags': ['remote access', 'urgent', 'threats detected', 'credit card'],
    },
    {
        'id': 'windows_defender_alert',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Tom Wilson',
        'company': 'Windows Security Center',
        'phone': '+1 (206) 555-0199',
        'opening': "Hi, we're calling from Windows Security Center. Your computer has multiple viruses and spyware that are sending your passwords to hackers. We can fix this immediately. Can you provide your credit card to download our premium antivirus?",
        'followups': [
            "Great! I'll need the full credit card number including the CVV on the back.",
            "And I'll need your billing address and zip code to complete the purchase."
        ],
        'info_requests': ['credit_card', 'cvv', 'address'],
        'red_flags': ['viruses detected', 'sending passwords', 'credit card', 'immediately'],
    },
    
    # IRS / Tax Scams
    {
        'id': 'irs_scam',
        'type': 'scam',
        'difficulty': 'hard',
        'gender': 'male',
        'caller_name': 'Agent Michael Torres',
        'company': 'IRS',
        'phone': '+1 (202) 555-0134',
        'opening': "This is Agent Michael Torres from the Internal Revenue Service. We have an issue with your 2024 tax return. You owe $8,500 in back taxes. I can help you resolve this today, but I need to verify your identity. What's your full social security number?",
        'followups': [
            "Thank you. Now, to set up the payment, I need your bank account number and routing number.",
            "For the wire transfer, I'll also need your date of birth for verification.",
            "We can accept iTunes gift cards or Google Play cards as payment. Do you have access to purchase those today?"
        ],
        'info_requests': ['ssn', 'bank', 'birthdate', 'payment'],
        'red_flags': ['social security', 'bank account', 'payment', 'wire transfer', 'gift cards'],
    },
    {
        'id': 'irs_arrest_warrant',
        'type': 'scam',
        'difficulty': 'hard',
        'gender': 'male',
        'caller_name': 'Federal Agent Johnson',
        'company': 'IRS Criminal Investigation',
        'phone': '+1 (202) 555-0135',
        'opening': "This is Federal Agent Johnson with the IRS. There's an arrest warrant issued for tax evasion under your name. To avoid immediate arrest and jail time, you need to settle your tax debt right now. Can you pay $15,000 via wire transfer today?",
        'followups': [
            "The warrant is in the system right now. You must pay before 5 PM today.",
            "I need your bank details to process the wire transfer immediately."
        ],
        'info_requests': ['bank', 'payment'],
        'red_flags': ['arrest warrant', 'jail time', 'immediately', 'wire transfer', 'threat'],
    },
    
    # Amazon / eBay Scams
    {
        'id': 'amazon_account_locked',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Amazon Security Team',
        'company': 'Amazon',
        'phone': '+1 (206) 555-0150',
        'opening': "Your Amazon account has been locked due to suspicious login attempts. To unlock your account and restore access immediately, I need to verify your information. What's the email address on your account?",
        'followups': [
            "What's your account password to verify your identity?",
            "I also need your full name and date of birth for our records."
        ],
        'info_requests': ['email', 'password', 'name', 'birthdate'],
        'red_flags': ['account locked', 'suspicious activity', 'immediately', 'verify'],
    },
    
    # Google / Apple ID Scams
    {
        'id': 'google_account_compromised',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Google Security',
        'company': 'Google Account Recovery',
        'phone': '+1 (650) 555-0200',
        'opening': "We detected unauthorized access to your Google account from Russia. For your security, we need to verify your information immediately. What's your Gmail address?",
        'followups': [
            "What's your account recovery phone number?",
            "Now I need your account password to lock out the hackers."
        ],
        'info_requests': ['email', 'phone', 'password'],
        'red_flags': ['unauthorized access', 'Russia', 'security', 'immediately'],
    },
    
    # Prize / Lottery Scams
    {
        'id': 'lottery_prize_scam',
        'type': 'scam',
        'difficulty': 'easy',
        'gender': 'male',
        'caller_name': 'Lucky Lottery Winners',
        'company': 'National Lottery Commission',
        'phone': '+1 (888) 555-0201',
        'opening': "Congratulations! You've won $500,000 in our national lottery drawing! To claim your prize, I need to verify your identity. Can you provide your full name and social security number?",
        'followups': [
            "Perfect! To release your winnings, we need a $2,000 wire transfer for processing fees.",
            "Once you send that, your $500,000 will be transferred to your account."
        ],
        'info_requests': ['name', 'ssn', 'payment'],
        'red_flags': ['won lottery', 'congratulations', 'wire transfer', 'processing fees'],
    },
    
    # Banking Scams
    {
        'id': 'bank_fraud_alert',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Bank Security Officer',
        'company': 'Your Bank',
        'phone': '+1 (800) 555-0202',
        'opening': "Your bank account has unauthorized transactions. For your protection, we've temporarily locked your account. To reactivate it, I need your account number and PIN right now.",
        'followups': [
            "What's your routing number and bank account number?",
            "I also need your 4-digit PIN to verify it's really you."
        ],
        'info_requests': ['account', 'pin', 'routing'],
        'red_flags': ['unauthorized transactions', 'locked account', 'right now', 'verify'],
    },
    
    # Prince / Inheritance Scams
    {
        'id': 'prince_scam',
        'type': 'scam',
        'difficulty': 'easy',
        'gender': 'male',
        'caller_name': 'Prince Okonkwo',
        'company': 'International Business',
        'phone': '+234 123 456 7890',
        'opening': "Good day to you. My name is Prince Okonkwo. I am calling regarding a business opportunity. I have a substantial amount of money - $50 million - that needs to be transferred to a trustworthy person. I believe you could be the right beneficiary. To proceed, I need some personal information.",
        'followups': [
            "First, what is your full name and date of birth?",
            "Excellent. Now I need your bank account number so we can make the transfer.",
            "For the processing fees, I will need you to wire $5,000 USD to cover legal and banking costs. Can you arrange this?"
        ],
        'info_requests': ['name', 'birthdate', 'bank', 'payment'],
        'red_flags': ['money transfer', 'beneficiary', 'bank account', 'processing fee'],
    },
    {
        'id': 'inheritance_scam',
        'type': 'scam',
        'difficulty': 'easy',
        'gender': 'male',
        'caller_name': 'Attorney David Smith',
        'company': 'International Law Firm',
        'phone': '+44 20 7946 0958',
        'opening': "Hello, I'm attorney David Smith. I'm calling regarding an inheritance you're entitled to from a distant relative. They passed away and left you approximately $2.3 million in their will. To claim this, I need your full legal name and date of birth.",
        'followups': [
            "I also need your bank account details so we can wire the funds.",
            "There's a small processing fee of $1,500. Can you wire that to get started?"
        ],
        'info_requests': ['name', 'birthdate', 'bank', 'payment'],
        'red_flags': ['inheritance', 'distant relative', 'processing fee'],
    },
    
    # Utility / Billing Scams
    {
        'id': 'electric_bill_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Customer Service',
        'company': 'Electric Company',
        'phone': '+1 (555) 555-0203',
        'opening': "This is calling from your electric company. Your bill is 3 months overdue and we're about to shut off your power in 2 hours. To keep your service active, we need immediate payment via gift card. Do you have access to Target or iTunes right now?",
        'followups': [
            "We'll need you to purchase $500 in gift cards and provide the codes.",
            "Once we receive the codes, we'll restore your power immediately."
        ],
        'info_requests': ['payment', 'gift_card_codes'],
        'red_flags': ['overdue', 'shut off power', 'gift card', 'immediately', 'urgent'],
    },
    
    # Tech Support for specific companies
    {
        'id': 'apple_support_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Apple Technician',
        'company': 'Apple Support',
        'phone': '+1 (408) 555-0204',
        'opening': "Hi, this is Apple Support. We've detected suspicious activity on your iCloud account from a foreign location. Your account has been flagged for security. Can you confirm your Apple ID email address so I can secure it?",
        'followups': [
            "What's your Apple ID password to verify ownership?",
            "I'm going to need to request a verification code. What's the phone number associated with your Apple ID?"
        ],
        'info_requests': ['email', 'password', 'phone'],
        'red_flags': ['suspicious activity', 'foreign location', 'verify', 'iCloud'],
    },
    
    # Medicare/Health Insurance Scams
    {
        'id': 'medicare_fraud',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Medicare Specialist',
        'company': 'Medicare Benefits',
        'phone': '+1 (800) 555-0205',
        'opening': "Hi, this is Medicare calling. Your benefits have been suspended due to a billing issue. To restore your coverage immediately, I need your Medicare number and Social Security number to verify.",
        'followups': [
            "I also need your credit card to update your account information.",
            "Your benefits will be restored once we process this verification."
        ],
        'info_requests': ['medicare_number', 'ssn', 'credit_card'],
        'red_flags': ['suspended benefits', 'immediately', 'verify', 'Medicare number'],
    },
    
    # Utility Disconnect Scams
    {
        'id': 'water_bill_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'City Water Department',
        'company': 'Water Services',
        'phone': '+1 (555) 555-0206',
        'opening': "Your water service will be disconnected today due to unpaid bills totaling $450. To prevent disconnection, we can accept immediate payment. What payment method do you prefer?",
        'followups': [
            "We accept wire transfer or Google Play cards.",
            "If payment isn't made within 1 hour, we'll send a technician to shut off your water."
        ],
        'info_requests': ['payment'],
        'red_flags': ['disconnection', 'unpaid bills', 'immediate payment', 'within 1 hour'],
    },
    
    # Car Insurance Scams
    {
        'id': 'car_insurance_scam',
        'type': 'scam',
        'difficulty': 'medium',
        'gender': 'female',
        'caller_name': 'Insurance Agent',
        'company': 'Auto Insurance Company',
        'phone': '+1 (555) 555-0207',
        'opening': "Hi, this is your car insurance company calling. We have you on file for a claim from an accident. To process your $8,000 settlement, I need to verify some information. What's your driver's license number?",
        'followups': [
            "I also need your Social Security number and date of birth.",
            "For the payout, I'll need your bank account information."
        ],
        'info_requests': ['license', 'ssn', 'birthdate', 'bank'],
        'red_flags': ['accident claim', 'settlement', 'verify', 'payout'],
    },
    
    # More Amazon/eBay variations
    {
        'id': 'ebay_account_update',
        'type': 'scam',
        'difficulty': 'easy',
        'gender': 'female',
        'caller_name': 'eBay Account Team',
        'company': 'eBay',
        'phone': '+1 (408) 555-0208',
        'opening': "We're calling from eBay. Your account payment method has expired. To keep your account active and prevent suspension, we need to update your credit card information right now.",
        'followups': [
            "What's your credit card number and expiration date?",
            "I also need the 3-digit security code on the back."
        ],
        'info_requests': ['credit_card', 'expiration', 'cvv'],
        'red_flags': ['payment method expired', 'account suspension', 'right now'],
    },
    
    # ===== LEGITIMATE CALLS =====
    {
        'id': 'legitimate_call',
        'type': 'legitimate',
        'difficulty': 'easy',
        'gender': 'female',
        'caller_name': 'Jennifer Murphy',
        'company': 'Your Bank',
        'phone': '+1 (800) 555-0123',
        'opening': "Hi, this is Jennifer Murphy from your bank. We're just doing a routine security check on your account. Nothing to worry about - we're not asking for any personal information. We just want to confirm you haven't reported any suspicious activity recently. Have you noticed anything unusual?",
        'followups': [
            "Great, thank you for confirming that. We also wanted to let you know about our new fraud protection service if you're interested.",
            "That's all we needed. Thank you for your time today. Have a great day!"
        ],
        'info_requests': [],
        'red_flags': [],
    },
    {
        'id': 'legitimate_card_offer',
        'type': 'legitimate',
        'difficulty': 'easy',
        'gender': 'female',
        'caller_name': 'Sarah Johnson',
        'company': 'Credit Card Services',
        'phone': '+1 (800) 555-0211',
        'opening': "Hi! This is Sarah Johnson from Credit Card Services. We're calling because you qualify for a premium credit card with 0% APR for 12 months. Would you like to hear more details about this offer?",
        'followups': [
            "The offer comes with no annual fee and excellent rewards. Are you interested?",
            "If not, no problem! Is there anything else I can help you with today?"
        ],
        'info_requests': [],
        'red_flags': [],
    },
    {
        'id': 'legitimate_survey',
        'type': 'legitimate',
        'difficulty': 'easy',
        'gender': 'female',
        'caller_name': 'Research Institute',
        'company': 'Market Research',
        'phone': '+1 (555) 555-0212',
        'opening': "Hello! We're conducting a brief market research survey and would appreciate your feedback. This will only take about 5 minutes. Do you have a few minutes to participate?",
        'followups': [
            "Great! We'll never ask for personal information. Just your opinions on some topics.",
            "Thank you so much for your time. Have a wonderful day!"
        ],
        'info_requests': [],
        'red_flags': [],
    },
    {
        'id': 'legitimate_appointment_reminder',
        'type': 'legitimate',
        'difficulty': 'easy',
        'gender': 'female',
        'caller_name': 'Dr. Smith Office',
        'company': 'Medical Office',
        'phone': '+1 (555) 555-0213',
        'opening': "Hi, this is calling from Dr. Smith's office. We're just reminding you that you have an appointment scheduled for tomorrow at 2 PM. Please call us back at this number if you need to reschedule.",
        'followups': [
            "We look forward to seeing you tomorrow!",
            "Thank you for being our patient!"
        ],
        'info_requests': [],
        'red_flags': [],
    },
]

# ===== GAME DATA (Can be moved to database later) =====
PHISHING_LEVELS = [
    {
        "id": 1,
        "title": "PayPal Security Alert",
        "type": "Email",
        "difficulty": "easy",
        "sender": "security@paypa1-alert.com",
        "message": "Your PayPal account requires immediate verification. Unusual activity detected from IP 203.45.12.88 in Nigeria. Click here to secure your account within 24 hours or account will be permanently limited. Case ID: PP-8472-URGENT",
        "highlights": ["paypa1-alert.com", "immediate verification", "Click here", "24 hours", "permanently limited"],
        "question": {
            "prompt": "What makes this email suspicious?",
            "choices": [
                "Domain uses '1' instead of 'l' in PayPal (typosquatting)",
                "Email mentions unusual activity",
                "Case ID is present",
                "Mentions a specific IP address"
            ],
            "correct": 0
        },
        "tip": "Always check the sender's domain carefully. Legitimate PayPal emails come from @paypal.com, not variations with numbers or extra words."
    },
    {
        "id": 2,
        "title": "Microsoft 365 Expiration",
        "type": "Email",
        "difficulty": "medium",
        "sender": "no-reply@microsoft-security.services",
        "message": "Your Microsoft 365 subscription expires today. To maintain access to your files and email, renew immediately at microsoft-renewal.services/verify. Enter your credentials to confirm renewal.",
        "highlights": ["microsoft-security.services", "expires today", "immediately", "microsoft-renewal.services", "Enter your credentials"],
        "question": {
            "prompt": "Which red flags indicate this is phishing?",
            "choices": [
                "Uses urgent language and threatens data loss",
                "Links to suspicious domains not owned by Microsoft",
                "Requests credential entry through a link",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Real Microsoft emails never ask you to click links to enter credentials. They use microsoft.com domains only."
    },
    {
        "id": 3,
        "title": "Amazon Order Verification",
        "type": "Email",
        "difficulty": "easy",
        "sender": "amazon-customer-service@amaz0n-security.com",
        "message": "Your Amazon order #404-5891245-2847562 requires verification to be completed. Due to unusual payment activity, we need to confirm your identity. Click 'Verify Account' and enter your details to proceed. Verification must be completed within 12 hours.",
        "highlights": ["amaz0n-security.com", "unusual payment activity", "Click 'Verify Account'", "enter your details", "within 12 hours"],
        "question": {
            "prompt": "Why is this email fraudulent?",
            "choices": [
                "Amazon official domain is amazon.com, not amaz0n with a zero",
                "Legitimate Amazon never asks to verify account via email links",
                "Creates artificial urgency",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Amazon will never ask you to verify sensitive information via email. If you're concerned, log into Amazon.com directly without clicking the email link."
    },
    {
        "id": 4,
        "title": "Apple ID Locked",
        "type": "Email",
        "difficulty": "medium",
        "sender": "noreply@appleid-verify.co.uk",
        "message": "Your Apple ID has been locked for security. We've detected unusual activity from your account (location: Moscow). To unlock your account, please verify your identity immediately at https://appleid-verify.co.uk/verify-identity. Enter your Apple ID password and two-factor code.",
        "highlights": ["appleid-verify.co.uk", "locked for security", "unusual activity", "immediately", "Enter your Apple ID password and two-factor code"],
        "question": {
            "prompt": "What's the main red flag here?",
            "choices": [
                "Real Apple uses appleid.apple.com, not third-party domains",
                "Apple never asks for 2FA codes via email",
                "Generic salutation 'Dear User'",
                "Both A and B"
            ],
            "correct": 3
        },
        "tip": "Apple will NEVER ask you to verify your password or 2FA code via email. Always go directly to apple.com/account."
    },
    {
        "id": 5,
        "title": "Bank Account Compromise Alert",
        "type": "Email",
        "difficulty": "medium",
        "sender": "security.alerts@yourbank-security.org",
        "message": "URGENT: Suspicious login attempt detected on your account. Unauthorized access from IP 192.168.1.1 in China. Your account has been temporarily locked. To restore access, click here to verify your identity with your account number, PIN, and Social Security Number within 24 hours or your account will be closed.",
        "highlights": ["yourbank-security.org", "URGENT", "Suspicious login attempt", "your account number, PIN, and Social Security Number", "within 24 hours"],
        "question": {
            "prompt": "Which red flags indicate this is phishing?",
            "choices": [
                "Banks don't email you asking for PIN or SSN",
                "Legitimate banks use their official domain (.com/.net), not 'yourbank-security.org'",
                "Uses ALL CAPS for urgency",
                "All of the above are red flags"
            ],
            "correct": 3
        },
        "tip": "No legitimate bank will EVER ask for your PIN, SSN, or full account number via email. Banks also don't send links to verify security - they direct you to call them."
    },
    {
        "id": 6,
        "title": "Instagram Account Suspicion",
        "type": "Email",
        "difficulty": "easy",
        "sender": "noreply@instagram-alerts.com",
        "message": "Hi there, We've detected several failed login attempts to your Instagram account from different locations. For your security, we need you to verify your account immediately. Click the link below and enter your username and password to confirm it's really you. https://instagram-alerts.com/verify",
        "highlights": ["instagram-alerts.com", "failed login attempts", "verify your account immediately", "enter your username and password"],
        "question": {
            "prompt": "Why would this be a phishing attempt?",
            "choices": [
                "Instagram.com is the real domain, not instagram-alerts.com",
                "Instagram never asks to re-enter password via email links",
                "Real Instagram uses two-factor authentication, not email verification",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Social media companies send security alerts, but they never ask you to confirm via email links. Always log into the app directly or website."
    },
    {
        "id": 7,
        "title": "Tax Refund Scam",
        "type": "Email",
        "difficulty": "medium",
        "sender": "refund@irs-account-verification.gov",
        "message": "Congratulations! You are eligible for a tax refund of $1,247.89. The IRS has approved your claim. To process your refund, please verify your information: Full Name, SSN, Date of Birth, and Bank Account Details. Click here to claim your refund now or it will be forfeited in 3 days.",
        "highlights": ["irs-account-verification.gov", "tax refund", "SSN", "forfeited in 3 days", "click here"],
        "question": {
            "prompt": "What's suspicious about this email?",
            "choices": [
                "IRS domains end in .gov, not 'irs-account-verification.gov'",
                "IRS never asks for personal info via email",
                "IRS never sends unsolicited refund emails or uses email links for claims",
                "All of the above are red flags"
            ],
            "correct": 3
        },
        "tip": "The IRS will never contact you by email for tax refunds. They mail official letters. Be especially suspicious of unsolicited tax refund offers - this is a common scam."
    },
    {
        "id": 8,
        "title": "Google Account Alert",
        "type": "Email",
        "difficulty": "medium",
        "sender": "noreply@google-alerts-verify.com",
        "message": "Someone tried to access your Google account on an unusual device. Google has blocked this attempt, but to secure your account, we need you to verify your identity within 2 hours. Click here to review your account activity and enter your password to proceed.",
        "highlights": ["google-alerts-verify.com", "unusual device", "within 2 hours", "enter your password"],
        "question": {
            "prompt": "How can you identify this as phishing?",
            "choices": [
                "Google never asks for password confirmation via email",
                "Legitimate alerts come from accounts.google.com, not 'google-alerts-verify.com'",
                "Creates artificial time pressure",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Google will notify you of suspicious activity, but they never ask you to click links to verify your password. If concerned, log into myaccount.google.com directly."
    },
    {
        "id": 9,
        "title": "Package Delivery Failure",
        "type": "Email",
        "difficulty": "easy",
        "sender": "delivery-update@fedex-tracking.co",
        "message": "Your FedEx package (tracking #7392847563829) could not be delivered. To reschedule delivery or claim your package, please update your delivery information and confirm your identity at https://fedex-tracking.co/delivery-update. Update must be completed within 24 hours or package will be returned.",
        "highlights": ["fedex-tracking.co", "update your delivery information", "confirm your identity", "within 24 hours"],
        "question": {
            "prompt": "What indicates this is phishing?",
            "choices": [
                "FedEx domains use fedex.com, not 'fedex-tracking.co'",
                "Legitimate companies use official domains only",
                "Creates urgency without real reason",
                "Both A and B"
            ],
            "correct": 3
        },
        "tip": "Package delivery companies always use their official websites. If you need to reschedule, go directly to fedex.com or ups.com in a new browser tab without clicking email links."
    },
    {
        "id": 10,
        "title": "LinkedIn Job Opportunity",
        "type": "Email",
        "difficulty": "easy",
        "sender": "hr@linkedIn-careers.biz",
        "message": "Hi, we've reviewed your LinkedIn profile and want to offer you an exciting job opportunity! Position: Senior Developer, Salary: $150,000. To apply, please click here and complete your profile with full details including: Full Name, Address, Phone, Email, Date of Birth, Passport Details. Apply now: https://linkedin-careers.biz/apply",
        "highlights": ["linkedIn-careers.biz", "click here", "full details", "Passport Details"],
        "question": {
            "prompt": "Why is this likely a phishing scam?",
            "choices": [
                "LinkedIn.com is the real domain, not 'linkedin-careers.biz'",
                "Real job offers don't request passport details via email",
                "Legitimate jobs use LinkedIn's platform, not suspicious links",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Job scams often target unemployed or job-seeking individuals. LinkedIn uses linkedin.com only. Never provide passport or personal ID details before official hiring."
    },
    {
        "id": 11,
        "title": "Netflix Billing Problem",
        "type": "Email",
        "difficulty": "medium",
        "sender": "billing@netflix-account-security.net",
        "message": "Your Netflix billing information has expired. Please update your payment method immediately to avoid service interruption. Click here to update your credit card information, expiration date, and CVV code. Do this within 48 hours or your account will be permanently suspended.",
        "highlights": ["netflix-account-security.net", "expired", "Click here", "credit card information", "CVV code", "within 48 hours"],
        "question": {
            "prompt": "What makes this email suspicious?",
            "choices": [
                "Netflix domains use netflix.com only, not 'netflix-account-security.net'",
                "Netflix never asks for CVV codes via email",
                "Netflix handles billing through their website/app, not email links",
                "All of the above are red flags"
            ],
            "correct": 3
        },
        "tip": "Never enter payment card details (especially CVV) through email links. Always update billing directly on the company's official website or app."
    },
    {
        "id": 12,
        "title": "Password Reset Spoofing",
        "type": "Email",
        "difficulty": "medium",
        "sender": "support@your-organization-security.com",
        "message": "Your password will expire in 3 days. To change your password, click this link and enter your current password along with a new password. Password must be at least 12 characters. https://your-organization-security.com/reset-password",
        "highlights": ["your-organization-security.com", "expire in 3 days", "enter your current password", "click this link"],
        "question": {
            "prompt": "What's the red flag in this email?",
            "choices": [
                "Real organizations don't ask for current password via reset links",
                "Domain doesn't match official company domain",
                "Creates false urgency about password expiration",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Password reset links should only ask for a new password, never your current one. Legitimate companies rarely expire passwords unless for compliance reasons."
    },
    {
        "id": 13,
        "title": "Casino Winnings Notification",
        "type": "Email",
        "difficulty": "easy",
        "sender": "claims@lottery-winnings.club",
        "message": "CONGRATULATIONS! You have won $50,000 in the International Lottery! You were randomly selected from 10 million email addresses. To claim your prize, you must: 1) Verify your identity, 2) Pay processing fee of $200, 3) Provide banking details. Click here to claim your prize: https://lottery-winnings.club/claim",
        "highlights": ["lottery-winnings.club", "CONGRATULATIONS", "randomly selected", "Pay processing fee", "provide banking details"],
        "question": {
            "prompt": "Why is this definitely a scam?",
            "choices": [
                "You didn't enter any lottery",
                "Legitimate lotteries never ask for processing fees",
                "Legitimate lotteries don't ask for money upfront to claim prizes",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "If you didn't enter a lottery, you can't win it. Legitimate lotteries NEVER ask for processing fees or upfront payments to claim winnings. Delete immediately."
    },
    {
        "id": 14,
        "title": "Inheritance Scam",
        "type": "Email",
        "difficulty": "easy",
        "sender": "attorney@inheritence-claim.legal",
        "message": "You have been identified as an heir to an unclaimed inheritance of $2.5 million from a relative in Nigeria who passed away. To claim your inheritance, please provide: Full legal name, address, phone, date of birth, passport copy, and bank account details. Respond immediately! https://inheritence-claim.legal/inherit",
        "highlights": ["inheritence-claim.legal", "unclaimed inheritance", "passed away", "passport copy", "bank account details"],
        "question": {
            "prompt": "What are the obvious scam indicators?",
            "choices": [
                "You don't have relatives in Nigeria",
                "Legitimate inheritance never requires upfront personal/banking details",
                "Professional lawyers don't handle via mass email",
                "All are major red flags"
            ],
            "correct": 3
        },
        "tip": "Inheritance scams target people hoping for unexpected money. No legitimate inheritance claim will ever ask for passport or banking details via email from strangers."
    },
    {
        "id": 15,
        "title": "Dropbox Storage Warning",
        "type": "Email",
        "difficulty": "medium",
        "sender": "notifications@dropboxx-alerts.com",
        "message": "Your Dropbox storage is 98% full and will stop syncing in 24 hours. To upgrade your account, click here and provide your billing information including full credit card number, expiration, and CVV. Upgrade now to maintain access: https://dropboxx-alerts.com/upgrade-now",
        "highlights": ["dropboxx-alerts.com", "98% full", "stop syncing in 24 hours", "full credit card number", "Click here"],
        "question": {
            "prompt": "How can you identify this as phishing?",
            "choices": [
                "Dropbox official domain is dropbox.com, not 'dropboxx-alerts.com'",
                "Dropbox upgrades through official website, not email links",
                "Never enter full credit card info anywhere except official payment pages",
                "All of the above"
            ],
            "correct": 3
        },
        "tip": "Storage company alerts are common phishing targets. Dropbox handles upgrades through dropbox.com only. Always navigate directly without clicking email links."
    }
]

PASSWORD_LEVELS = [
    {
        "id": 1,
        "title": "Social Media Influencer",
        "password": "Fluffy2018",
        "hints": [
            "Instagram handle @fluffylover mentions their Persian cat 'Fluffy'",
            "Profile creation date: March 2018",
            "Bio states: 'Cat mom since 2018'",
            "Posts show cat named Fluffy in 40+ photos"
        ],
        "tip": "Pet names combined with significant years are extremely common passwords."
    },
    {
        "id": 2,
        "title": "Corporate Employee",
        "password": "Spring2024!",
        "hints": [
            "Company enforces quarterly password changes",
            "Current season and year: Spring 2024",
            "Password policy: 8+ characters, 1 special character",
            "Previous passwords detected: Winter2023!, Fall2023!"
        ],
        "tip": "Predictable patterns like Season+Year+! are easily guessed."
    },
    {
        "id": 3,
        "title": "Startup Founder",
        "password": "TechGenius99",
        "hints": [
            "LinkedIn: 'Tech enthusiast, founder of startup'",
            "Twitter handle: @TechGenius99",
            "Loves coding and innovation",
            "Joined LinkedIn in 1999 (birth year referenced in handle)"
        ],
        "tip": "People often use their online handles or social media usernames as passwords."
    },
    {
        "id": 4,
        "title": "Sports Enthusiast",
        "password": "Lakers32!!!",
        "hints": [
            "All social media bios mention 'Die-hard Lakers fan'",
            "Wears Lakers gear in profile photos",
            "Favorite player: Magic Johnson (wore #32)",
            "Has 32 championship trophies in background photo"
        ],
        "tip": "Favorite sports teams and players' numbers are common password components."
    },
    {
        "id": 5,
        "title": "Fitness Trainer",
        "password": "Gym@Strength8",
        "hints": [
            "Bio: 'Fitness coach at GymStrength'",
            "Instagram: 1800+ followers, all fitness content",
            "Started at GymStrength 8 years ago",
            "Posts daily workout motivation quotes"
        ],
        "tip": "Workplace names and tenure combined with @ symbols are common."
    },
    {
        "id": 6,
        "title": "Gaming Streamer",
        "password": "Valorant123!!",
        "hints": [
            "Twitch channel: streams Valorant daily",
            "Has been rank 123 in ladder",
            "Username everywhere: GamerXPro",
            "Streams every day at 3PM"
        ],
        "tip": "Favorite games combined with high scores or rank numbers are predictable."
    },
    {
        "id": 7,
        "title": "Wedding Planner",
        "password": "Sarah+John2022",
        "hints": [
            "Recently married in June 2022",
            "Wedding announcement on all social media",
            "Names: Sarah and John",
            "Uses hearts and wedding emojis"
        ],
        "tip": "Significant life events like marriages are often embedded in passwords."
    },
    {
        "id": 8,
        "title": "Student",
        "password": "MyDog#Buddy07",
        "hints": [
            "Instagram: 50+ photos of dog named Buddy",
            "Born in 2007 (birthday visible on LinkedIn)",
            "Facebook: 'Dog lover'",
            "Posted: 'Buddy is my best friend'"
        ],
        "tip": "Pets combined with birth years create memorable but guessable passwords."
    },
    {
        "id": 9,
        "title": "World Traveler",
        "password": "Paris2015Summer",
        "hints": [
            "Instagram: Album titled 'Paris Summer 2015'",
            "1,200+ photos, mostly travel",
            "Post: 'Best trip of my life - Paris 2015'",
            "Pinterest board: 'Dream destinations'"
        ],
        "tip": "Travel memories with locations and dates are often used as passwords."
    },
    {
        "id": 10,
        "title": "Parents",
        "password": "Emma&Lucas01",
        "hints": [
            "Facebook: 'So proud of Emma (age 13) and Lucas (age 11)'",
            "Instagram bio: 'Mom/Dad of two'",
            "Children's birth order: Emma is older",
            "Family photo shows two children"
        ],
        "tip": "Children's names and birth order info are dangerously common in passwords."
    },
    {
        "id": 11,
        "title": "Music Teacher",
        "password": "Beethoven1770!",
        "hints": [
            "Bio: 'Classical music teacher'",
            "Posts about composers daily",
            "Favorite: Ludwig van Beethoven",
            "1770: Beethoven's birth year"
        ],
        "tip": "Historical figures and dates related to interests are guessable patterns."
    },
    {
        "id": 12,
        "title": "Bookworm",
        "password": "HP_Snape666",
        "hints": [
            "Reading list: All Harry Potter books",
            "Goodreads: 'HP superfan'",
            "Favorite character: Severus Snape",
            "666: Appears in HP fan theories"
        ],
        "tip": "Fiction references and character names are common but weak passwords."
    }
]

# ===== FRONTEND ROUTES =====
@app.route('/')
def index():
    return render_template('index.html')

# ===== API ROUTES =====

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'OK',
        'timestamp': datetime.now().isoformat(),
        'service': 'SwipeSafe Backend'
    })

@app.route('/api/scammer/audio', methods=['POST'])
def generate_scammer_audio():
    """Generate audio for scammer message using ElevenLabs"""
    try:
        data = request.json
        text = data.get('text', '')
        voice_type = data.get('voice_type', 'paypal')
        
        print(f"\nDEBUG /api/scammer/audio:")
        print(f"  Received voice_type: '{voice_type}'")
        print(f"  Text: '{text[:50]}...'")
        
        if not text:
            return jsonify({'success': False, 'error': 'No text provided'}), 400
        
        # Determine voice type based on scenario ID
        voice_map = {
            'paypal_scam': 'male',
            'paypal_unusual_activity': 'female',
            'paypal_refund_scam': 'male',
            'microsoft_scam': 'male',
            'windows_defender_alert': 'female',
            'irs_scam': 'male',
            'irs_arrest_warrant': 'female',
            'amazon_account_locked': 'female',
            'amazon_prime_scam': 'female',
            'google_account_compromised': 'female',
            'apple_id_locked': 'female',
            'lottery_prize_scam': 'male',
            'bank_fraud_alert': 'female',
            'prince_scam': 'male',
            'inheritance_scam': 'female',
            'legitimate_call': 'female',
            'paypal_scam_variant_1': 'male',
            'microsoft_tech_support': 'female',
            'wells_fargo_scam': 'female',
            'social_security_scam': 'male',
            'tax_refund_scam': 'female',
            'apple_account_compromised': 'female',
            'google_account_alert': 'female',
            'facebook_security_alert': 'female',
            'mortgage_company_scam': 'male',
            'tech_support_virus': 'male',
            'emergency_grandparent_scam': 'male'
        }
        actual_voice_type = voice_map.get(voice_type, 'male')
        print(f"  Mapped to voice_type: '{actual_voice_type}'")
        
        result = get_elevenlabs_audio(text, actual_voice_type)
        return jsonify(result)
    
    except Exception as e:
        print(f"Audio generation error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/games/phishing', methods=['GET'])
def get_phishing_levels():
    """Get all phishing levels"""
    return jsonify(PHISHING_LEVELS)

@app.route('/api/games/password', methods=['GET'])
def get_password_levels():
    """Get all password levels"""
    return jsonify(PASSWORD_LEVELS)

@app.route('/api/games/phishing/<int:level_id>', methods=['GET'])
def get_phishing_level(level_id):
    """Get specific phishing level"""
    level = next((l for l in PHISHING_LEVELS if l['id'] == level_id), None)
    if level:
        return jsonify({'success': True, 'data': level})
    return jsonify({'success': False, 'error': 'Level not found'}), 404

@app.route('/api/scammer/greeting', methods=['POST'])
def get_scammer_greeting():
    """Get initial greeting from scammer AI"""
    try:
        import random
        
        data = request.json
        # Select random call scenario
        scenario = random.choice(CALL_SCENARIOS)
        
        now = datetime.now()
        current_time = now.strftime("%I:%M %p")
        
        return jsonify({
            'success': True,
            'greeting': scenario['opening'],
            'persona': scenario['company'],
            'caller_name': scenario['caller_name'],
            'call_time': current_time,
            'scenario_id': scenario['id'],
            'call_type': scenario['type'],
            'difficulty': scenario['difficulty'],
            'voice': 'default'
        })
    
    except Exception as e:
        print(f"Greeting error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/scammer/respond', methods=['POST'])
def get_scammer_response():
    """Get response from scammer AI based on user input"""
    try:
        import random
        data = request.json
        user_input = data.get('message', '')
        scenario_id = data.get('scenario_id', 'paypal_scam')
        conversation_history = data.get('conversation_history', [])
        
        if not user_input:
            return jsonify({'success': False, 'error': 'No message provided'}), 400
        
        # Find the scenario
        scenario = next((s for s in CALL_SCENARIOS if s['id'] == scenario_id), CALL_SCENARIOS[0])
        
        # Use Gemini AI for truly dynamic responses
        if GEMINI_API_KEY:
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                
                # Build conversation context
                conversation_context = ""
                for msg in conversation_history[-6:]:  # Use last 6 messages for context
                    role = "User" if msg.get('role') == 'user' else scenario['caller_name']
                    conversation_context += f"{role}: {msg.get('content', '')}\n"
                
                if scenario['type'] == 'legitimate':
                    # Legitimate customer support response
                    prompt = f"""You are {scenario['caller_name']} from {scenario['company']}, a legitimate customer support representative.
You are helpful, professional, and genuinely trying to help the customer.
You NEVER ask for passwords, full SSN, or sensitive banking information.
You only verify information that was already provided by the customer.
Keep responses VERY SHORT (1 sentence max).
Adapt to what the customer says and respond genuinely to their concerns.
If they seem confused or suspicious, reassure them and explain everything clearly.

Conversation so far:
{conversation_context}

Respond briefly. Be helpful and honest."""
                else:
                    # Scammer response - tries to extract info, VERY AGGRESSIVE
                    prompt = f"""You are {scenario['caller_name']}, a {scenario['type']} caller from {scenario['company']}.
Your ONLY goal is to get personal information ({', '.join(scenario['info_requests'][:2])}).
Be AGGRESSIVE, pushy, and create URGENCY. Use pressure tactics.
Sound like a real scammer - be manipulative and threatening.
Keep responses VERY SHORT (1 sentence max - like 10-15 words).
Interrupt them. Don't take no for an answer. Demand the information NOW.
If they refuse or hesitate, threaten consequences or say it's their last chance.

Conversation so far:
{conversation_context}

Respond in 1 short sentence. Be aggressive and pushy. DEMAND what you need."""
                
                response = model.generate_content(prompt)
                scammer_response = response.text.strip()
            except Exception as api_error:
                print(f"Gemini API error: {api_error}")
                # Fallback to scripted response
                if len(conversation_history) < 4:
                    if scenario['type'] == 'legitimate':
                        scammer_response = "Thank you for confirming that. Is there anything else I can help you with today?"
                    else:
                        scammer_response = "I understand. Now I really need to proceed with verification. Can you provide that information?"
                else:
                    scammer_response = "Okay, thank you for that. Let me proceed with the next step."
        else:
            # No API key - use fallback
            if len(conversation_history) < 4:
                if scenario['type'] == 'legitimate':
                    scammer_response = "Thank you for confirming that. Is there anything else I can help you with today?"
                else:
                    scammer_response = "I understand. Now I really need to proceed with verification. Can you provide that information?"
            else:
                scammer_response = "Okay, thank you for that. Let me proceed with the next step."
        
        return jsonify({
            'success': True,
            'response': scammer_response,
            'persona': scenario['company'],
            'scenario_id': scenario_id
        })
    
    except Exception as e:
        print(f"Response error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/games/sql', methods=['GET'])
def get_sql_levels():
    """Get all SQL injection levels"""
    sql_levels = [
        {
            'id': 1,
            'title': 'Login Authentication',
            'code': [
                {'line': "def login(username, password):", 'vulnerable': False},
                {'line': '    query = "SELECT * FROM users WHERE username=\'" + username + "\' AND password=\'" + password + "\'"', 'vulnerable': True},
                {'line': '    result = database.execute(query)', 'vulnerable': False},
                {'line': '    return result', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'String concatenation in SQL queries is the primary vulnerability. Use parameterized queries (prepared statements) instead of concatenation.'
        },
        {
            'id': 2,
            'title': 'Search Box',
            'code': [
                {'line': "def search_products(search_term):", 'vulnerable': False},
                {'line': '    query = f"SELECT * FROM products WHERE name LIKE \'%{search_term}%\'"', 'vulnerable': True},
                {'line': '    return database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'F-strings and template literals can be exploited. Always use parameterized queries: "SELECT * FROM products WHERE name LIKE ?"'
        },
        {
            'id': 3,
            'title': 'User Profile Update',
            'code': [
                {'line': "def update_profile(user_id, bio):", 'vulnerable': False},
                {'line': '    query = "UPDATE users SET bio=\'" + bio + "\' WHERE id=" + str(user_id)', 'vulnerable': True},
                {'line': '    database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'UPDATE statements are also vulnerable to SQL injection. The attacker could inject: bio\'; DROP TABLE users;--'
        },
        {
            'id': 4,
            'title': 'Secure Implementation',
            'code': [
                {'line': "def login_secure(username, password):", 'vulnerable': False},
                {'line': '    query = "SELECT * FROM users WHERE username=? AND password=?"', 'vulnerable': False},
                {'line': '    result = database.execute(query, [username, password])', 'vulnerable': False},
                {'line': '    return result', 'vulnerable': False}
            ],
            'vulnerableLine': -1,
            'tip': 'This is the CORRECT way! Parameterized queries use ? placeholders and pass data separately, preventing injection.'
        },
        {
            'id': 5,
            'title': 'Comment-based Injection',
            'code': [
                {'line': "def get_user_by_id(user_id):", 'vulnerable': False},
                {'line': '    query = "SELECT * FROM users WHERE id=" + str(user_id) + " -- Get user details"', 'vulnerable': True},
                {'line': '    return database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'Using -- comments can bypass authentication. Attacker could inject: 1 OR 1=1 -- to bypass logic. Always use parameterized queries with ?".'
        },
        {
            'id': 6,
            'title': 'Email Field Injection',
            'code': [
                {'line': "def find_user_by_email(email):", 'vulnerable': False},
                {'line': '    query = "SELECT id, username FROM users WHERE email=\'" + email + "\'"', 'vulnerable': True},
                {'line': '    result = database.execute(query)', 'vulnerable': False},
                {'line': '    return result[0] if result else None', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'Email fields are common injection points. Attacker could input: admin@test.com\' OR \'1\'=\'1 to bypass email verification.'
        },
        {
            'id': 7,
            'title': 'DELETE Statement Injection',
            'code': [
                {'line': "def delete_comment(comment_id):", 'vulnerable': False},
                {'line': '    query = "DELETE FROM comments WHERE id=" + str(comment_id)', 'vulnerable': True},
                {'line': '    database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'DELETE statements without parameterized queries can delete entire tables. Attacker could inject: 1; DROP TABLE comments;-- to delete all comments.'
        },
        {
            'id': 8,
            'title': 'UNION-Based Injection',
            'code': [
                {'line': "def search_books(keyword):", 'vulnerable': False},
                {'line': '    query = "SELECT title, author FROM books WHERE title LIKE \'%" + keyword + "%\'"', 'vulnerable': True},
                {'line': '    return database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'UNION-based injection can extract data from other tables. Attacker could inject: %\' UNION SELECT username, password FROM users -- to leak credentials.'
        },
        {
            'id': 9,
            'title': 'Time-Based Blind Injection',
            'code': [
                {'line': "def verify_username(username):", 'vulnerable': False},
                {'line': '    query = "SELECT * FROM users WHERE username=\'" + username + "\'"', 'vulnerable': True},
                {'line': '    start = time.time()', 'vulnerable': False},
                {'line': '    database.execute(query)', 'vulnerable': False},
                {'line': '    return time.time() - start > 5', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'Time-based blind SQL injection bypasses filters. Attacker could inject: admin\' AND IF(1=1, SLEEP(5), 0) -- to confirm database structure.'
        },
        {
            'id': 10,
            'title': 'Stacked Queries Injection',
            'code': [
                {'line': "def update_last_login(user_id):", 'vulnerable': False},
                {'line': '    query = "UPDATE users SET last_login=NOW() WHERE id=" + str(user_id)', 'vulnerable': True},
                {'line': '    database.execute(query)', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'Stacked queries allow executing multiple SQL statements. Attacker could inject: 1; INSERT INTO users VALUES(999, \'hacker\', \'password\'); -- to create accounts.'
        },
        {
            'id': 11,
            'title': 'Second-Order Injection',
            'code': [
                {'line': "def save_profile(user_id, bio):", 'vulnerable': False},
                {'line': '    query = "INSERT INTO profiles (user_id, bio) VALUES (" + str(user_id) + ", \'" + bio + "\')"', 'vulnerable': True},
                {'line': '    database.execute(query)', 'vulnerable': False},
                {'line': '    later_query = "SELECT bio FROM profiles WHERE user_id=" + str(user_id)', 'vulnerable': True},
                {'line': '    display_to_user(database.execute(later_query))', 'vulnerable': False}
            ],
            'vulnerableLine': 1,
            'tip': 'Second-order injection stores malicious SQL for later execution. Always use parameterized queries at every database operation.'
        },
        {
            'id': 12,
            'title': 'SECURE - All Parameters',
            'code': [
                {'line': "def secure_search(search_term, sort_column):", 'vulnerable': False},
                {'line': '    # Whitelist allowed columns for sort', 'vulnerable': False},
                {'line': '    allowed_columns = ["title", "author", "date"]', 'vulnerable': False},
                {'line': '    if sort_column not in allowed_columns:', 'vulnerable': False},
                {'line': '        sort_column = "title"', 'vulnerable': False},
                {'line': '    query = "SELECT * FROM books WHERE title LIKE ? ORDER BY " + sort_column', 'vulnerable': False},
                {'line': '    return database.execute(query, ["%"+search_term+"%"])', 'vulnerable': False}
            ],
            'vulnerableLine': -1,
            'tip': 'Proper protection uses: 1) Parameterized queries for data, 2) Whitelists for dynamic column names, 3) Prepared statements everywhere.'
        }
    ]
    return jsonify(sql_levels)

@app.route('/api/game-state', methods=['POST'])
def save_game_state():
    """Save game state (for backend persistence)"""
    try:
        data = request.json
        # TODO: Save to database
        return jsonify({
            'success': True,
            'message': 'Game state saved',
            'data': data
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ===== ERROR HANDLERS =====
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not Found', 'message': 'Route not found'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Server Error', 'message': str(error)}), 500

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_ENV', 'development') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=5000)
