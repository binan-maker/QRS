# ─────────────────────────────────────────────────────────────────────────────
# BinRo — ProGuard / R8 rules
# Applied to release builds only (minifyEnabled true).
# R8 runs in "full mode" by default in AGP 8+; these rules prevent crashes
# caused by reflection, JNI callbacks, and Hermes/JSI interop.
# ─────────────────────────────────────────────────────────────────────────────

# ── React Native core ────────────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**
-dontwarn com.facebook.jni.**

# Keep ReactActivity and delegates (Expo wraps these)
-keepclassmembers public class com.facebook.react.ReactActivityDelegate {
  public *;
  protected *;
  private ReactDelegate mReactDelegate;
}
-keepclassmembers public class com.facebook.react.ReactActivity {
  private final ReactActivityDelegate mDelegate;
}
-keepclassmembers public class com.facebook.react.ReactNativeHost {
  protected *;
}

# Keep edge-to-edge window util
-keep class com.facebook.react.views.view.WindowUtilKt { *; }

# ── Expo modules ─────────────────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keepnames class * extends expo.modules.core.BasePackage
-keepnames class * implements expo.modules.core.interfaces.Package
-keepclassmembers public class expo.modules.ReactActivityDelegateWrapper {
  protected ReactDelegate getReactDelegate();
}
-keepclassmembers public class expo.modules.ExpoModulesPackageList {
  public *;
}
-dontwarn expo.modules.**

# ── App package (com.qrguard.app) ────────────────────────────────────────────
-keep class com.qrguard.app.** { *; }

# ── Firebase ─────────────────────────────────────────────────────────────────
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Keep Firebase Firestore model classes (used via reflection)
-keepclassmembers class * {
  @com.google.firebase.firestore.PropertyName *;
  @com.google.firebase.firestore.Exclude *;
  @com.google.firebase.firestore.DocumentId *;
  @com.google.firebase.firestore.ServerTimestamp *;
  @com.google.firebase.firestore.IgnoreExtraProperties *;
}

# ── Google Sign-In ────────────────────────────────────────────────────────────
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keepattributes Signature
-keepattributes *Annotation*

# ── React Native Reanimated ───────────────────────────────────────────────────
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-dontwarn com.swmansion.reanimated.**
-dontwarn com.swmansion.worklets.**

# ── React Native Gesture Handler ──────────────────────────────────────────────
-keep class com.swmansion.gesturehandler.** { *; }
-dontwarn com.swmansion.gesturehandler.**

# ── React Native Screens ──────────────────────────────────────────────────────
-keep class com.swmansion.rnscreens.** { *; }
-dontwarn com.swmansion.rnscreens.**

# ── React Native SVG ─────────────────────────────────────────────────────────
-keep class com.horcrux.svg.** { *; }
-dontwarn com.horcrux.svg.**

# ── React Native IAP ─────────────────────────────────────────────────────────
-keep class com.amazon.** { *; }
-keep class com.android.vending.billing.** { *; }
-dontwarn com.amazon.**

# ── Async Storage ────────────────────────────────────────────────────────────
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# ── OkHttp / networking (used by Metro and various SDKs) ─────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ── Kotlin / Coroutines ───────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**

# ── Prevent stripping JNI entry points ───────────────────────────────────────
-keepclasseswithmembernames class * {
  native <methods>;
}

# ── Keep enums intact (used heavily via reflection in RN) ────────────────────
-keepclassmembers enum * {
  public static **[] values();
  public static ** valueOf(java.lang.String);
}

# ── Keep Parcelable implementations ──────────────────────────────────────────
-keepclassmembers class * implements android.os.Parcelable {
  public static final ** CREATOR;
}

# ── Keep Serializable classes ────────────────────────────────────────────────
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
  private static final java.io.ObjectStreamField[] serialPersistentFields;
  private void writeObject(java.io.ObjectOutputStream);
  private void readObject(java.io.ObjectInputStream);
  java.lang.Object writeReplace();
  java.lang.Object readResolve();
}

# ── Keep debugging attributes for crash reports ──────────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Suppress common library warnings ─────────────────────────────────────────
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn sun.misc.**
-dontwarn java.lang.invoke.**
