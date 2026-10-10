export default function AccountDetailsLoading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--background)",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          border: "3px solid var(--primary-dim)",
          borderTopColor: "var(--primary)",
          animation: "spin 0.8s linear infinite",
        }}
      />
    </div>
  );
}
