import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Screens
import Home from "./vdesk/home";
import Dashboard from "./vdesk/Dashboard";
import Bookingservice from "./vdesk/Bookingservice";
import Staff from "./vdesk/staff";
import DueReminder from "./vdesk/DueReminderScreen";
import UploadExcel from "./vdesk/UploadExcel";
import ExportScreen from "./vdesk/ExportScreen";
import CustomerDetails from "./vdesk/customerdetails";
import ProductPage from "./vdesk/ProductPage";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="home" component={Home} />
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="Bookingservice" component={Bookingservice} />
      <Stack.Screen name="Staff" component={Staff} />
      <Stack.Screen name="DueReminder" component={DueReminder} />
      <Stack.Screen name="UploadExcel" component={UploadExcel} />
      <Stack.Screen name="ExportScreen" component={ExportScreen} />
      <Stack.Screen name="CustomerDetails" component={CustomerDetails} />
      <Stack.Screen name="ProductPage" component={ProductPage} />
    </Stack.Navigator>
  );
}
