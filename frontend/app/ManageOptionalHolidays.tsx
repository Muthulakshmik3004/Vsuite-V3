import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import API_BASE_URL from '../config';

interface Holiday {
  id: string;
  name: string;
  date: string;
  year: number;
  holiday_type: string;  // "optional" or "fixed"
}

const ManageOptionalHolidays = () => {
  const navigation = useNavigation();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState<'optional' | 'fixed'>('optional');
  const [activeTab, setActiveTab] = useState<'optional' | 'fixed'>('optional');

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      console.log('Fetching holidays from:', `${API_BASE_URL}/api/optional-holidays/`);
      const response = await fetch(`${API_BASE_URL}/api/optional-holidays/`);
       
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
       
      const data = await response.json();
      console.log('Holidays response:', data);
       
      if (data.holidays) {
        setHolidays(data.holidays);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      Alert.alert('Connection Error', 'Unable to connect to server. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddHoliday = async () => {
    if (!newHolidayName || !newHolidayDate) {
      Alert.alert('Error', 'Please enter holiday name and date');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/optional-holidays/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newHolidayName,
          date: newHolidayDate,
          holiday_type: holidayType
        })
      });

      const data = await response.json();
      if (response.ok) {
        Alert.alert('Success', `${holidayType === 'fixed' ? 'Fixed Company Holiday' : 'Optional Holiday'} added successfully`);
        setShowModal(false);
        setNewHolidayName('');
        setNewHolidayDate('');
        setHolidayType('optional');
        fetchHolidays();
      } else {
        Alert.alert('Error', data.error || 'Failed to add holiday');
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      Alert.alert('Error', 'Failed to add holiday');
    }
  };

  const handleDeleteHoliday = async (holiday: Holiday) => {
    const holidayLabel = holiday.holiday_type === 'fixed' ? 'Fixed Company Holiday' : 'Optional Holiday';
    Alert.alert(
      'Delete Holiday',
      `Are you sure you want to delete "${holiday.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/admin/optional-holidays/${holiday.id}/delete/`,
                { method: 'DELETE' }
              );
              const data = await response.json();
              if (response.ok) {
                Alert.alert('Success', `${holidayLabel} deleted successfully`);
                fetchHolidays();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete holiday');
              }
            } catch (error) {
              console.error('Error deleting holiday:', error);
              Alert.alert('Error', 'Failed to delete holiday');
            }
          }
        }
      ]
    );
  };

  const renderHolidayItem = (holiday: Holiday) => {
    const isFixed = holiday.holiday_type === 'fixed';
    return (
      <View key={holiday.id} style={[styles.holidayCard, isFixed && styles.fixedHolidayCard]}>
        <View style={styles.holidayInfo}>
          <View style={styles.holidayHeader}>
            <Text style={styles.holidayName}>{holiday.name}</Text>
            <View style={[styles.typeBadge, isFixed ? styles.fixedBadge : styles.optionalBadge]}>
              <Text style={[styles.typeBadgeText, isFixed ? styles.fixedBadgeText : styles.optionalBadgeText]}>
                {isFixed ? 'Fixed' : 'Optional'}
              </Text>
            </View>
          </View>
          <Text style={styles.holidayDate}>
            {new Date(holiday.date).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          {isFixed && (
            <Text style={styles.fixedHolidayNote}>
              ✅ Fully paid - No punch required - Not counted as absent
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteHoliday(holiday)}
        >
          <Text style={styles.deleteButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Filter holidays by active tab
  const filteredHolidays = holidays.filter(h => h.holiday_type === activeTab);

  return (
    <LinearGradient colors={['#ec407a', '#641b9a']} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'optional' && styles.activeTab]}
            onPress={() => setActiveTab('optional')}
          >
            <Text style={[styles.tabText, activeTab === 'optional' && styles.activeTabText]}>
              Optional
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'fixed' && styles.activeTab]}
            onPress={() => setActiveTab('fixed')}
          >
            <Text style={[styles.tabText, activeTab === 'fixed' && styles.activeTabText]}>
              Fixed
            </Text>
          </TouchableOpacity>
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Holiday</Text>
        </TouchableOpacity>

        {activeTab === 'optional' ? (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              ℹ️ Optional Holidays allow employees to take 2 optional leaves per year without affecting their salary.
              Employees need to apply for these holidays.
            </Text>
          </View>
        ) : (
          <View style={styles.infoBoxFixed}>
            <Text style={styles.infoTextFixed}>
              🏢 Fixed Company Holidays are paid holidays that don't require punch IN/OUT.
              {'\n'}• Fully paid - No salary deduction{'\n'}• No punch required{'\n'}• Not counted as absent{'\n'}• Auto-included in payroll
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>
          {activeTab === 'optional' ? 'Optional' : 'Fixed'} Holidays ({new Date().getFullYear()})
        </Text>

        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : filteredHolidays.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No {activeTab === 'optional' ? 'optional' : 'fixed'} holidays configured
            </Text>
            <Text style={styles.emptySubtext}>Click "+ Add" to create one</Text>
          </View>
        ) : (
          filteredHolidays.map(renderHolidayItem)
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Total {activeTab === 'optional' ? 'Optional' : 'Fixed'} Holidays: {filteredHolidays.length}
          </Text>
        </View>
      </ScrollView>

      {/* Add Holiday Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Add {holidayType === 'fixed' ? 'Fixed Company Holiday' : 'Optional Holiday'}
            </Text>

            {/* Holiday Type Selector */}
            <Text style={styles.inputLabel}>Holiday Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, holidayType === 'optional' && styles.typeOptionActive]}
                onPress={() => setHolidayType('optional')}
              >
                <Text style={[styles.typeOptionText, holidayType === 'optional' && styles.typeOptionTextActive]}>
                  Optional
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, holidayType === 'fixed' && styles.typeOptionActiveFixed]}
                onPress={() => setHolidayType('fixed')}
              >
                <Text style={[styles.typeOptionText, holidayType === 'fixed' && styles.typeOptionTextActive]}>
                  Fixed
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Holiday Name</Text>
            <TextInput
              style={styles.input}
              value={newHolidayName}
              onChangeText={setNewHolidayName}
              placeholder={holidayType === 'fixed' ? "e.g., Pongal, Diwali, Republic Day" : "e.g., Diwali, Eid, Christmas"}
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={newHolidayDate}
              onChangeText={setNewHolidayDate}
              placeholder="2026-01-14"
              placeholderTextColor="#999"
            />

            {holidayType === 'fixed' && (
              <View style={styles.fixedInfoBox}>
                <Text style={styles.fixedInfoText}>
                  💡 Fixed holidays will be automatically included in payroll calculations.
                  Employees don't need to punch or apply for leave on these days.
                </Text>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowModal(false);
                  setNewHolidayName('');
                  setNewHolidayDate('');
                  setHolidayType('optional');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddHoliday}
              >
                <Text style={styles.submitButtonText}>Add Holiday</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 16,
    marginVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ec407a',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a90e2',
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingTop: 5,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  infoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  infoBoxFixed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  infoText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  infoTextFixed: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#fff',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  holidayCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  fixedHolidayCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
    backgroundColor: '#f1f8e9',
  },
  holidayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  holidayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a237e',
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  optionalBadge: {
    backgroundColor: '#e3f2fd',
  },
  fixedBadge: {
    backgroundColor: '#c8e6c9',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionalBadgeText: {
    color: '#1976d2',
  },
  fixedBadgeText: {
    color: '#388e3c',
  },
  holidayDate: {
    fontSize: 14,
    color: '#444',
  },
  fixedHolidayNote: {
    fontSize: 12,
    color: '#2e7d32',
    marginTop: 4,
  },
  holidayInfo: {
    flex: 1,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  typeOptionActive: {
    borderColor: '#ec407a',
    backgroundColor: '#fce4ec',
  },
  typeOptionActiveFixed: {
    borderColor: '#4caf50',
    backgroundColor: '#e8f5e9',
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  typeOptionTextActive: {
    color: '#333',
  },
  fixedInfoBox: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  fixedInfoText: {
    fontSize: 12,
    color: '#2e7d32',
    lineHeight: 18,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4a90e2',
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ManageOptionalHolidays;
