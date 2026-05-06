// ═══════════════════════════════════════════════════════════════════════════════
// CONSENT MANAGER - DPDP Act 2023 Compliance Component
// ───────────────────────────────────────────────────────────────────────────────
// 
// Purpose: Manage explicit user consent for data processing
// Features:
// - Granular consent options (camera, gallery, scan history, notifications)
// - Consent logging for audit trail
// - Right to withdraw consent (account deletion)
// - Age verification for users under 18
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { logAuditEvent } from "../services/audit-service";
import { db } from "../db/client";

export interface ConsentStatus {
  camera: boolean;
  gallery: boolean;
  scanHistory: boolean;
  notifications: boolean;
  analytics: boolean;
  marketing: boolean;
  ageVerified: boolean;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  lastUpdated?: string;
}

const DEFAULT_CONSENT: ConsentStatus = {
  camera: false,
  gallery: false,
  scanHistory: false,
  notifications: false,
  analytics: false,
  marketing: false,
  ageVerified: false,
  termsAccepted: false,
  privacyPolicyAccepted: false,
};

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
      const consentData = await db.get(["users", user.uid, "consent"]);
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
      const updatedConsent = {
        ...consent,
        lastUpdated: new Date().toISOString(),
      };

      await db.set(["users", user.uid, "consent"], updatedConsent);

      await logAuditEvent(
        consent.scanHistory ? "consent_given" : "consent_withdrawn",
        user.uid,
        {
          metadata: { consentType: "scan_history", granted: consent.scanHistory },
          actionResult: "success",
        }
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
            <ConsentOption
              title="Age Verification"
              description="I confirm that I am 18 years or older, or have parental consent"
              enabled={consent.ageVerified}
              onToggle={() => toggleConsent("ageVerified")}
              required={true}
              icon="🎂"
            />

            <ConsentOption
              title="Terms of Service"
              description="I have read and agree to the Terms of Service"
              enabled={consent.termsAccepted}
              onToggle={() => toggleConsent("termsAccepted")}
              required={true}
              icon="📄"
            />

            <ConsentOption
              title="Privacy Policy"
              description="I have read and agree to the Privacy Policy"
              enabled={consent.privacyPolicyAccepted}
              onToggle={() => toggleConsent("privacyPolicyAccepted")}
              required={true}
              icon="🔒"
            />

            <ConsentOption
              title="Camera Access"
              description="Allow QR Guard to scan QR codes using your camera"
              enabled={consent.camera}
              onToggle={() => toggleConsent("camera")}
              required={isRequired}
              icon="📷"
            />

            <ConsentOption
              title="Gallery Access"
              description="Allow QR Guard to scan QR codes from your photo gallery"
              enabled={consent.gallery}
              onToggle={() => toggleConsent("gallery")}
              required={false}
              icon="🖼️"
            />

            <ConsentOption
              title="Scan History"
              description="Save your scan history for future reference (can be deleted anytime)"
              enabled={consent.scanHistory}
              onToggle={() => toggleConsent("scanHistory")}
              required={false}
              icon="📜"
            />

            <ConsentOption
              title="Notifications"
              description="Send you alerts about QR code updates and security warnings"
              enabled={consent.notifications}
              onToggle={() => toggleConsent("notifications")}
              required={false}
              icon="🔔"
            />

            <ConsentOption
              title="Analytics"
              description="Help us improve by collecting anonymous usage statistics"
              enabled={consent.analytics}
              onToggle={() => toggleConsent("analytics")}
              required={false}
              icon="📊"
            />

            <ConsentOption
              title="Marketing"
              description="Receive updates about new features and promotions"
              enabled={consent.marketing}
              onToggle={() => toggleConsent("marketing")}
              required={false}
              icon="📢"
            />
          </ScrollView>

          {isRequired && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>
                Required consents must be accepted to use QR Guard.
              </Text>
            </View>
          )}

          <View style={styles.buttonContainer}>
            {!isRequired && (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onComplete}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                (!consent.ageVerified || !consent.termsAccepted || !consent.privacyPolicyAccepted) &&
                  styles.disabledButton,
              ]}
              onPress={saveConsent}
              disabled={
                saving ||
                !consent.ageVerified ||
                !consent.termsAccepted ||
                !consent.privacyPolicyAccepted
              }
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isRequired ? "Accept & Continue" : "Save Preferences"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ConsentOptionProps {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  required?: boolean;
  icon?: string;
}

const ConsentOption: React.FC<ConsentOptionProps> = ({
  title,
  description,
  enabled,
  onToggle,
  required = false,
  icon,
}) => {
  return (
    <View style={styles.consentOption}>
      <View style={styles.optionHeader}>
        <View style={styles.optionTitleRow}>
          {icon && <Text style={styles.optionIcon}>{icon}</Text>}
          <View style={styles.optionTitleContainer}>
            <Text style={styles.optionTitle}>{title}</Text>
            {required && <Text style={styles.requiredBadge}>Required</Text>}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleEnabled]}
          onPress={onToggle}
          activeOpacity={0.7}
        >
          <View style={[styles.toggleKnob, enabled && styles.toggleKnobEnabled]} />
        </TouchableOpacity>
      </View>
      <Text style={styles.optionDescription}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: 20,
  },
  loadingContainer: {
    backgroundColor: "#fff",
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  scrollView: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  consentOption: {
    marginBottom: 24,
  },
  optionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  optionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionTitleContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
  },
  requiredBadge: {
    fontSize: 10,
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    fontWeight: "600",
  },
  toggle: {
    width: 50,
    height: 28,
    backgroundColor: "#E5E7EB",
    borderRadius: 14,
    padding: 2,
    justifyContent: "center",
  },
  toggleEnabled: {
    backgroundColor: "#4F46E5",
  },
  toggleKnob: {
    width: 24,
    height: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobEnabled: {
    alignSelf: "flex-end",
  },
  optionDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginLeft: 36,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#FEF3C7",
    marginHorizontal: 24,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  saveButton: {
    backgroundColor: "#4F46E5",
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});

export default ConsentManager;
