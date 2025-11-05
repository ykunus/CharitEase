// DonationModal.js - Updated for Stripe Connect

// Update the API call to include charity account info
const handleCardPayment = async () => {
  if (!amount || parseFloat(amount) <= 0) {
    Alert.alert("Invalid Amount", "Please enter a valid donation amount.");
    return;
  }

  setIsProcessing(true);

  try {
    // Check if charity has completed Stripe onboarding
    if (!charity.stripe_onboarding_complete) {
      Alert.alert(
        "Setup Required", 
        `${charity.name} is still setting up their payment account. Please try again later.`,
        [{ text: "OK" }]
      );
      return;
    }

    const response = await fetch(`${API_URL}/create-donation-with-destination`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        amount: parseFloat(amount) * 100,
        charityAccountId: charity.stripe_account_id,
        platformFeePercent: 2.5, // Optional: 2.5% platform fee
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }
    
    const { client_secret, platform_fee, charity_amount } = await response.json();

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
      // Show breakdown of payment
      Alert.alert(
        "Success!", 
        `Your donation was successful!\n\n` +
        `Total: ${formatCurrency(parseFloat(amount))}\n` +
        `To ${charity.name}: ${formatCurrency(charity_amount / 100)}\n` +
        `Platform fee: ${formatCurrency(platform_fee / 100)}`
      );
      
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