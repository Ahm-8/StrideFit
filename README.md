# StrideFit

A modern fitness tracking application built with React Native and Expo, featuring AI-powered meal tracking, workout logging, and activity monitoring.


## ✨ Features

### Workout Tracking 🏋️‍♂️
- Log exercises with sets, reps, and weights
- Track personal bests and progress
- Intensity rating system
- Visual progress charts
- Workout history

### AI-Powered Meal Tracking 🍳
- Photo-based meal logging
- Automatic calorie and macro calculation
- Daily nutrition summaries
- Meal history with images


### Activity Monitoring 📊
- Step counting
- Distance tracking
- Daily goals


### User Experience 🎨
- Dark theme optimized
- Accessibility features
- Secure authentication
- Cross-platform compatibility

## 🚀 Getting Started

### Prerequisites

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (v18.20.0 or later)
brew install node

# Install Expo CLI
npm install -g expo-cli
```

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/StrideFit.git
cd StrideFit

# Install dependencies
yarn install


### Running the App

```bash
# Start the development server
yarn start

# Run on iOS
yarn ios

# Run on Android
yarn android

# Build APK
eas build -p android --profile preview
```


## 🛠 Tech Stack

- **Frontend**: React Native, Expo
- **Backend**: Supabase
- **AI Services**: Google AI Vision
- **Storage**: AsyncStorage, Supabase Storage
- **Navigation**: React Navigation
- **Charts**: React Native SVG, React Native Chart Kit
- **Sensors**: Expo Sensors

## 📱 Building for Production

### Android

```bash
# Configure EAS
eas build:configure

# Build APK
eas build -p android --profile preview
```

### iOS

```bash
# Build for iOS
eas build -p ios --profile preview
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

