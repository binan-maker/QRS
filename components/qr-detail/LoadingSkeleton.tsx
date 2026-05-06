import { View, ScrollView, StyleSheet } from "react-native";
import SkeletonBox from "@/components/ui/SkeletonBox";
import Colors from "@/constants/colors";

function SkeletonCommentCard() {
  return (
    <View style={styles.commentCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <SkeletonBox width={34} height={34} borderRadius={17} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width="50%" height={11} />
        </View>
      </View>
      <SkeletonBox height={11} style={{ marginBottom: 6 }} />
      <SkeletonBox width="75%" height={11} />
    </View>
  );
}

interface Props {
  topInset: number;
}

export default function LoadingSkeleton({ topInset }: Props) {
  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <SkeletonBox width={38} height={38} borderRadius={19} />
        <SkeletonBox width={100} height={16} borderRadius={8} style={{ marginHorizontal: "auto" }} />
        <SkeletonBox width={80} height={32} borderRadius={16} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} scrollEnabled={false}>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SkeletonBox width={48} height={48} borderRadius={14} />
            <SkeletonBox width={60} height={24} borderRadius={8} />
          </View>
          <SkeletonBox height={13} style={{ marginBottom: 8 }} />
          <SkeletonBox width="80%" height={13} style={{ marginBottom: 8 }} />
          <SkeletonBox width="50%" height={13} style={{ marginBottom: 16 }} />
          <SkeletonBox width={120} height={36} borderRadius={12} />
        </View>
        <View style={styles.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <SkeletonBox width={100} height={18} borderRadius={8} />
            <SkeletonBox width={80} height={24} borderRadius={12} />
          </View>
          <SkeletonBox height={6} borderRadius={3} style={{ marginBottom: 16 }} />
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ alignItems: "center", gap: 6 }}>
                <SkeletonBox width={40} height={22} borderRadius={6} />
                <SkeletonBox width={50} height={11} borderRadius={6} />
              </View>
            ))}
          </View>
        </View>
        <SkeletonBox width={120} height={18} borderRadius={8} style={{ marginBottom: 10 }} />
        <SkeletonBox width={180} height={12} borderRadius={6} style={{ marginBottom: 14 }} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBox key={i} width="47%" height={90} borderRadius={14} />)}
        </View>
        <SkeletonBox width={100} height={18} borderRadius={8} style={{ marginBottom: 14 }} />
        <SkeletonBox height={50} borderRadius={14} style={{ marginBottom: 16 }} />
        {[0, 1, 2].map((i) => <SkeletonCommentCard key={i} />)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  commentCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
});
