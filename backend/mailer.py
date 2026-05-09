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
                {content_html}
            </div>
            <div class="footer">
                <div class="social-links">
                    <a href="#">Twitter</a> | <a href="#">LinkedIn</a> | <a href="#">Instagram</a>
                </div>
                <p>You received this email because you are subscribed to the Neural Automate Newsletter.</p>
                <p>&copy; 2026 Neural Automate. All rights reserved.</p>
                <p><a href="{unsubscribe_link}">Unsubscribe / Manage Preferences</a></p>
            </div>
        </div>
        {tracking_pixel}
    </body>
    </html>
    """
    return template

def send_email(to_email, subject, html_content, unique_token=None, attachments=None):
    smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    from_email = os.environ.get('FROM_EMAIL', 'Neural Automate <neuralautomate@gmail.com>')

    if not smtp_user or not smtp_password:
        print(f"Missing SMTP credentials. Cannot send to {to_email}")
        return False

    try:
        final_html = get_html_template(html_content, unique_token)

        msg = MIMEMultipart('mixed')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email

        # Attach HTML body
        msg_body = MIMEMultipart('alternative')
        part = MIMEText(final_html, 'html')
        msg_body.attach(part)
        msg.attach(msg_body)

        # Process attachments
        if attachments:
            for att in attachments:
                filepath = att.get('filepath')
                filename = att.get('filename')
                if os.path.exists(filepath):
                    with open(filepath, "rb") as attachment:
                        part = MIMEBase('application', 'octet-stream')
                        part.set_payload(attachment.read())
                    encoders.encode_base64(part)
                    part.add_header('Content-Disposition', f"attachment; filename= {filename}")
                    msg.attach(part)

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            actual_user = smtp_user.replace('"', '').strip()
            server.sendmail(actual_user, to_email, msg.as_string())
            
        return True
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
