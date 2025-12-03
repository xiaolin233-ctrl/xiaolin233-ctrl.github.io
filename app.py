# app.py - 基础后端框架
from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///blog.db'
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
db = SQLAlchemy(app)

# 数据库模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    avatar = db.Column(db.String(200), default='default-avatar.jpg')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    images = db.Column(db.Text)  # JSON字符串存储图片列表
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    
    user = db.relationship('User', backref=db.backref('posts', lazy=True))
    likes = db.relationship('Like', backref='post', lazy=True)
    comments = db.relationship('Comment', backref='post', lazy=True)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref=db.backref('comments', lazy=True))

class Like(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id', name='unique_like'),)

# API路由
@app.route('/api/posts', methods=['GET'])
def get_posts():
    page = request.args.get('page', 1, type=int)
    per_page = 10
    
    posts = Post.query.order_by(Post.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    result = []
    for post in posts.items:
        result.append({
            'id': post.id,
            'content': post.content,
            'images': post.images,
            'created_at': post.created_at.isoformat(),
            'likes_count': post.likes_count,
            'comments_count': post.comments_count,
            'user': {
                'id': post.user.id,
                'username': post.user.username,
                'avatar': post.user.avatar
            }
        })
    
    return jsonify({
        'posts': result,
        'total': posts.total,
        'page': posts.page,
        'pages': posts.pages
    })

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    new_post = Post(
        content=data['content'],
        user_id=data['user_id'],
        images=data.get('images', '[]')
    )
    db.session.add(new_post)
    db.session.commit()
    return jsonify({'message': 'Post created', 'post_id': new_post.id}), 201

@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def like_post(post_id):
    data = request.json
    user_id = data['user_id']
    
    # 检查是否已点赞
    existing_like = Like.query.filter_by(
        user_id=user_id, post_id=post_id).first()
    
    if existing_like:
        db.session.delete(existing_like)
        post = Post.query.get(post_id)
        post.likes_count -= 1
        db.session.commit()
        return jsonify({'liked': False, 'likes_count': post.likes_count})
    else:
        new_like = Like(user_id=user_id, post_id=post_id)
        db.session.add(new_like)
        post = Post.query.get(post_id)
        post.likes_count += 1
        db.session.commit()
        return jsonify({'liked': True, 'likes_count': post.likes_count})

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment(post_id):
    data = request.json
    new_comment = Comment(
        content=data['content'],
        user_id=data['user_id'],
        post_id=post_id
    )
    post = Post.query.get(post_id)
    post.comments_count += 1
    
    db.session.add(new_comment)
    db.session.commit()
    
    return jsonify({
        'message': 'Comment added',
        'comment_id': new_comment.id
    }), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, host='0.0.0.0', port=5000)