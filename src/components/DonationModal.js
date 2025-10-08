import React, { useState, useEffect } from "react";
import { useStripe } from "@stripe/stripe-react-native";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCurrency } from "../utils/formatters";

const DonationModal = ({ visible, charity, onClose, onDonate }) => {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplePaySupported, setIsApplePaySupported] = useState(false);

  const { initPaymentSheet, presentPaymentSheet, isPlatformPaySupported } = useStripe();

  const presetAmounts = [25, 50, 100, 250, 500];

  // Check Apple Pay support on component mount
  useEffect(() => {
    const checkApplePaySupport = async () => {
      try {
        if (Platform.OS === 'ios' && isPlatformPaySupported) {
          const supported = await isPlatformPaySupported({
            applePay: {
              merchantCountryCode: 'US',
              currencyCode: 'USD',
            },
          });
          setIsApplePaySupported(supported);
        }
      } catch (error) {
        console.log('Apple Pay check failed:', error);
        setIsApplePaySupported(false);
      }
    };

    if (visible) {
      checkApplePaySupport();
    }
  }, [visible, isPlatformPaySupported]);

  const handlePresetAmount = (presetAmount) => {
    setAmount(presetAmount.toString());
  };

  const API_URL = "http://172.20.50.39:3000"; // Replace with your backend URL

  // Handle Apple Pay (simplified version)
  const handleApplePay = async () => {
    Alert.alert(
      "Apple Pay", 
      "Apple Pay integration is being updated. Please use card payment for now.",
      [{ text: "OK", onPress: () => handleCardPayment() }]
    );
  };

  // Handle Card Payment
  const handleCardPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid donation amount.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/create-payment-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: parseFloat(amount) * 100,
          payment_method_types: ['card']
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create payment intent');
      }
      
      const { client_secret } = await response.json();

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: "CharitEase",
        paymentIntentClientSecret: client_secret,
        style: 'alwaysDark',
        appearance: {
          primaryButton: {
            colors: {
              background: '#3B82F6',
            },
          },
        },
      });

      if (initError) {
        Alert.alert("Error", "Could not initialize payment sheet.");
        return;
      }

      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code !== "Canceled") {
          Alert.alert("Payment Failed", paymentError.message);
        }
      } else {
        Alert.alert("Success", "Your donation was successful!");
        onDonate(parseFloat(amount), message || `Donation to ${charity.name}`);
        handleClose();
      }
    } catch (error) {
      console.error("Card payment failed:", error);
      Alert.alert("Error", "Payment failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Show payment method selection
  const handlePaymentMethodSelection = () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid donation amount.");
      return;
    }

    const paymentOptions = [];

    // Always show Apple Pay option on iOS (will redirect to card if not available)
    if (Platform.OS === 'ios') {
      paymentOptions.push({
        text: '🍎 Pay with Apple Pay',
        onPress: handleApplePay,
      });
    }

    paymentOptions.push({
      text: '💳 Pay with Card',
      onPress: handleCardPayment,
    });

    paymentOptions.push({
      text: 'Cancel',
      style: 'cancel',
    });

    Alert.alert(
      "Choose Payment Method",
      `Select how you'd like to donate ${formatCurrency(parseFloat(amount))}`,
      paymentOptions
    );
  };
  const handleClose = () => {
    setAmount("");
    setMessage("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Donate to {charity?.name}</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          {/* Charity Info */}
          {charity && (
            <View style={styles.charityInfo}>
              <Text style={styles.charityName}>{charity.name}</Text>
              <Text style={styles.charityCategory}>
                {charity.category} • {charity.country}
              </Text>
            </View>
          )}

          {/* Amount Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Donation Amount</Text>

            {/* Preset Amounts */}
            <View style={styles.presetContainer}>
              {presetAmounts.map((presetAmount) => (
                <TouchableOpacity
                  key={presetAmount}
                  style={[
                    styles.presetButton,
                    amount === presetAmount.toString() &&
                      styles.presetButtonSelected,
                  ]}
                  onPress={() => handlePresetAmount(presetAmount)}
                >
                  <Text
                    style={[
                      styles.presetText,
                      amount === presetAmount.toString() &&
                        styles.presetTextSelected,
                    ]}
                  >
                    {formatCurrency(presetAmount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Amount */}
            <View style={styles.customAmountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a message to your donation..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Donate Button */}
          <TouchableOpacity
            style={[
              styles.donateButton,
              isProcessing && styles.donateButtonDisabled,
            ]}
            onPress={handlePaymentMethodSelection}
            disabled={isProcessing}
          >
            <Text style={styles.donateButtonText}>
              {isProcessing
                ? "Processing..."
                : `Donate ${
                    amount ? formatCurrency(parseFloat(amount)) : "$0"
                  }`}
            </Text>
          </TouchableOpacity>

          {/* Security Note */}
          <Text style={styles.securityNote}>
            🔒 Your donation is secure and will be processed immediately
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  charityInfo: {
    alignItems: "center",
    marginBottom: 32,
  },
  charityName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  charityCategory: {
    fontSize: 14,
    color: "#6B7280",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  presetContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  presetButtonSelected: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  presetText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  presetTextSelected: {
    color: "#FFFFFF",
  },
  customAmountContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    paddingVertical: 16,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#F9FAFB",
    textAlignVertical: "top",
  },
  donateButton: {
    backgroundColor: "#3B82F6",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  donateButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  donateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  securityNote: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
});

export default DonationModal;
