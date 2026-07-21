export const metadata = {
  title: "JDPOSE - Schémas",
  description: "Schémas et plans techniciens sur le terrain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, background: "#f0f0ee", fontFamily: "system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
