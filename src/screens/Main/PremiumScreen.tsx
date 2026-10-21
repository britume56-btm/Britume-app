
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Plan = "monthly" | "yearly";

export default function PremiumScreen() {
  const [selectedPlan, setSelectedPlan] =
    useState<Plan>("monthly");

  const [adUnlocked, setAdUnlocked] =
    useState(false);

  const [isPremium, setIsPremium] =
    useState(false);

  const colors = {
    background: "#080B16",
    card: "#11182B",
    blue: "#28A8FF",
    purple: "#9B5CFF",
    gold: "#FFD166",
    white: "#FFFFFF",
    muted: "#A8B1C7",
    border: "#263451",
  };

  const showAdMessage = () => {
    Alert.alert(
      "BRITUME Rewards",
      "Rewarded ads are not connected yet. Connect a supported advertising SDK before users can earn rewards."
    );
  };

  const showPurchaseMessage = () => {
    Alert.alert(
      "BRITUME Premium",
      "Purchases are not connected yet. Add Google Play Billing or a supported subscription SDK before accepting payments."
    );
  };

  const features = [
    "Exclusive BRITUME themes",
    "Advanced personalization",
    "Premium customization options",
    "Reduced ads where supported",
  ];

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colors.background },
      ]}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={colors.background}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>B</Text>
          </View>

          <Text style={styles.brand}>BRITUME</Text>
          <Text style={styles.heading}>PREMIUM</Text>

          <Text style={styles.subtitle}>
            More freedom. More creativity.
            {"\n"}More ways to make BRITUME yours.
          </Text>
        </View>

        <View
          style={[
            styles.heroCard,
            { borderColor: colors.purple },
          ]}
        >
          <Text style={styles.crown}>♛</Text>

          <Text style={styles.heroTitle}>
            Unlock your BRITUME
          </Text>

          <Text style={styles.description}>
            Discover exclusive themes, enhanced
            personalization, and premium benefits.
          </Text>

          {features.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.check}>✓</Text>
              <Text style={styles.featureText}>
                {feature}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          CHOOSE YOUR PLAN
        </Text>

        <TouchableOpacity
          accessibilityRole="radio"
          accessibilityState={{
            checked: selectedPlan === "monthly",
          }}
          onPress={() => setSelectedPlan("monthly")}
          style={[
            styles.planCard,
            selectedPlan === "monthly" &&
              styles.selectedPlan,
          ]}
        >
          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>
              Monthly Premium
            </Text>
            <Text style={styles.planDescription}>
              Flexible monthly membership
            </Text>
          </View>

          <View style={styles.radio}>
            {selectedPlan === "monthly" && (
              <View style={styles.radioInner} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="radio"
          accessibilityState={{
            checked: selectedPlan === "yearly",
          }}
          onPress={() => setSelectedPlan("yearly")}
          style={[
            styles.planCard,
            selectedPlan === "yearly" &&
              styles.selectedPlan,
          ]}
        >
          <View style={styles.planInfo}>
            <Text style={styles.planTitle}>
              Yearly Premium
            </Text>
            <Text style={styles.planDescription}>
              Annual membership
            </Text>
          </View>

          <View style={styles.radio}>
            {selectedPlan === "yearly" && (
              <View style={styles.radioInner} />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.premiumButton}
          onPress={showPurchaseMessage}
        >
          <Text style={styles.premiumButtonText}>
            {isPremium
              ? "PREMIUM ACTIVE"
              : "GET BRITUME PREMIUM"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          EARN THEMED REWARDS
        </Text>

        <View style={styles.rewardCard}>
          <Text style={styles.rewardIcon}>🎨</Text>

          <Text style={styles.rewardTitle}>
            Discover a new theme
          </Text>

          <Text style={styles.description}>
            Watch an optional rewarded ad to unlock
            eligible themes when available.
          </Text>

          {adUnlocked && (
            <Text style={styles.unlockedText}>
              Demo reward selected. No theme has
              actually been unlocked yet.
            </Text>
          )}

          <TouchableOpacity
            style={styles.rewardButton}
            onPress={showAdMessage}
          >
            <Text style={styles.rewardButtonText}>
              WATCH AD FOR A REWARD
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.adInfo}>
          <Text style={styles.adInfoTitle}>
            BRITUME AD EXPERIENCE
          </Text>

          <Text style={styles.adInfoText}>
            Selected video ads and optional theme
            rewards. Target 5–40 seconds where
            supported by the advertising provider.
            Actual durations depend on the ad format.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              "Restore purchases",
              "Purchase restoration will work after billing is integrated."
            )
          }
          style={styles.restoreButton}
        >
          <Text style={styles.restoreText}>
            Restore purchases
          </Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Subscriptions and ad rewards require
          verification before benefits are granted.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 26,
  },
  logo: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#FFD166",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoText: {
    color: "#FFD166",
    fontSize: 38,
    fontWeight: "900",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 5,
  },
  heading: {
    color: "#FFD166",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: 2,
  },
  subtitle: {
    color: "#A8B1C7",
    textAlign: "center",
    lineHeight: 23,
    marginTop: 10,
  },
  heroCard: {
    backgroundColor: "#11182B",
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    marginBottom: 28,
  },
  crown: {
    fontSize: 36,
    color: "#FFD166",
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 23,
    color: "#FFFFFF",
    fontWeight: "800",
    marginBottom: 10,
  },
  description: {
    color: "#A8B1C7",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  check: {
    color: "#28A8FF",
    fontSize: 19,
    fontWeight: "900",
    marginRight: 12,
  },
  featureText: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
  },
  sectionTitle: {
    color: "#A8B1C7",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 14,
  },
  planCard: {
    backgroundColor: "#11182B",
    borderWidth: 1,
    borderColor: "#263451",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedPlan: {
    borderColor: "#28A8FF",
    backgroundColor: "#12233B",
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  planDescription: {
    color: "#A8B1C7",
    marginTop: 6,
    fontSize: 13,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#28A8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#28A8FF",
  },
  premiumButton: {
    backgroundColor: "#FFD166",
    padding: 17,
    alignItems: "center",
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 30,
  },
  premiumButtonText: {
    color: "#11182B",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
  },
  rewardCard: {
    backgroundColor: "#11182B",
    borderColor: "#263451",
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: "flex-start",
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  rewardTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 10,
  },
  rewardButton: {
    width: "100%",
    backgroundColor: "#7448D9",
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    marginTop: 4,
  },
  rewardButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12,
  },
  unlockedText: {
    color: "#FFD166",
    marginBottom: 12,
    fontSize: 12,
  },
  adInfo: {
    marginTop: 22,
    padding: 16,
    backgroundColor: "#0D1322",
    borderRadius: 14,
  },
  adInfoTitle: {
    color: "#28A8FF",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  adInfoText: {
    color: "#A8B1C7",
    fontSize: 13,
    lineHeight: 20,
  },
  restoreButton: {
    alignItems: "center",
    padding: 16,
    marginTop: 8,
  },
  restoreText: {
    color: "#28A8FF",
    fontWeight: "700",
  },
  footer: {
    color: "#78839C",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 18,
    marginTop: 10,
  },
});
