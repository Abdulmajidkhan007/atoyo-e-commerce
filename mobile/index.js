/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import {name as appName} from './app.json';

// Ilova fonda yoki yopiq bo'lganda kelgan push xabari. Bildirishnomani
// Android o'zi ko'rsatadi - bu yerda faqat xatolik chiqmasligi uchun
// ishlov beruvchi ro'yxatdan o'tkaziladi.
messaging().setBackgroundMessageHandler(async () => {});

AppRegistry.registerComponent(appName, () => App);
