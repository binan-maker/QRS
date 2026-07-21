import React, { type ReactNode } from "react";
import { View, Text } from "react-native";

export function Section({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <View style={{ marginBottom: 13 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color,
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

export function Body({ children, color }: { children: ReactNode; color: string }) {
  return (
    <Text style={{ fontSize: 12.5, color, lineHeight: 19, marginBottom: 2 }}>
      {children}
    </Text>
  );
}

export function Bold({ children, color }: { children: ReactNode; color: string }) {
  return <Text style={{ fontWeight: "700", color }}>{children}</Text>;
}

export function Bullets({
  items,
  color,
  bullet,
}: {
  items: string[];
  color: string;
  bullet: string;
}) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: "row", marginBottom: 3, alignItems: "flex-start" }}>
          <Text style={{ color: bullet, fontSize: 12, lineHeight: 19, marginRight: 7 }}>•</Text>
          <Text style={{ flex: 1, fontSize: 12.5, color, lineHeight: 19 }}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
