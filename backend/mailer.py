import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os

# Set base URL to frontend by default, or an env variable
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')

def get_html_template(content_html, unique_token=None):
    unsubscribe_link = f"{FRONTEND_URL}/unsubscribe/{unique_token}" if unique_token else f"{FRONTEND_URL}/"
    tracking_pixel = f'<img src="{BACKEND_URL}/api/track/open/{unique_token}" width="1" height="1" alt="" />' if unique_token else ''

    template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px; color: #333; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
            .header {{ background-color: #111827; color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 4px solid #00FFCC; }}
            .header h1 {{ margin: 0; font-size: 24px; letter-spacing: -0.5px; }}
            .header span {{ color: #00FFCC; }}
            .content {{ padding: 30px; font-size: 16px; overflow-wrap: break-word; }}
            .content h1, .content h2, .content h3 {{ color: #111827; margin-top: 0; }}
            .content a {{ color: #3b82f6; text-decoration: none; font-weight: 500; }}
            .content a:hover {{ text-decoration: underline; }}
            .content blockquote {{ border-left: 4px solid #e5e7eb; padding-left: 15px; color: #6b7280; font-style: italic; margin-left: 0; }}
            .content img {{ max-width: 100%; height: auto; border-radius: 8px; display: block; margin: 15px 0; }}
            .footer {{ background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }}
            .footer a {{ color: #6b7280; text-decoration: underline; }}
            .unsubscribe {{ margin-top: 15px; display: inline-block; padding: 8px 15px; border-radius: 4px; background: #e5e7eb; color: #4b5563; text-decoration: none; font-weight: bold; }}
            .social-links {{ margin: 15px 0; }}
            .social-links a {{ margin: 0 5px; color: #3b82f6; text-decoration: none; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Neural<span>Automate</span></h1>
            </div>
            <div class="content">
        <div class="header">
            <a href="https://neuralautomate.vercel.app" class="logo">Neural Automate</a>
        </div>
        <div class="content">
            {content}
        </div>
        <div class="footer">
            <p>You received this email because you are subscribed to Neural Automate.</p>
            <p>© 2026 Neural Automate. All rights reserved.</p>
            {tracking_pixel}
        </div>
    </body>
    </html>
    """

def send_email(to_email, subject, html_content, unique_token=None, attachments=None):
    api_key = os.environ.get('BREVO_API_KEY')
    from_email = os.environ.get('FROM_EMAIL', 'Neural Automate <neuralautomate@gmail.com>')
    
    # Parse from_email "Name <email@domain.com>"
    sender_name = "Neural Automate"
    sender_email = "neuralautomate@gmail.com"
    if '<' in from_email and '>' in from_email:
        sender_name = from_email.split('<')[0].strip()
        sender_email = from_email.split('<')[1].replace('>', '').strip()
    else:
        sender_email = from_email.strip()

    if not api_key:
        print(f"Missing BREVO_API_KEY. Cannot send to {to_email}")
        return False

    try:
        final_html = get_html_template(html_content, unique_token)
        
        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": to_email}],
            "subject": subject,
            "htmlContent": final_html
        }
        
        # Process attachments in memory and encode to base64
        if attachments:
            brevo_attachments = []
            for att in attachments:
                filename = att.get('filename')
                content = att.get('content')
                if content and filename:
                    b64_content = base64.b64encode(content).decode('utf-8')
                    brevo_attachments.append({
                        "name": filename,
                        "content": b64_content
                    })
            if brevo_attachments:
                payload["attachment"] = brevo_attachments

        headers = {
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": api_key
        }

        # Use HTTP POST instead of SMTP
        response = requests.post("https://api.brevo.com/v3/smtp/email", json=payload, headers=headers, timeout=15)
        
        if response.status_code in [200, 201, 202]:
            return True
        else:
            print(f"Brevo API Error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"Failed to send email to {to_email}: {e}")
        return False

def send_verification_email(to_email, verification_token):
    verify_link = f"{FRONTEND_URL}/verify/{verification_token}"
    subject = "Please Verify Your Subscription - Neural Automate"
    content = f"""
        <h2>Welcome aboard!</h2>
        <p>Thank you for subscribing to Neural Automate. To ensure we have the right email address, please verify your subscription by clicking the button below.</p>
        <p style="text-align: center; margin: 30px 0;">
            <a href="{verify_link}" style="background-color: #0b57d0; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    """
    return send_email(to_email, subject, content)

def send_welcome_email(to_email):
    subject = "Welcome to Neural Automate!"
    content = """
        <h2>Subscription Confirmed!</h2>
        <p>You're all set! You'll now receive actionable insights, market trends, and automation strategies directly to your inbox.</p>
        <p>Expect our first newsletter soon. In the meantime, feel free to reply to this email if you have any questions.</p>
        <p>Best regards,<br>The Neural Automate Team</p>
    """
    return send_email(to_email, subject, content)
