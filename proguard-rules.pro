# ─────────────────────────────────────────────────────────────────────────────
# BinRo — ProGuard / R8 rules
# Applied to release builds only (minifyEnabled true).
# R8 runs in "full mode" by default in AGP 8+; these rules prevent crashes
# caused by reflection, JNI callbacks, and Hermes/JSI interop.
# ─────────────────────────────────────────────────────────────────────────────

# ── R8 optimisation ───────────────────────────────────────────────────────────
# Run the optimiser 5 times instead of 1 — each pass finds new opportunities
# opened by the previous pass (inlining, dead-code removal, constant folding).
-optimizationpasses 5

# Allow R8 to widen access modifiers to enable more inlining.
-allowaccessmodification

# Move all classes to the root package — reduces per-class name overhead.
# Safe because classes are accessed by type, not by package reflection.
# Exception: keep React Native / Expo packages in place to avoid JNI issues.
-repackageclasses 'b'
-keep,allowrepackaging class com.facebook.** { *; }
-keep,allowrepackaging class expo.** { *; }
-keep,allowrepackaging class com.google.** { *; }
-keep,allowrepackaging class com.qrguard.** { *; }

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

# ── App package ───────────────────────────────────────────────────────────────
-keep class com.qrguard.app.** { *; }

# ── Firebase ─────────────────────────────────────────────────────────────────
# Keep only the Firebase services BinRo actually uses (Auth, Firestore, RTDB,
# Storage, AppCheck). Removing the blanket com.google.** keep lets R8 strip
# unused Firebase Analytics / Performance / Messaging native stubs.
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.firebase.firestore.** { *; }
-keep class com.google.firebase.database.** { *; }
-keep class com.google.firebase.storage.** { *; }
-keep class com.google.firebase.appcheck.** { *; }
-keep class com.google.firebase.installations.** { *; }
-keep class com.google.firebase.components.** { *; }
-keep class com.google.firebase.provider.** { *; }
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.common.** { *; }
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

# ── OkHttp / networking ───────────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# ── Kotlin / Coroutines ───────────────────────────────────────────────────────
# Keep only the Kotlin parts that React Native / Firebase actually reflect on.
# Broad "-keep class kotlin.**" prevents R8 from removing unused Kotlin stdlib
# classes and inflates the DEX noticeably.
-keep class kotlin.Metadata { *; }
-keep class kotlin.reflect.** { *; }
-keep class kotlinx.coroutines.android.** { *; }
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}
-dontwarn kotlin.**
-dontwarn kotlinx.coroutines.**

# ── Strip Android Log calls in release ───────────────────────────────────────
# Removes Log.v / Log.d calls from the DEX; saves a small amount of bytecode
# and prevents leaking verbose debug strings to production builds.
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
}

# ── JNI entry points ─────────────────────────────────────────────────────────
-keepclasseswithmembernames class * {
  native <methods>;
}

# ── Enums (reflection in RN) ─────────────────────────────────────────────────
-keepclassmembers enum * {
  public static **[] values();
  public static ** valueOf(java.lang.String);
}

# ── Parcelable ───────────────────────────────────────────────────────────────
-keepclassmembers class * implements android.os.Parcelable {
  public static final ** CREATOR;
}

# ── Serializable ─────────────────────────────────────────────────────────────
-keepnames class * implements java.io.Serializable
-keepclassmembers class * implements java.io.Serializable {
  private static final java.io.ObjectStreamField[] serialPersistentFields;
  private void writeObject(java.io.ObjectOutputStream);
  private void readObject(java.io.ObjectInputStream);
  java.lang.Object writeReplace();
  java.lang.Object readResolve();
}

# ── Crash report attributes ───────────────────────────────────────────────────
# Keep source file + line numbers so crash traces are readable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ── Common library warning suppression ───────────────────────────────────────
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**
-dontwarn sun.misc.**
-dontwarn java.lang.invoke.**
-dontwarn com.google.errorprone.**
-dontwarn com.google.auto.**
