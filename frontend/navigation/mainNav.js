import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeNav from './homeNav.js';
import CreateWorkoutNav from "./createWorkoutNav.js";
import StartWorkoutNav from "./startWorkoutNav.js";
import HomeHeader from "../component/homeHeader.js";

const Stack = createNativeStackNavigator();

export default function MainNav() {
	return (
        <Stack.Navigator initialRouteName="Home">
            <Stack.Screen
                name="Home"
                component={HomeNav}
                options={{ header: HomeHeader }}
            />
            <Stack.Screen
                name="createNav"
                component={CreateWorkoutNav}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="startNav"
                component={StartWorkoutNav}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
	);
}