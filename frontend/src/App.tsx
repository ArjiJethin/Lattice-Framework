import React from "react";

export default function App(): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <main className="text-center p-6">
        <h1 className="text-2xl font-bold tracking-tight">Lattice Framework</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Environment initialized. Ready for Phase 1.
        </p>
      </main>
    </div>
  );
}
