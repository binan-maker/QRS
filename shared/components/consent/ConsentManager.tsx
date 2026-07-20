// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT MANAGER - DPDP Act 2023 Compliance Component
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Modal, ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { ConsentStatus, DEFAULT_CONSENT, db, logAuditEvent } from "./consent-manager-types";
import { ConsentOption } from "./ConsentOption";
import { styles } from "./consent-manager-styles";
import { COLLECTIONS } from "@/shared/constants/collections";

interface ConsentManagerProps {
  visible: boolean;
  onComplete: () => void;
  isRequired?: boolean;
}

export const ConsentManager: React.FC<ConsentManagerProps> = ({
  visible,
  onComplete,
  isRequired = false,
}) => {
  const { user } = useAuth();
  const [consent, setConsent] = useState<ConsentStatus>(DEFAULT_CONSENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadExistingConsent();
    } else if (!user) {
      setLoading(false);
    }
  }, [visible, user]);

  async function loadExistingConsent() {
    try {
      if (!user) return;
      const consentData = await db.get([COLLECTIONS.USERS, user.id, "consent"]);
      if (consentData) {
        setConsent({ ...DEFAULT_CONSENT, ...consentData });
      } else {
        setConsent(DEFAULT_CONSENT);
      }
    } catch (error) {
      console.error("[consent] Failed to load consent:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConsent() {
    if (!user) return;
    setSaving(true);
    try {
      const updatedConsent = { ...consent, lastUpdated: new Date().toISOString() };
      await db.set([COLLECTIONS.USERS, user.id, "consent"], updatedConsent);
      await logAuditEvent(
        consent.scanHistory ? "consent_given" : "consent_withdrawn",
        user.id,
        { metadata: { consentType: "scan_history", granted: consent.scanHistory }, actionResult: "success" }
      );
      onComplete();
    } catch (error) {
      console.error("[consent] Failed to save consent:", error);
      alert("Failed to save consent. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleConsent(key: keyof Omit<ConsentStatus, "lastUpdated">) {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!visible) return null;

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading your preferences...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Privacy Choices</Text>
            <Text style={styles.headerSubtitle}>
              We respect your privacy. Choose how we process your data.
            </Text>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <ConsentOption title="Age Verification" description="I confirm that I am 18 years or older, or have parental consent" enabled={consent.ageVerified} onToggle={() => toggleConsent("ageVerified")} required icon="🎂" />
            <ConsentOption title="Terms of Service" description="I have read and agree to the Terms of Service" enabled={consent.termsAccepted} onToggle={() => toggleConsent("termsAccepted")} required icon="📄" />
            <ConsentOption title="Privacy Policy" description="I have read and agree to the Privacy Policy" enabled={consent.privacyPolicyAccepted} onToggle={() => toggleConsent("privacyPolicyAccepted")} required icon="🔒" />
            <ConsentOption title="Camera Access" description="Allow BinRo to scan QR codes using your camera" enabled={consent.camera} onToggle={() => toggleConsent("camera")} required={isRequired} icon="📷" />
            <ConsentOption title="Gallery Access" description="Allow BinRo to scan QR codes from your photo gallery" enabled={consent.gallery} onToggle={() => toggleConsent("gallery")} icon="🖼️" />
            <ConsentOption title="Scan History" description="Save your scan history for future reference (can be deleted anytime)" enabled={consent.scanHistory} onToggle={() => toggleConsent("scanHistory")} icon="📜" />
            <ConsentOption title="Notifications" description="Send you alerts about QR code updates and security warnings" enabled={consent.notifications} onToggle={() => toggleConsent("notifications")} icon="🔔" />
            <ConsentOption title="Analytics" description="Help us improve by collecting anonymous usage statistics" enabled={consent.analytics} onToggle={() => toggleConsent("analytics")} icon="📊" />
            <ConsentOption title="Marketing" description="Receive updates about new features and promotions" enabled={consent.marketing} onToggle={() => toggleConsent("marketing")} icon="📢" />
          </ScrollView>

          {isRequired && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Required consents must be accepted to use BinRo.
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!isRequired && (
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onComplete} disabled={saving}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.button, styles.saveButton,
                (!consent.ageVerified || !consent.termsAccepted || !consent.privacyPolicyAccepted) && styles.disabledButton,
              ]}
              onPress={saveConsent}
              disabled={saving || !consent.ageVerified || !consent.termsAccepted || !consent.privacyPolicyAccepted}
            >
              {saving
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.saveButtonText}>{isRequired ? "Accept & Continue" : "Save Preferences"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConsentManager;
