# AI Social Media Manager - Backend

A comprehensive backend API for managing social media content across multiple platforms with AI-powered features, automated scheduling, and analytics.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **User Management**: Profile management, social media connections, subscription plans
- **Content Management**: Create, edit, delete, and schedule posts across multiple platforms
- **Social Media Integration**: Support for Instagram, Facebook, LinkedIn, YouTube, and Twitter
- **Automated Scheduling**: Cron-based post scheduling with retry mechanisms
- **Analytics & Insights**: Comprehensive analytics tracking and performance insights
- **AI Content Generation**: Integration with OpenAI for content suggestions
- **File Upload**: Cloudinary integration for media management
- **Rate Limiting**: Built-in rate limiting and security features

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with bcrypt
- **File Upload**: Multer + Cloudinary
- **Scheduling**: node-cron
- **Validation**: express-validator
- **Security**: Helmet, CORS, Rate Limiting
- **Social APIs**: Instagram, Facebook, LinkedIn, YouTube, Twitter

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud)
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp config.env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb://localhost:27017/ai-social-media-manager
   
   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   
   # Add your API keys for social media platforms
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Post Management

#### Create Post
```http
POST /api/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "My Post Title",
  "content": "Post content here...",
  "scheduledDate": "2024-01-15T10:00:00Z",
  "platforms": [
    {
      "name": "instagram",
      "status": "draft"
    },
    {
      "name": "facebook",
      "status": "draft"
    }
  ],
  "tags": ["social", "marketing"],
  "category": "business"
}
```

#### Get Posts
```http
GET /api/posts?status=scheduled&platform=instagram&page=1&limit=10
Authorization: Bearer <token>
```

#### Update Post
```http
PUT /api/posts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

### Scheduling

#### Schedule Post
```http
POST /api/scheduler/schedule
Authorization: Bearer <token>
Content-Type: application/json

{
  "postId": "post_id_here",
  "scheduledDate": "2024-01-15T10:00:00Z"
}
```

#### Get Scheduled Posts
```http
GET /api/scheduler?status=scheduled&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Publish Immediately
```http
POST /api/scheduler/publish/:id
Authorization: Bearer <token>
```

### Analytics

#### Get Analytics Overview
```http
GET /api/analytics/overview?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Get Platform Analytics
```http
GET /api/analytics/platform/instagram?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

### Social Media Integration

#### Connect Social Account
```http
POST /api/users/connect-social
Authorization: Bearer <token>
Content-Type: application/json

{
  "platform": "instagram",
  "accessToken": "your_access_token",
  "refreshToken": "your_refresh_token",
  "username": "your_username"
}
```

#### Publish to Platform
```http
POST /api/social/instagram/publish
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Post content here...",
  "media": ["image_url_1", "image_url_2"],
  "hashtags": ["#social", "#marketing"]
}
```

## 🔐 Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment | No | development |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `JWT_EXPIRES_IN` | JWT expiration time | No | 7d |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | No | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | No | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | No | - |
| `OPENAI_API_KEY` | OpenAI API key | No | - |

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Database configuration
│   ├── controllers/             # Route controllers (if needed)
│   ├── middleware/
│   │   ├── auth.js             # Authentication middleware
│   │   ├── errorHandler.js     # Error handling middleware
│   │   └── notFound.js         # 404 middleware
│   ├── models/
│   │   ├── User.js             # User model
│   │   ├── Post.js             # Post model
│   │   └── Analytics.js        # Analytics model
│   ├── routes/
│   │   ├── auth.js             # Authentication routes
│   │   ├── users.js            # User management routes
│   │   ├── posts.js            # Post management routes
│   │   ├── scheduler.js        # Scheduling routes
│   │   ├── analytics.js        # Analytics routes
│   │   └── social.js           # Social media routes
│   ├── services/
│   │   ├── socialMediaService.js # Social media integration
│   │   └── schedulerService.js   # Automated scheduling
│   ├── utils/                  # Utility functions
│   └── server.js               # Main server file
├── package.json
├── config.env.example
└── README.md
```

## 🔄 Database Schema

### User Model
- Basic info (name, email, password)
- Social media connections
- Preferences and settings
- Subscription and usage tracking

### Post Model
- Content and metadata
- Platform-specific settings
- Scheduling information
- Analytics tracking

### Analytics Model
- Performance metrics
- Platform-specific data
- Demographic information
- Engagement tracking

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker (Optional)
```bash
docker build -t ai-social-media-backend .
docker run -p 5000:5000 ai-social-media-backend
```

## 🔍 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

## 📊 Monitoring

The application includes:
- Health check endpoint (`/health`)
- Request logging with Morgan
- Error tracking and logging
- Performance monitoring

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation
- SQL injection protection (MongoDB)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the error logs

## 🔮 Future Enhancements

- Real-time notifications
- Advanced AI content generation
- Multi-language support
- Advanced analytics dashboard
- Team collaboration features
- API rate limit management
- Webhook support
- Advanced scheduling algorithms 