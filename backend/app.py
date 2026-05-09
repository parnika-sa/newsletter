import os
import csv
import io
import uuid
import re
import urllib.parse
from flask import Flask, request, jsonify, send_from_directory, redirect, send_file
from flask_cors import CORS
from database import db, Subscriber, Tag, Campaign, EmailLog, LinkClick
from dotenv import load_dotenv
from mailer import send_email, send_verification_email, send_welcome_email
from werkzeug.utils import secure_filename
import cloudinary
import cloudinary.uploader

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database Setup (Postgres from URL, fallback to SQLite)
db_url = os.environ.get('DATABASE_URL', 'sqlite:///newsletter.db')
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# Cloudinary Setup
cloudinary.config(
  cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
  api_key = os.environ.get('CLOUDINARY_API_KEY', ''),
  api_secret = os.environ.get('CLOUDINARY_API_SECRET', '')
)

# --- SUBSCRIBER MANAGEMENT ---

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    email = data.get('email')
    name = data.get('name', '')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    subscriber = Subscriber.query.filter_by(email=email).first()
    
    if subscriber:
        if subscriber.is_active and subscriber.is_verified:
            return jsonify({'message': 'Already subscribed!'}), 200
        
        subscriber.verification_token = str(uuid.uuid4())
        subscriber.is_active = True
        db.session.commit()
        send_verification_email(subscriber.email, subscriber.verification_token)
        return jsonify({'message': 'Welcome back! Please check your email to verify your subscription.'}), 200

    token = str(uuid.uuid4())
    new_subscriber = Subscriber(email=email, name=name, verification_token=token, is_verified=False)
    db.session.add(new_subscriber)
    db.session.commit()
    
    send_verification_email(new_subscriber.email, token)

    return jsonify({'message': 'Successfully subscribed! Please check your email to verify your subscription.'}), 201

@app.route('/api/verify/<token>', methods=['POST', 'GET'])
def verify_email(token):
    subscriber = Subscriber.query.filter_by(verification_token=token).first()
    
    if not subscriber:
        return jsonify({'error': 'Invalid or expired verification token.'}), 404
        
    if subscriber.is_verified:
        return jsonify({'message': 'Email is already verified.'}), 200
        
    subscriber.is_verified = True
    subscriber.is_active = True
    subscriber.verification_token = None
    db.session.commit()
    
    send_welcome_email(subscriber.email)
    
    return jsonify({'message': 'Email verified successfully!'}), 200

@app.route('/api/unsubscribe/<token>', methods=['POST', 'GET'])
def unsubscribe(token):
    log = EmailLog.query.filter_by(unique_token=token).first()
    
    if not log:
        return jsonify({'error': 'Invalid unsubscribe link.'}), 404
        
    subscriber = log.subscriber
    if subscriber and subscriber.is_active:
        subscriber.is_active = False
        db.session.commit()
        return jsonify({'message': 'You have been successfully unsubscribed.'}), 200
        
    return jsonify({'message': 'Already unsubscribed.'}), 200

@app.route('/api/subscribers', methods=['GET'])
def get_subscribers():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401
        
    subscribers = Subscriber.query.order_by(Subscriber.id.desc()).all()
    return jsonify([sub.to_dict() for sub in subscribers]), 200

# --- CSV IMPORT ---

@app.route('/api/import', methods=['POST'])
def import_csv():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No CSV file provided'}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'File must be a CSV'}), 400

    try:
        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.reader(stream)
        
        emails_to_add = set()
        for row in csv_input:
            if row:
                email = row[0].strip()
                if '@' in email:
                    emails_to_add.add(email.lower())
                    
        existing_subscribers = Subscriber.query.with_entities(Subscriber.email).all()
        existing_emails = set([sub[0].lower() for sub in existing_subscribers])
        
        new_emails = emails_to_add - existing_emails
        
        new_subscribers = [Subscriber(email=e, is_verified=True, is_active=True) for e in new_emails]
        db.session.bulk_save_objects(new_subscribers)
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully imported {len(new_emails)} new subscribers.',
            'count': len(new_emails)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- NEWSLETTER SENDING ---

@app.route('/api/send', methods=['POST'])
def send_newsletter():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401
        
    subject = request.form.get('subject')
    content = request.form.get('content')
    
    if not subject or not content:
        return jsonify({'error': 'Subject and content are required'}), 400
        
    # Handle attachments IN MEMORY (no disk saving required for Cloud)
    attachments = []
    files = request.files.getlist('attachments')
    for file in files:
        if file.filename != '':
            filename = secure_filename(file.filename)
            # Read file stream into memory
            file_bytes = file.read()
            attachments.append({
                'filename': filename,
                'content': file_bytes,
                'mimetype': file.content_type
            })
            
    campaign = Campaign(subject=subject)
    db.session.add(campaign)
    db.session.commit()
            
    active_subscribers = Subscriber.query.filter_by(is_active=True, is_verified=True).all()
    
    success_count = 0
    base_url = os.environ.get('BACKEND_URL', 'http://localhost:5000')
    
    for sub in active_subscribers:
        token = str(uuid.uuid4())
        
        log = EmailLog(campaign_id=campaign.id, subscriber_id=sub.id, unique_token=token)
        db.session.add(log)
        db.session.commit()
        
        def repl(match):
            original_url = match.group(1)
            encoded_url = urllib.parse.quote(original_url)
            return f'href="{base_url}/api/track/click/{token}?url={encoded_url}"'
            
        tracked_content = re.sub(r'href="([^"]+)"', repl, content)
        
        # Pass attachments memory buffers to mailer
        if send_email(sub.email, subject, tracked_content, token, attachments):
            success_count += 1
            
    return jsonify({
        'message': f'Newsletter sent successfully to {success_count} out of {len(active_subscribers)} active subscribers!',
        'count': success_count
    }), 200

# --- ANALYTICS AND TRACKING ---

@app.route('/api/track/open/<token>', methods=['GET'])
def track_open(token):
    log = EmailLog.query.filter_by(unique_token=token).first()
    if log and not log.opened_at:
        import datetime
        log.opened_at = datetime.datetime.utcnow()
        db.session.commit()
        
    # Generate 1x1 GIF dynamically in memory (no file creation needed)
    gif_bytes = b'GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;'
    return send_file(io.BytesIO(gif_bytes), mimetype='image/gif')

@app.route('/api/track/click/<token>', methods=['GET'])
def track_click(token):
    url = request.args.get('url')
    if not url:
        return redirect('http://localhost:5173')
        
    log = EmailLog.query.filter_by(unique_token=token).first()
    if log:
        click = LinkClick(email_log_id=log.id, url=url)
        db.session.add(click)
        db.session.commit()
        
    return redirect(url)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401
        
    total_subs = Subscriber.query.count()
    active_subs = Subscriber.query.filter_by(is_active=True, is_verified=True).count()
    campaigns = Campaign.query.order_by(Campaign.id.desc()).limit(10).all()
    
    return jsonify({
        'total_subscribers': total_subs,
        'active_subscribers': active_subs,
        'recent_campaigns': [c.to_dict() for c in campaigns]
    }), 200

# --- QUILL IMAGE UPLOAD TO CLOUDINARY ---

@app.route('/api/upload', methods=['POST'])
def upload_image():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401

    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
        
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file:
        try:
            # Upload stream directly to Cloudinary
            upload_result = cloudinary.uploader.upload(file)
            image_url = upload_result.get('secure_url')
            return jsonify({'url': image_url}), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
