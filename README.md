# CharitEase Mobile App

A React Native mobile app that connects immigrants with verified charities in their home countries. CharitEase serves as a LinkedIn-style social platform for charitable giving with a focus on diaspora communities.

## 🌟 Features

### Social Feed
- LinkedIn-style social feed showing posts from followed charities
- Different post types: milestones, updates, and stories
- Like, comment, and share functionality
- Pull-to-refresh support
- Real-time engagement metrics

### Charity Discovery
- Browse and discover charities by category and country
- Advanced search and filtering capabilities
- Charity verification badges
- Follow/unfollow functionality
- Detailed charity profiles with impact metrics

### User Profile
- Personal donation history and statistics
- Followed charities management
- Donation tracking and impact visualization
- Quick actions for easy navigation

### Donation System
- Secure donation modal with preset amounts
- Personal message support
- Real-time donation processing simulation
- Impact tracking and receipts

## 🛠 Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation 6
- **Styling**: StyleSheet with custom design system
- **State Management**: React Context API
- **Icons**: Expo Vector Icons
- **Data**: Hardcoded demo data (no backend required)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI (`npm install -g @expo/cli`)
- Expo Go app on your mobile device

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd CharitEase
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your device:
   - Install Expo Go on your mobile device
   - Scan the QR code with your camera (iOS) or Expo Go app (Android)
   - Or press `i` for iOS simulator or `a` for Android emulator

## 📱 App Structure

```
src/
├── components/          # Reusable components
│   ├── CharityCard.js   # Charity listing card
│   ├── PostCard.js      # Social media post card
│   ├── DonationModal.js # Donation flow modal
│   ├── LoadingSpinner.js # Loading indicator
│   └── EmptyState.js    # Empty state component
├── screens/            # Main screens
│   ├── FeedScreen.js    # Social feed
│   ├── CharitiesScreen.js # Charity discovery
│   ├── ProfileScreen.js # User profile
│   └── CharityDetailScreen.js # Charity details
├── data/              # Demo data
│   └── demoData.js    # Charities, posts, user data
├── navigation/        # Navigation setup
│   └── AppNavigator.js # Tab and stack navigators
├── context/           # State management
│   └── AuthContext.js # User and app state
└── utils/            # Helper functions
    └── formatters.js  # Date, currency, number formatting
```

## 🎨 Design System

### Colors
- **Primary Blue**: #3B82F6
- **Secondary Green**: #22C55E
- **Text Dark**: #1F2937
- **Text Medium**: #374151
- **Text Light**: #6B7280
- **Background**: #F9FAFB

### Typography
- **Headers**: 24-28px, Weight 700
- **Body**: 14-16px, Weight 400-500
- **Captions**: 12-14px, Weight 400-500

### Components
- **Cards**: Rounded corners (12px), subtle shadows
- **Buttons**: Primary (blue) and secondary (outlined) styles
- **Touch Targets**: Minimum 44px for accessibility

## 📊 Demo Data

The app includes comprehensive demo data featuring:

### 6 Charities
- Syrian Education Foundation
- Hope for Syria Medical
- Syrian Community Development
- Afghan Women's Education Initiative
- Lebanese Relief Network
- Iraqi Youth Development

### 7 Social Posts
- Mix of milestones, updates, and stories
- Realistic charity work content
- High-quality images
- Engagement metrics

### User Profile
- Demo user with donation history
- 5 donations totaling $575
- 3 followed charities

## 🔧 Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## 📱 Supported Platforms

- iOS (iPhone SE to iPhone Pro Max)
- Android (API level 21+)
- Web (for development/testing)

## 🎯 Key Features Implemented

### Social Feed
- ✅ Scrollable post feed with pull-to-refresh
- ✅ Post type indicators (milestone, update, story)
- ✅ Like, comment, share buttons
- ✅ Charity profile navigation
- ✅ Realistic engagement metrics

### Charity Discovery
- ✅ Search and filter functionality
- ✅ Category and country filters
- ✅ Verification badges
- ✅ Follow/unfollow with visual feedback
- ✅ Charity statistics display

### User Profile
- ✅ Personal stats and donation history
- ✅ Followed charities management
- ✅ Quick action buttons
- ✅ Professional profile layout

### Donation Flow
- ✅ Preset and custom amount selection
- ✅ Personal message support
- ✅ Secure processing simulation
- ✅ Success feedback

## 🚀 Future Enhancements

- Real backend integration
- Push notifications
- Advanced analytics
- Multi-language support
- Offline functionality
- Social sharing
- Payment gateway integration

## 📄 License

This project is created for demonstration purposes.

## 🤝 Contributing

This is a demo project. For production use, please implement proper authentication, backend integration, and security measures.

---

Built with ❤️ for connecting diaspora communities with meaningful causes.