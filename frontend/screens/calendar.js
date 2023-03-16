import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import API_Instance from "../../backend/axios_instance";
import moment from 'moment';
import {useGlobalState} from '../GlobalState.js';

const CalendarScreen = ({}) => {
    const [globalState, updateGlobalState] = useGlobalState();
    const [weeklyEvents, setWeeklyEvents] = useState({});
  
    const fetchEvents = async () => {
      try {
        const response = await API_Instance.get(`users/${globalState.user._id}/calendar/all`, {
          headers: {
            'authorization': `Bearer ${globalState.authToken}`,
          },
        });
        console.log("My workouts are", response.data.workouts);
        const formattedEvents = formatEvents(response.data.workouts);
        setWeeklyEvents(formattedEvents);
      } catch (error) {
        console.error(error);
        if (error.response && error.response.status === 403) {
          Alert.alert('Failed to authenticate you');
        }
        setWeeklyEvents({});
      }
    };
  
    useEffect(() => {
      fetchEvents();
    }, []);
  
    //changes date to yyyy-mm-dd
    const formatEvents = (events) => {
      const formattedEvents = {};
      events.forEach((event) => {
        const date = moment(event.scheduledDate || event.dateOfCompletion).format('YYYY-MM-DD');
        if (!formattedEvents[date]) {
          formattedEvents[date] = [];
        }
        formattedEvents[date].push(event);
      });
      return formattedEvents;
    };
  
    const handleDayPress = (day) => {
      const formattedDate = moment(day.dateString).format('YYYY-MM-DD');
      if (weeklyEvents[formattedDate]) {
        const events = weeklyEvents[formattedDate];
        setEvents(events);
        setSelectedDate(formattedDate);
      } else {
        setEvents([]);
        setSelectedDate(formattedDate);
      }
    };
  
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');

    const renderItem = ({ item }) => (
      <View style={styles.myExercise}>
          <Text style={{ fontWeight: 'bold' }}>{item.title} - {item.ownerName} </Text>
          <Text>Location: {item.location}</Text>
      </View>
    );
  
    return (
      <View style ={styles.container}>
        <Calendar 
          onDayPress={handleDayPress} 
          markedDates={weeklyEvents} 
        />
      
        {selectedDate !== '' && 
          <Text style={styles.Title}>
            {moment(selectedDate).format('MMMM D, YYYY')}
          </Text>
        }

        <FlatList 
          data={events} 
          renderItem={renderItem} 
          keyExtractor={(item, index) => `${item._id}_${item.scheduledDate || item.dateOfCompletion}_${index}`}
        />
      </View>
    );
  };
  

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  Title:{
    fontFamily: 'HelveticaNeue-Bold',
    color: '#2B2B2B',
    fontSize: 24,
    textAlign: 'left',
    padding: 10,
},
  myExercise:{
    backgroundColor: '#DDF2FF',
    padding: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  friendExercise:{
    backgroundColor: '#F1F3FA',
    padding: 20,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderRadius: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  }
});

export default CalendarScreen;