import { Component, type ReactNode } from "react";
import { View, StyleSheet } from "react-native";

export class CameraErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError)
      return <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "#000" }} />;
    return this.props.children;
  }
}
