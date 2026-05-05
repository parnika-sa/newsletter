import os
import csv
import io
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import db, Subscriber
from dotenv import load_dotenv
from mailer import send_email
from werkzeug.utils import secure_filename

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///newsletter.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Uploads configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

db.init_app(app)

with app.app_context():
    db.create_all()

# Serve uploaded images
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    email = data.get('email')
    name = data.get('name', '')

    if not email:
        return jsonify({'error': 'Email is required'}), 400

    existing_subscriber = Subscriber.query.filter_by(email=email).first()
    if existing_subscriber:
        if not existing_subscriber.is_active:
            existing_subscriber.is_active = True
            db.session.commit()
            return jsonify({'message': 'Successfully re-subscribed!'}), 200
        return jsonify({'message': 'Already subscribed!'}), 200

    new_subscriber = Subscriber(email=email, name=name)
    db.session.add(new_subscriber)
    db.session.commit()

    return jsonify({'message': 'Successfully subscribed!'}), 201

@app.route('/api/subscribers', methods=['GET'])
def get_subscribers():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401
        
    subscribers = Subscriber.query.order_by(Subscriber.id.desc()).all()
    return jsonify([sub.to_dict() for sub in subscribers]), 200

@app.route('/api/unsubscribe', methods=['POST'])
def unsubscribe():
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
        
    subscriber = Subscriber.query.filter_by(email=email).first()
    if subscriber and subscriber.is_active:
        subscriber.is_active = False
        db.session.commit()
        return jsonify({'message': 'Successfully unsubscribed'}), 200
        
    return jsonify({'message': 'Subscriber not found or already inactive'}), 404

# NEW: Image upload for Quill Editor
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
        filename = secure_filename(file.filename)
        # Add a unique identifier to prevent overwriting
        import uuid
        unique_filename = f"{uuid.uuid4().hex}_{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        
        # Return the public URL to access this image
        image_url = f"http://localhost:5000/uploads/{unique_filename}"
        return jsonify({'url': image_url}), 200

# NEW: Bulk CSV Import
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
        
        # Extract emails
        emails_to_add = set()
        for row in csv_input:
            if row:
                email = row[0].strip()
                # Basic email validation (has @)
                if '@' in email:
                    emails_to_add.add(email.lower())
                    
        # Check existing to avoid duplicates efficiently
        existing_subscribers = Subscriber.query.with_entities(Subscriber.email).all()
        existing_emails = set([sub[0].lower() for sub in existing_subscribers])
        
        new_emails = emails_to_add - existing_emails
        
        # Bulk insert
        new_subscribers = [Subscriber(email=e) for e in new_emails]
        db.session.bulk_save_objects(new_subscribers)
        db.session.commit()
        
        return jsonify({
            'message': f'Successfully imported {len(new_emails)} new subscribers.',
            'count': len(new_emails)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# MODIFIED: Accept FormData with attachments
@app.route('/api/send', methods=['POST'])
def send_newsletter():
    auth_header = request.headers.get('Authorization')
    if auth_header != 'Bearer my_super_secret_admin_token':
        return jsonify({'error': 'Unauthorized'}), 401
        
    # Since it's multipart/form-data now
    subject = request.form.get('subject')
    content = request.form.get('content')
    
    if not subject or not content:
        return jsonify({'error': 'Subject and content are required'}), 400
        
    # Handle attachments
    attachments = []
    files = request.files.getlist('attachments')
    for file in files:
        if file.filename != '':
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], f"attachment_{filename}")
            file.save(filepath)
            attachments.append({
                'filepath': filepath,
                'filename': filename,
                'mimetype': file.content_type
            })
            
    active_subscribers = Subscriber.query.filter_by(is_active=True).all()
    
    success_count = 0
    for sub in active_subscribers:
        # Pass the attachments to the mailer
        if send_email(sub.email, subject, content, sub.id, attachments):
            success_count += 1
            
    # Clean up attachments from disk after sending
    for att in attachments:
        try:
            os.remove(att['filepath'])
        except:
            pass
            
    return jsonify({
        'message': f'Newsletter sent successfully to {success_count} out of {len(active_subscribers)} active subscribers!',
        'count': success_count
    }), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
