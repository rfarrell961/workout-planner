import {
	StyleSheet,
	Button,
	Text,
	Image,
    TextInput,
	View,
    TouchableOpacity,
    Alert
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import { Icon } from 'react-native-elements';
import { useGlobalState } from "../GlobalState.js";
import API_Instance from "../../backend/axios_instance";
import * as SecureStore from 'expo-secure-store';
import { AuthContext } from '../AuthProvider';
import { useIsFocused } from "@react-navigation/native";

const text_field_width = '80%';


// TO DO: Handle Various Naming Errors
export default function SettingsPage({ navigation }) 
{
    const { isLoggedIn, setIsLoggedIn } = React.useContext(AuthContext);
    const [globalState, updateGlobalState] = useGlobalState();
    const [editFirstName, setEditFirstName] = useState(false);
    const [editLastName, setEditLastName] = useState(false);
    const [editEmail, setEditEmail] = useState(false);
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [userMessage, setUserMessage] = useState("");
    const isFocused = useIsFocused();

    useEffect(() => {
        setFirstName("");
        setLastName("");
        setEmail("");
        setUserMessage("");
	}, [editFirstName, editLastName, editEmail])

    useEffect(() => {
        let email = "";
        if (isFocused)
        {
            API_Instance.get(`users/${globalState.user._id}`, {
                headers: {
                    'authorization': `BEARER ${globalState.authToken}`
                }
            })
            .then((response) => {
                let tmp = {...globalState.user};
                tmp.email = response.data.email;
                updateGlobalState("user", tmp);
            })
            .catch((error) => {
                console.log(error);
                Alert.alert("There was an error retrieving the email")
            })
        }
    }, [isFocused]);

    function updateFirstName() 
    {
        if (firstName == globalState.user.firstName || firstName == '')
        {
            return;
        }
        
        API_Instance
        .patch(`users/${globalState.user._id}/contact`, {
            firstName: firstName
        },
        {
          headers: {
            Authorization : `Bearer ${globalState.authToken}`,
          },
        })
        .then((response) => 
        {
            if (response.status == 200) {
                setEditFirstName(false);     
                updateGlobalState("user", response.data);
            }
        })
        .catch((error) => {
            setUserMessage(error.response.data.errors.firstName.message);
        });
    }

    function updateLastName()
    {
        if (lastName == globalState.user.lastName || lastName == '')
        {
            return;
        }

        
        API_Instance
        .patch(`users/${globalState.user._id}/contact`, {
            lastName: lastName
        },
        {
          headers: {
            Authorization : `Bearer ${globalState.authToken}`,
          },
        })
        .then((response) => 
        {
            
            if (response.status == 200) {
                updateGlobalState("user", response.data);
            }
        })
        .catch((error) => {
            setUserMessage(error.response.data.errors.lastName.message);
        });
    }

    function updateEmail()
    {
        if (email == globalState.user.email || email == '')
        {
            return;
        }

        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))
        {
            Alert.alert('Email is not valid');
        }

        API_Instance
        .post(`users/emailreset/send/to`, {
            firstName: globalState.user.firstName,
            lastName: globalState.user.lastName,
            email: email,
            id: globalState.user._id
        }).then((result) => {
            Alert.alert(`An email is being sent to ${email}`); 
        }).catch((error) => {
            if (error.response.status === 502)
            {
                Alert.alert(`${email} Already has an account associated with it`);
                //setUserMessage('');
            }
            else if (error.response.status === 506)
            {
                Alert.alert(`Email could not send to ${email}`);
            }
        })


        setUserMessage(`A confirmation email has been sent to $asdf@asdf{email}`);
    }

    function handleResetPassword()
    {
        try
        {
            API_Instance
            .post(`users//forgotpassword/email/send/to`, {
                email: globalState.user.email,
            })
        }
        catch(error)
        {
            if (error.response.status === 502)
            {
                Alert.alert(`${globalState.user.email} Already has an account associated with it`);
                setUserMessage('');
            }
        } 

        setUserMessage(`A Password reset email has been sent to ${globalState.user.email}`);
    }

    function deleteAccount()
    {
        API_Instance
        .delete(`users/${globalState.user._id}`,{
          headers: {
            Authorization : `Bearer ${globalState.authToken}`,
          },
        })
        .then((response) => 
        {
            if (response.status == 200) {
                updateGlobalState("authToken", null);
                updateGlobalState("user", null);
                SecureStore.deleteItemAsync("authKey");
                SecureStore.deleteItemAsync("userId");
                setIsLoggedIn(false);
            }
        })
        .catch((error) => {
            console.log(error)
            console.log(error.response);
            Alert.alert('An error occurred');
        });
    }

    function handleDeleteAccount()
    {
        Alert.alert( 'Are you sure?','',
        [{
            text: 'Yes',
            onPress: () => {
                deleteAccount();
            },
        },
        {
            text: 'No',
        }],
        { cancelable: false});
    }

    if (globalState.user == null)
    {
        return (<></>);
    }
    return(
        <View style={styles.container}>
            <View style={styles.contentArea}>
                <View style={{flex: 1, width: '90%', alignItems: 'flex-start'}}>
                    <Text style={styles.text}>First Name:{"\t\t"}</Text>
                    <View style={styles.rowView}>
                        {!editFirstName && 
                        <Text style={styles.text2}>{globalState.user.firstName}</Text>}
                        {editFirstName && 
                        <TextInput style={styles.inputfield}
                        placeholder={globalState.user.firstName}
                        placeholderTextColor={"#808080"}
                        onChangeText={(text) => setFirstName(text)}
                        autoComplete='off'
                        autoCorrect={false}
                        autoFocus
                        />}
                        {!editFirstName && <TouchableOpacity
                            onPress={() => {
                            setEditFirstName(true);
                            }}>
                            <Icon
                                name='edit'
                                type='material'/>
                        </TouchableOpacity>}
                        {editFirstName && <View style={{flexDirection: 'row'}}>
                             <TouchableOpacity
                                onPress={() => {
                                    updateFirstName();
                                    setEditFirstName(false);
                                }}
                                style={{marginRight: 10}}> 
                                <Icon
                                    name='done'
                                    type='material'/>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setEditFirstName(!editFirstName)}>
                                    <Icon
                                    name='close'
                                    type='material'/>
                            </TouchableOpacity>
                        </View> }
                    </View>
                
                    <Text style={styles.text}>Last Name:{"\t\t"}</Text>
                    <View style={styles.rowView}>  
                        {!editLastName && 
                        <Text style={styles.text2}>{globalState.user.lastName}</Text>}
                        {editLastName && 
                        <TextInput style={styles.inputfield}
                        placeholder={globalState.user.lastName}
                        placeholderTextColor={"#808080"}
                        onChangeText={(text) => setLastName(text)}
                        autoComplete='off'
                        autoCorrect={false}
                        autoFocus
                        />}
                        {!editLastName && <TouchableOpacity
                            onPress={() => setEditLastName(true)}>
                            <Icon
                                name='edit'
                                type='material'/>
                        </TouchableOpacity>}
                        {editLastName && <View style={{flexDirection: 'row'}}>
                            <TouchableOpacity
                                onPress={() => {
                                    updateLastName();
                                    setEditLastName(false);
                                }}
                                style={{marginRight: 10}}> 
                                <Icon
                                    name='done'
                                    type='material'/>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setEditLastName(!editLastName)}>
                                    <Icon
                                    name='close'
                                    type='material'/>
                            </TouchableOpacity>
                        </View>}
                    </View>

                    <Text style={styles.text}>Email: {"\t\t\t"}</Text>
                    <View style={styles.rowView}>      
                        {!editEmail && 
                        <Text style={styles.text2}>{globalState.user.email}</Text>}
                        {editEmail && 
                        <TextInput style={styles.inputfield}
                        placeholder={globalState.user.email}
                        placeholderTextColor={"#808080"}
                        onChangeText={(text) => setEmail(text)}
                        autoCapitalize='none'
                        autoComplete='off'
                        autoCorrect={false}
                        autoFocus
                        />}
                        {!editEmail && <TouchableOpacity
                            onPress={() => setEditEmail(true)}>
                            <Icon
                                name='edit'
                                type='material'/>
                        </TouchableOpacity>}
                        {editEmail && <View style={{flexDirection: 'row'}}>
                            <TouchableOpacity
                                onPress={() => {
                                    updateEmail();
                                    setEditEmail(false);
                                }}
                                style={{marginRight: 10}}> 
                                <Icon
                                    name='done'
                                    type='material'/>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setEditEmail(!editEmail)}>
                                    <Icon
                                    name='close'
                                    type='material'/>
                            </TouchableOpacity>
                        </View>}
                    </View>
                </View>

                <View style={styles.belowFieldView}>
                    <Text style={styles.text3}>{userMessage}</Text>
                    <Button
                        title="Reset Password"
                        onPress={() => handleResetPassword()}
                    />
                </View>
            </View>
            <View style={styles.bottomView}>
                <Button 
                    color = "red"
                    title="Delete Account"
                    style={styles.deleteButton}
                    onPress={() => handleDeleteAccount()}/>
            </View>
        </View>
    );
}

styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    rowView: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomColor:'black',
        borderBottomWidth: .4,
        justifyContent: 'space-between',
        width: '100%',
        marginVertical: 10,
        // borderWidth: 2
    },
    contentArea: {
        marginTop: '10%',
        alignItems: 'center',
        flex: 1
    },
    text: {
        fontWeight: 'bold',
        fontSize: 20,
        marginRight: 10,
    },
    text2: {
        fontSize: 16,
        marginRight: 10,
        width: text_field_width,
        marginBottom: 5,
        paddingVertical: 8,
        marginLeft: 5,
    },
    inputfield: {
		borderWidth: 1,
		borderColor: "#C4C4C4",
		width: text_field_width,
		paddingVertical: 8,
        paddingLeft: 10,
		marginBottom: 5,
        marginRight: 10
    },
    bottomView: {
        flex: .2,
        justifyContent: 'flex-end',
        marginBottom: 100
    },
    belowFieldView: {
        marginTop: 10, 
        width: '100%',
        alignItems: 'center',
        flex: .2,
        // borderWidth: 2,
    },
    text3: {
        fontSize: 12
    }
});