/**
 * @format
 */

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './src/App';
import {name as appName} from './app.json';
import {refreshOrderWidgetFromPush} from './src/widgets';

// Ilova fonda yoki yopiq bo'lganda kelgan push xabari. Bildirishnomani
// Android o'zi ko'rsatadi - bu yerda "Mening buyurtmam" widget'i
// yangilanadi (aynan shu holatda foydalanuvchi ilovani ochmasligi
// mumkin, widget esa yangi holatni darhol ko'rsatadi).
messaging().setBackgroundMessageHandler(async remoteMessage => {
  await refreshOrderWidgetFromPush(remoteMessage.data?.orderId);
});

AppRegistry.registerComponent(appName, () => App);
