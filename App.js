import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Provider as PaperProvider, Text, TextInput, Button, List, Divider } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SQLite from 'expo-sqlite';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

const Stack = createNativeStackNavigator();

const initialRegion = {
  latitude: 20,
  longitude: 0,
  latitudeDelta: 100,
  longitudeDelta: 100
};

function PlacesScreen({ navigation, db }) {
  const [address, setAddress] = useState('');
  const [addresses, setAddresses] = useState([]);

  const loadAddresses = async () => {
    try {
      const result = await db.getAllAsync(
        'SELECT * FROM addresses ORDER BY id DESC'
      );
      setAddresses(result);
    } catch (error) {
      Alert.alert('Error', 'Could not load addresses.');
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const saveAddress = async () => {
    const newAddress = address.trim();

    if (!newAddress) {
      Alert.alert('Notice', 'Please enter an address.');
      return;
    }

    try {
      await db.runAsync(
        'INSERT INTO addresses (address) VALUES (?)',
        newAddress
      );

      setAddress('');
      loadAddresses();
    } catch (error) {
      Alert.alert('Error', 'Could not save the address.');
    }
  };

  const deleteAddress = (item) => {
    Alert.alert(
      'Delete address',
      'Do you want to delete this address?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync(
                'DELETE FROM addresses WHERE id = ?',
                item.id
              );
              loadAddresses();
            } catch (error) {
              Alert.alert('Error', 'Could not delete the address.');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.heading}>
        My Places
      </Text>

      <Divider />

      <Text variant="labelMedium" style={styles.label}>
        Place finder
      </Text>

      <TextInput
        mode="outlined"
        label="Type an address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />

      <Button
        mode="contained"
        onPress={saveAddress}
        style={styles.saveButton}
        contentStyle={styles.buttonContent}
      >
        Save
      </Button>

      <Divider style={styles.divider} />

      <Text variant="titleMedium" style={styles.listHeading}>
        Saved addresses
      </Text>

      <ScrollView>
        {addresses.length === 0 ? (
          <Text style={styles.emptyText}>
            No saved addresses yet.
          </Text>
        ) : (
          addresses.map((item) => (
            <View key={item.id}>
              <List.Item
                title={item.address}
                description="Show on map"
                right={(props) => (
                  <List.Icon {...props} icon="chevron-right" />
                )}
                onPress={() =>
                  navigation.navigate('Map', {
                    address: item.address
                  })
                }
                onLongPress={() => deleteAddress(item)}
              />
              <Divider />
            </View>
          ))
        )}
      </ScrollView>

      <Text style={styles.hint}>
        Press an address to show it on the map.
        Press and hold to delete it.
      </Text>
    </View>
  );
}

function MapScreen({ route }) {
  const { address } = route.params;
  const [coordinate, setCoordinate] = useState(null);
  const [region, setRegion] = useState(initialRegion);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const findAddress = async () => {
      try {
        const result = await Location.geocodeAsync(address);

        if (result.length > 0) {
          const location = {
            latitude: result[0].latitude,
            longitude: result[0].longitude
          };

          setCoordinate(location);

          setRegion({
            ...location,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015
          });
        } else {
          Alert.alert(
            'Address not found',
            'The address could not be found on the map.'
          );
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'Could not find the address.'
        );
      } finally {
        setLoading(false);
      }
    };

    findAddress();
  }, [address]);

  return (
    <View style={styles.mapContainer}>
      <Text variant="titleMedium" style={styles.mapTitle}>
        {address}
      </Text>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#6750A4" />
          <Text>Loading map...</Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          region={region}
        >
          {coordinate && (
            <Marker
              coordinate={coordinate}
              title={address}
              description="Selected location"
            />
          )}
        </MapView>
      )}
    </View>
  );
}

export default function App() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const database = await SQLite.openDatabaseAsync(
          'osoitekirja.db'
        );

        await database.execAsync(`
CREATE TABLE IF NOT EXISTS addresses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
address TEXT NOT NULL
);
`);

        setDb(database);
      } catch (error) {
        Alert.alert(
          'Database error',
          'Could not initialize the database.'
        );
      }
    };

    initializeDatabase();
  }, []);

  if (!db) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#5a5a5a" />
        <Text>Loading application...</Text>
      </View>
    );
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Places"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#FFFFFF'
            },
            headerTintColor: '#252525',
            headerTitleStyle: {
              fontWeight: 'bold'
            }
          }}
        >
          <Stack.Screen
            name="Places"
            options={{
              title: 'My Places'
            }}
          >
            {(props) => (
              <PlacesScreen {...props} db={db} />
            )}
          </Stack.Screen>

          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              title: 'Map'
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 18
  },
  heading: {
    fontWeight: 'bold',
    marginBottom: 16
  },
  label: {
    color: '#5a5a5a',
    marginTop: 22,
    marginBottom: 8,
    fontWeight: 'bold'
  },
  input: {
    backgroundColor: '#FFFFFF'
  },
  saveButton: {
    marginTop: 12,
    borderRadius: 4,
    backgroundColor: '#5a5a5a'
  },
  buttonContent: {
    height: 46
  },
  divider: {
    marginTop: 22,
    marginBottom: 16
  },
  listHeading: {
    fontWeight: 'bold',
    marginBottom: 8
  },
  emptyText: {
    color: '#777777',
    textAlign: 'center',
    marginTop: 30
  },
  hint: {
    color: '#888888',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  mapTitle: {
    padding: 16,
    fontWeight: 'bold'
  },
  map: {
    flex: 1
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  }
});