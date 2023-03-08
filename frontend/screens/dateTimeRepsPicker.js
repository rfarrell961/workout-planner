import {
	StyleSheet,
	Button,
	TouchableOpacity,
	Text,
	Image,
	View,
	SafeAreaView,
	TextInput,
	FlatList,
} from "react-native";
import React from "react";
import Workouts from "./workout.js";
import { useGlobalState } from "../../GlobalState.js";
import { useNavigation } from "@react-navigation/native";
import API_Instance from "../../backend/axios_instance.js";

export default function DateTimeRepsPicker(props) {
	const [globalState, updateGlobalState] = useGlobalState();
	const navigation = useNavigation();

	function addWorkoutToUser(workout) {
		API_Instance
			.post("/:" + globalState.user.id, {
				scheduledWorkouts: globalState.workout,
			})
			.then((response) => {
				if (response.status === 200) {
					navigation.navigate("home");
				}
			});
	}

	return (
		<SafeAreaView style={styles.Background}>
			<Text style={styles.HeaderText}>When will this workout be?</Text>
			{/* This is where the Integration to the Calendar Page will go */}
			<Text style={styles.HeaderText}>Where are you going to be working out?</Text>
			{/* Integeration with Google Maps API will be here */}
			<TextInput placeholder="Planet Fitness" onChangeText={(val)=>{globalState.workout[0].location = val}}/>
			<Text style={styles.HeaderText}>Will this workout be reoccurring?</Text>
			{/* Button to change it to true */}
			<Text style={styles.HeaderText}>How long will this workout take?(in min)</Text>
			<TextInput keyboardType="number-pad" placeholder="60 min" onChangeText={(val)=>{globalState.workout[0].duration = Number(val)}}/>
			<Workouts
				data={globalState.workout}
				showButton={false}
				showInput={true}
			/>
			<Button
				onPress={() => {
					// addWorkoutToUser();
					navigation.navigate("home");
					updateGlobalState("workoutScheduled", globalState.workout);
				}}
				title="Add Workout"
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	addWorkoutBttn: {
		flexDirection: "row",
		backgroundColor: "#F1F3FA",
		margin: 30,
		padding: 15,
	},
	Background: {
		backgroundColor: "white",
		flex: 1,
	},
	HeaderText: {
		fontSize: 16,
    	fontWeight: 'bold',
	},
});
