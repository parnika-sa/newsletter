from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Association table for Subscriber <-> Tag
subscriber_tags = db.Table('subscriber_tags',
    db.Column('subscriber_id', db.Integer, db.ForeignKey('subscriber.id'), primary_key=True),
    db.Column('tag_id', db.Integer, db.ForeignKey('tag.id'), primary_key=True)
)

class Tag(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name
        }

class Subscriber(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    subscribed_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Double Opt-In fields
    is_verified = db.Column(db.Boolean, default=False)
    verification_token = db.Column(db.String(100), nullable=True)
    
    # Relationships
    tags = db.relationship('Tag', secondary=subscriber_tags, lazy='subquery',
        backref=db.backref('subscribers', lazy=True))
    logs = db.relationship('EmailLog', backref='subscriber', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'subscribed_at': self.subscribed_at.isoformat(),
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'tags': [t.to_dict() for t in self.tags]
        }

class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.String(255), nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    logs = db.relationship('EmailLog', backref='campaign', lazy=True)

    def to_dict(self):
        total_sent = len(self.logs)
        total_opened = sum(1 for log in self.logs if log.opened_at)
        total_clicks = sum(len(log.clicks) for log in self.logs)
        
        return {
            'id': self.id,
            'subject': self.subject,
            'sent_at': self.sent_at.isoformat(),
            'total_sent': total_sent,
            'total_opened': total_opened,
            'total_clicks': total_clicks,
            'open_rate': round((total_opened / total_sent * 100) if total_sent > 0 else 0, 1)
        }

class EmailLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    subscriber_id = db.Column(db.Integer, db.ForeignKey('subscriber.id'), nullable=False)
    
    unique_token = db.Column(db.String(100), nullable=False, unique=True) # Used for unsubs and pixel tracking
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    opened_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    clicks = db.relationship('LinkClick', backref='email_log', lazy=True)

class LinkClick(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email_log_id = db.Column(db.Integer, db.ForeignKey('email_log.id'), nullable=False)
    url = db.Column(db.String(1000), nullable=False)
    clicked_at = db.Column(db.DateTime, default=datetime.utcnow)
