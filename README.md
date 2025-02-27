# Pennywise API - Backend

## Overview
Pennywise is a full-stack application designed to help users manage shared expenses and shopping lists within groups. This repository contains the backend API built with NestJS and Supabase for data persistence and authentication.

## Features
- **User Authentication**: Secure authentication using Supabase Auth with email verification
- **Group Management**: Create, join, and manage expense sharing groups
- **Expense Tracking**: Record, categorize, and split expenses among group members
- **Balance Calculation**: Automatically calculate who owes what to whom within groups
- **Shopping Lists**: Create and manage shared shopping lists with real-time updates
- **Profile Management**: User profile creation and management

## Tech Stack
- **Framework**: NestJS
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for user avatars)
- **Real-time**: WebSockets (Socket.io) for real-time updates

## Project Structure
```
src/
├── app.module.ts             # Main application module
├── main.ts                   # Application entry point
├── exception-filters/        # Global exception handling
├── middleware/               # Application middleware
│   └── auth.middleware.ts    # Authentication middleware
├── supabase/                 # Supabase integration
│   ├── supabase.module.ts
│   └── supabase.service.ts
├── groups/                   # Group management feature
├── expenses/                 # Expense tracking feature
├── shopping-list/            # Shopping list feature
├── shopping-items/           # Shopping list items feature
├── profiles/                 # User profile management
└── notifications/            # User notifications
```

## API Endpoints

### Authentication
Authentication is handled by Supabase. The API validates Supabase JWT tokens.

### Groups
- `GET /groups` - Get all groups the user is a member of
- `POST /groups` - Create a new group
- `DELETE /groups/:id` - Delete a group
- `GET /groups/:groupId/members` - Get all members of a group
- `POST /groups/:groupId/members` - Add a member to a group
- `DELETE /groups/:groupId/members/:userId` - Remove a member from a group
- `PATCH /groups/:groupId/members/:userId` - Update a member's role
- `POST /groups/:groupId/invite` - Create an invitation to join a group
- `POST /groups/invite/accept/:inviteId` - Accept a group invitation
- `GET /groups/my-invites` - Get all invitations sent by the user

### Shopping Lists
- `GET /shopping-lists/:groupId` - Get all shopping lists for a group
- `POST /shopping-lists` - Create a new shopping list
- `PATCH /shopping-lists/:id` - Update a shopping list name
- `DELETE /shopping-lists/:id` - Delete a shopping list

### Shopping Items
- `GET /shopping-items/:listId` - Get all items in a shopping list
- `POST /shopping-items` - Add an item to a shopping list
- `PATCH /shopping-items/:id` - Update an item (name, quantity, completion)
- `DELETE /shopping-items/:id` - Remove an item from a shopping list

### Expenses
- `GET /expenses/:groupId` - Get all expenses for a group
- `POST /expenses` - Create a new expense
- `GET /expenses/balances/:groupId` - Get the balance sheet for a group
- `PATCH /expenses/:expenseId/settle` - Mark an expense as settled
- `DELETE /expenses/:expenseId` - Delete an expense
- `GET /expenses/balances/net/:groupId` - Get net balances for a group
- `POST /expenses/simplify/:groupId` - Simplify balances for a group

### Profiles
- `GET /profiles` - Get the current user's profile
- `PUT /profiles` - Update the current user's profile
- `POST /profiles/ensure` - Ensure the user has a profile
- `POST /profiles/avatar` - Upload a profile avatar
- `POST /profiles/last-active` - Update the user's last active timestamp

## Database Schema

### Tables
- `auth.users` (Managed by Supabase)
- `profiles` - User profiles
- `groups` - User groups
- `group_members` - Group membership and roles
- `group_invites` - Invitations to join groups
- `shopping_lists` - Shopping lists
- `shopping_items` - Items within shopping lists
- `expenses` - Expenses within groups
- `expense_participants` - Participants in expenses
- `group_balances` - Current balances between users

## Setup Instructions

### Prerequisites
- Node.js (v14 or later)
- npm or yarn
- Supabase account and project

### Environment Variables
Create `.env.development.local` and `.env.production` files with the following variables:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:5173

# Server
PORT=3000
```

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run start:dev
   ```

### Database Setup
Create the necessary tables in your Supabase project:

1. `profiles` table
   ```sql
   CREATE TABLE profiles (
     id UUID REFERENCES auth.users(id) PRIMARY KEY,
     name TEXT,
     surname TEXT,
     display_name TEXT NOT NULL,
     phone_number TEXT,
     avatar_url TEXT,
     language TEXT DEFAULT 'it',
     currency TEXT DEFAULT 'EUR',
     theme TEXT DEFAULT 'light',
     last_active TIMESTAMP,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
   );

   -- Enable RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

   -- Create policy
   CREATE POLICY "Users can view and update their own profiles"
     ON profiles
     FOR ALL
     USING (auth.uid() = id)
     WITH CHECK (auth.uid() = id);
   ```

2. Set up other tables (groups, expenses, etc.) with appropriate schemas and RLS policies.

## Deployment
The application can be deployed using various methods:

1. Traditional VPS deployment:
   ```bash
   npm run build
   npm run start:prod
   ```

2. Containerized deployment (Docker):
   ```bash
   docker build -t pennywise-api .
   docker run -p 3000:3000 pennywise-api
   ```

## Contributing
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push the branch: `git push origin feature/my-feature`
5. Submit a pull request

## License
This project is licensed under the MIT License.