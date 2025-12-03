// app.js - 前端交互逻辑
let currentPostId = null;
let currentUserId = 1; // 模拟当前用户ID

// 初始化加载动态
document.addEventListener('DOMContentLoaded', function() {
    loadPosts();
});

// 加载动态
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        const data = await response.json();
        
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = '';
        
        data.posts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    } catch (error) {
        console.error('加载动态失败:', error);
    }
}

// 创建动态DOM元素
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post-card';
    postDiv.id = `post-${post.id}`;
    
    // 解析图片
    let imagesHTML = '';
    try {
        const images = JSON.parse(post.images || '[]');
        if (images.length > 0) {
            imagesHTML = `<div class="post-images">`;
            images.slice(0, 4).forEach(img => {
                imagesHTML += `<img src="${img}" alt="动态图片" class="post-image">`;
            });
            imagesHTML += `</div>`;
        }
    } catch (e) {
        console.error('解析图片失败:', e);
    }
    
    postDiv.innerHTML = `
        <div class="post-header">
            <img src="${post.user.avatar}" alt="${post.user.username}" class="post-avatar">
            <div class="post-user-info">
                <h4>${post.user.username}</h4>
                <span class="post-time">${formatTime(post.created_at)}</span>
            </div>
        </div>
        <div class="post-content">${post.content}</div>
        ${imagesHTML}
        <div class="post-actions">
            <button class="action-button ${post.liked ? 'liked' : ''}" onclick="likePost(${post.id})">
                <i class="fas fa-heart"></i> 赞 <span class="like-count">${post.likes_count}</span>
            </button>
            <button class="action-button" onclick="openComments(${post.id})">
                <i class="fas fa-comment"></i> 评论 <span>${post.comments_count}</span>
            </button>
            <button class="action-button" onclick="sharePost(${post.id})">
                <i class="fas fa-share"></i> 分享
            </button>
        </div>
    `;
    
    return postDiv;
}

// 发布动态
async function createPost() {
    const content = document.getElementById('postContent').value.trim();
    
    if (!content) {
        alert('请填写动态内容');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                user_id: currentUserId,
                images: JSON.stringify([])
            })
        });
        
        if (response.ok) {
            document.getElementById('postContent').value = '';
            loadPosts();
        }
    } catch (error) {
        console.error('发布动态失败:', error);
    }
}

// 点赞动态
async function likePost(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUserId
            })
        });
        
        const data = await response.json();
        
        // 更新点赞按钮状态
        const likeButton = document.querySelector(`#post-${postId} .action-button`);
        const likeCountSpan = likeButton.querySelector('.like-count');
        
        if (data.liked) {
            likeButton.classList.add('liked');
            likeCountSpan.textContent = data.likes_count;
        } else {
            likeButton.classList.remove('liked');
            likeCountSpan.textContent = data.likes_count;
        }
    } catch (error) {
        console.error('点赞失败:', error);
    }
}

// 打开评论模态框
async function openComments(postId) {
    currentPostId = postId;
    
    // 获取动态详情
    const response = await fetch(`/api/posts/${postId}`);
    const post = await response.json();
    
    document.getElementById('modalPostContent').innerHTML = `
        <div class="post-content">${post.content}</div>
    `;
    
    // 加载评论
    await loadComments(postId);
    
    // 显示模态框
    document.getElementById('commentModal').style.display = 'block';
}

// 加载评论
async function loadComments(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/comments`);
        const comments = await response.json();
        
        const commentsList = document.getElementById('commentsList');
        commentsList.innerHTML = '';
        
        comments.forEach(comment => {
            const commentDiv = document.createElement('div');
            commentDiv.className = 'comment-item';
            commentDiv.innerHTML = `
                <img src="${comment.user.avatar}" alt="${comment.user.username}" class="comment-avatar">
                <div class="comment-content">
                    <strong>${comment.user.username}</strong>
                    <p>${comment.content}</p>
                    <span class="comment-time">${formatTime(comment.created_at)}</span>
                </div>
            `;
            commentsList.appendChild(commentDiv);
        });
    } catch (error) {
        console.error('加载评论失败:', error);
    }
}

// 提交评论
async function submitComment() {
    const content = document.getElementById('commentText').value.trim();
    
    if (!content) {
        alert('请填写评论内容');
        return;
    }
    
    try {
        await fetch(`/api/posts/${currentPostId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content,
                user_id: currentUserId
            })
        });
        
        document.getElementById('commentText').value = '';
        loadComments(currentPostId);
        loadPosts(); // 刷新动态列表的评论数
    } catch (error) {
        console.error('提交评论失败:', error);
    }
}

// 关闭模态框
function closeModal() {
    document.getElementById('commentModal').style.display = 'none';
}

// 时间格式化函数
function formatTime(timeString) {
    const date = new Date(timeString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // 秒数差
    
    if (diff < 60) {
        return '刚刚';
    } else if (diff < 3600) {
        return Math.floor(diff / 60) + '分钟前';
    } else if (diff < 86400) {
        return Math.floor(diff / 3600) + '小时前';
    } else {
        return date.toLocaleDateString();
    }
}

// 图片上传
function openImageUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    
    input.onchange = function(e) {
        const files = e.target.files;
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'preview-image';
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    };
    
    input.click();
}

// 分享动态
function sharePost(postId) {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
        navigator.share({
            title: '分享动态',
            text: '来看看这个有趣的动态！',
            url: shareUrl,
        });
    } else {
        // 复制到剪贴板
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('链接已复制到剪贴板');
        });
    }
}